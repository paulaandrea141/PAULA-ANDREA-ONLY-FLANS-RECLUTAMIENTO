import { LeadService } from './lead-service';
import { CandidatoService } from './candidato-service';
import { db } from '../database/firebase-config';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';

interface DatosContratacion {
  candidatoId: string;
  nombre: string;
  empresa: string;
  fechaIngreso: string;
  telefono: string;
  vacante: string;
}

/**
 * 🎯 SERVICIO DE SEGUIMIENTO POST-CONTRATACIÓN
 * Tech Lead: Paula Specter (@SpecterTech)
 * 
 * Detecta cuando un candidato confirma que fue contratado
 * y lo marca automáticamente como CONTRATADO en el sistema.
 */

/**
 * Frases que indican confirmación de contratación
 */
const FRASES_CONFIRMACION = [
  'ya me quedé',
  'ya estoy trabajando',
  'me contrataron',
  'empecé a trabajar',
  'ya ingresé',
  'primer día',
  'ya firmé',
  'contrato firmado',
  'ya estoy en la empresa',
  'ya me dieron el puesto',
  'me aceptaron',
  'ya estoy laborando',
  'inicio de labores',
  'ya comencé',
];

export class SeguimientoContratacionService {
  /**
   * 🔍 Analiza mensaje y detecta confirmación de contratación
   */
  static detectarConfirmacion(mensaje: string): boolean {
    const mensajeLower = mensaje.toLowerCase().trim();
    return FRASES_CONFIRMACION.some(frase => mensajeLower.includes(frase));
  }

  /**
   * ✅ Marca candidato como CONTRATADO y guarda datos para el Jefecito
   */
  static async marcarComoContratado(
    leadId: string,
    mensaje: string
  ): Promise<DatosContratacion | null> {
    try {
      console.log(`🎯 Procesando confirmación de contratación para lead: ${leadId}`);

      // 1. Obtener lead
      const lead = await LeadService.obtenerLead(leadId);
      if (!lead) {
        console.error('❌ Lead no encontrado:', leadId);
        return null;
      }

      // 2. Extraer empresa del mensaje o usar vacante asignada
      const empresa = this.extraerEmpresaDelMensaje(mensaje) || 
                      lead.vacanteNombre || 
                      'Empresa no especificada';
      
      const fechaIngreso = new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // 3. Actualizar o crear candidato
      let candidatoId = lead.candidatoId;

      if (candidatoId) {
        // Actualizar candidato existente
        await CandidatoService.actualizarCandidato(candidatoId, {
          etapa: 'Contratado',
          vacanteAsignada: lead.vacanteId || undefined,
        });
        console.log(`✅ Candidato ${candidatoId} actualizado a CONTRATADO`);
      } else {
        // Crear nuevo candidato
        candidatoId = await CandidatoService.crearCandidato({
          nombre: lead.nombre,
          telefono: lead.telefono,
          whatsapp: lead.telefono,
          edad: lead.edad || 0,
          genero: 'Otro',
          colonia: lead.colonia || 'No especificada',
          ciudad: 'Monterrey',
          formacion: 'No especificada',
          restricciones: {
            tatuajesVisibles: false,
            tatuajesCaraOCuello: false,
          },
          etapa: 'Contratado',
          vacanteAsignada: lead.vacanteId,
          conversacionHistorico: lead.conversacionHistorico || [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Vincular lead con candidato
        await LeadService.actualizarLead(leadId, {
          candidatoId,
          status: 'citado', // Lead completado exitosamente
        });
        
        console.log(`✅ Nuevo candidato ${candidatoId} creado como CONTRATADO`);
      }

      // 4. Guardar en colección especial "contrataciones" para el Jefecito
      const datosContratacion: DatosContratacion = {
        candidatoId,
        nombre: lead.nombre,
        empresa,
        fechaIngreso,
        telefono: lead.telefono,
        vacante: lead.vacanteNombre || lead.vacanteSugerida || 'General',
      };

      await addDoc(collection(db, 'contrataciones'), {
        ...datosContratacion,
        timestamp: Timestamp.now(),
        mensajeConfirmacion: mensaje,
        leadId,
      });

      console.log('✅ Datos guardados en colección contrataciones:', datosContratacion);

      // 5. Agregar nota en lead
      await LeadService.agregarNota(
        leadId,
        `✅ CONTRATADO - ${empresa} - Ingreso: ${fechaIngreso}`
      );

      return datosContratacion;
    } catch (error) {
      console.error('❌ Error marcando como contratado:', error);
      return null;
    }
  }

  /**
   * 🏢 Extrae el nombre de la empresa del mensaje
   */
  private static extraerEmpresaDelMensaje(mensaje: string): string | null {
    const empresasConocidas = [
      'DAMAR', 'ILSAN', 'MAGNEKON', 'TYRELL',
      'Damar', 'Ilsan', 'Magnekon', 'Tyrell'
    ];

    for (const empresa of empresasConocidas) {
      if (mensaje.includes(empresa)) {
        return empresa.toUpperCase();
      }
    }

    // Intentar extraer con regex: "en [Empresa]" o "a [Empresa]"
    const match = mensaje.match(/(?:en|a)\s+([A-Z][a-zA-Z]+)/);
    if (match && match[1]) {
      return match[1];
    }

    return null;
  }

  /**
   * 📊 Obtiene lista de contratados para exportar
   */
  static async obtenerContratados(): Promise<DatosContratacion[]> {
    try {
      const snapshot = await getDocs(collection(db, 'contrataciones'));
      
      const contratados = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          candidatoId: data.candidatoId,
          nombre: data.nombre,
          empresa: data.empresa,
          fechaIngreso: data.fechaIngreso,
          telefono: data.telefono,
          vacante: data.vacante,
        } as DatosContratacion;
      });

      console.log(`📊 ${contratados.length} contratados obtenidos de Firebase`);
      return contratados;
    } catch (error) {
      console.error('❌ Error obteniendo contratados:', error);
      return [];
    }
  }

  /**
   * 🎉 Genera respuesta automática de felicitación
   */
  static generarMensajeFelicitacion(nombre: string, empresa: string): string {
    const mensajes = [
      `🎉 ¡Felicidades ${nombre}! Nos alegra saber que ingresaste a ${empresa}. ¡Mucho éxito en tu nuevo puesto! 💼`,
      
      `✨ ¡Excelente noticia ${nombre}! Bienvenido al equipo de ${empresa}. Estamos seguros que harás un gran trabajo. 🚀`,
      
      `🎊 ¡Qué bien ${nombre}! Tu esfuerzo valió la pena. Éxito en ${empresa}. ¡A darle con todo! 💪`,
      
      `💼 ¡Felicitaciones ${nombre}! Es un honor saber que ahora eres parte de ${empresa}. ¡A brillar! ⭐`,
      
      `🌟 ¡Perfecto ${nombre}! Sabíamos que lo lograrías. Bienvenido a ${empresa}. ¡Éxitos! 🎯`,
    ];

    const mensajeAleatorio = mensajes[Math.floor(Math.random() * mensajes.length)];
    
    // Agregar nota de CORP. TYRELL
    return `${mensajeAleatorio}\n\n_CORP. TYRELL - Conectando talento con oportunidades_`;
  }

  /**
   * 📈 Obtiene estadísticas de contrataciones
   */
  static async obtenerEstadisticas(): Promise<{
    total: number;
    esteMes: number;
    porEmpresa: Record<string, number>;
  }> {
    try {
      const contratados = await this.obtenerContratados();
      
      const ahora = new Date();
      const mesActual = ahora.getMonth();
      const anioActual = ahora.getFullYear();

      const esteMes = contratados.filter(c => {
        const [dia, mes, anio] = c.fechaIngreso.split('/').map(Number);
        return mes === mesActual + 1 && anio === anioActual;
      }).length;

      const porEmpresa: Record<string, number> = {};
      contratados.forEach(c => {
        porEmpresa[c.empresa] = (porEmpresa[c.empresa] || 0) + 1;
      });

      return {
        total: contratados.length,
        esteMes,
        porEmpresa,
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        total: 0,
        esteMes: 0,
        porEmpresa: {},
      };
    }
  }
}
