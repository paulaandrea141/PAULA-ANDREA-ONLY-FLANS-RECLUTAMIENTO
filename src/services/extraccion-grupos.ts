import type { WASocket } from '@whiskeysockets/baileys';
import { getGroqClient } from './ai-service';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

/**
 * 🔥 SERVICIO EXTRACTOR JEFECITO - CORP. TYRELL
 * CEO: Paula Specter
 * COO: Litt
 * Becarios: Claude + Copilot
 */

/**
 * 🛡️ Sanitiza texto para evitar inyecciones y ataques
 */
function sanitizarTexto(texto: string): string {
  return texto
    .replace(/[<>]/g, '') // Eliminar HTML tags
    .replace(/["'`]/g, '') // Eliminar comillas
    .replace(/script/gi, '') // Eliminar palabra "script"
    .replace(/eval/gi, '') // Eliminar eval
    .replace(/onclick/gi, '') // Eliminar eventos
    .replace(/onerror/gi, '')
    .trim()
    .substring(0, 5000); // Máximo 5000 caracteres
}

interface MensajeGrupo {
  id: string;
  telefono: string;
  nombre: string;
  mensaje: string;
  timestamp: number;
}

interface VacanteExtraida {
  empresa: string;
  puesto: string;
  salario: string;
  horario: string;
  rutas: string;
  estado: 'activa' | 'pausada' | 'cerrada';
}

export class ExtraccionGruposService {
  private socket: WASocket;

  constructor(socket: WASocket) {
    this.socket = socket;
  }

  /**
   * 🎯 Extrae historial del grupo (300 mensajes)
   */
  async extraerHistorialGrupo(grupoId: string, limite = 300): Promise<MensajeGrupo[]> {
    try {
      console.log(`📱 EXTRACCIÓN: Obteniendo ${limite} mensajes del grupo...`);

      const jid = grupoId.includes('@g.us') ? grupoId : `${grupoId}@g.us`;

      // Delay anti-detección (comportamiento humano)
      await new Promise(resolve => setTimeout(resolve, 3000));

      const mensajes = await this.socket.fetchMessagesFromWA(jid, limite);
      const historial: MensajeGrupo[] = [];

      for (const msg of mensajes) {
        const texto =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          '';

        if (!texto.trim()) continue;

        // 🛡️ SANITIZAR DATOS POR SEGURIDAD
        const textoLimpio = sanitizarTexto(texto);
        const nombreLimpio = sanitizarTexto(msg.pushName || 'Desconocido');

        historial.push({
          id: msg.key.id || '',
          telefono: (msg.key.participant || msg.key.remoteJid || '').replace('@s.whatsapp.net', ''),
          nombre: nombreLimpio,
          mensaje: textoLimpio,
          timestamp: msg.messageTimestamp
            ? (typeof msg.messageTimestamp === 'number'
                ? msg.messageTimestamp * 1000
                : parseInt(msg.messageTimestamp.toString()) * 1000)
            : Date.now(),
        });
      }

      console.log(`✅ EXTRACCIÓN: ${historial.length} mensajes extraídos`);
      return historial.reverse(); // Orden cronológico
    } catch (error) {
      console.error('❌ EXTRACCIÓN: Error:', error);
      throw new Error(`No se pudo extraer historial: ${error}`);
    }
  }

  /**
   * 🧠 Procesa historial con Groq IA (Llama 3.3 70B)
   */
  async procesarHistorialConIA(mensajes: MensajeGrupo[]): Promise<{
    vacantes: VacanteExtraida[];
    resumen: string;
    contexto: string;
  }> {
    try {
      console.log('🧠 EXTRACCIÓN: Procesando con Groq IA...');

      const historialFormateado = mensajes
        .map(m => `[${new Date(m.timestamp).toLocaleString('es-MX')}] ${m.nombre}: ${m.mensaje}`)
        .join('\n');

      const prompt = `Eres el asistente ejecutivo de Paula Specter en CORP. TYRELL.

HISTORIAL DEL GRUPO JEFECITO (${mensajes.length} mensajes):
${historialFormateado}

TAREA:
1. Identifica TODAS las vacantes mencionadas (activas, pausadas, modificadas)
2. Detecta cambios: si dice "lo de ayer ya no" o "ya no aplica", identifica qué vacante se canceló
3. Extrae: empresa, puesto, salario, horario, rutas de transporte, requisitos
4. Genera resumen ejecutivo para Paula (CEO)

RESPONDE EN JSON VÁLIDO:
{
  "vacantes": [
    {
      "empresa": "DAMAR",
      "puesto": "Operario",
      "salario": "$2,700",
      "horario": "Turno matutino 7am-5pm",
      "rutas": "Ruta desde Cumbres, La Fe",
      "estado": "activa"
    }
  ],
  "resumen": "El jefe publicó 3 vacantes esta semana: DAMAR (operario), ILSAN (supervisor), MAGNEKON (técnico). Canceló la de logística. Aumentó el sueldo de DAMAR a $2,700.",
  "contexto": "El jefe está urgido con DAMAR. Necesita 5 operarios para el lunes. ILSAN puede esperar hasta el viernes."
}

REGLAS:
- Si no hay vacantes claras, devuelve array vacío
- "estado" puede ser: "activa", "pausada", "cerrada"
- Detecta urgencia en el lenguaje del jefe
- Solo JSON, sin markdown`;

      const completion = await getGroqClient().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const respuestaIA = completion.choices[0].message.content || '{}';
      const resultado = JSON.parse(respuestaIA);

      console.log(`✅ EXTRACCIÓN: ${resultado.vacantes?.length || 0} vacantes detectadas`);
      return resultado;
    } catch (error) {
      console.error('❌ EXTRACCIÓN: Error procesando con IA:', error);
      throw new Error(`Error al procesar historial con IA: ${error}`);
    }
  }

  /**
   * 🔄 Sincroniza vacantes con Firebase
   */
  async sincronizarConFirebase(vacantes: VacanteExtraida[]): Promise<{
    nuevas: number;
    actualizadas: number;
    ids: string[];
  }> {
    try {
      console.log('💾 EXTRACCIÓN: Sincronizando con Firebase...');

      const idsGuardados: string[] = [];
      let nuevas = 0;
      let actualizadas = 0;

      for (const vacante of vacantes) {
        // Buscar si ya existe
        const q = query(
          collection(db, 'vacantes'),
          where('empresa', '==', vacante.empresa),
          where('puesto', '==', vacante.puesto)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          // Crear nueva vacante
          const docRef = await addDoc(collection(db, 'vacantes'), {
            titulo: `${vacante.empresa} - ${vacante.puesto}`,
            empresa: vacante.empresa,
            descripcion: `${vacante.horario}\n${vacante.rutas}`,
            salario: vacante.salario,
            ubicacion: 'Monterrey, N.L.',
            estado: vacante.estado === 'activa' ? 'Activa' : 'Pausada',
            fechaCreacion: Date.now(),
            origenExtraccion: 'Grupo Jefecito',
            ultimaActualizacion: Date.now(),
          });

          idsGuardados.push(docRef.id);
          nuevas++;
          console.log(`✅ Nueva vacante: ${vacante.empresa} - ${vacante.puesto}`);
        } else {
          // Actualizar existente
          const docRef = snapshot.docs[0];
          await updateDoc(doc(db, 'vacantes', docRef.id), {
            salario: vacante.salario,
            descripcion: `${vacante.horario}\n${vacante.rutas}`,
            estado: vacante.estado === 'activa' ? 'Activa' : 'Pausada',
            ultimaActualizacion: Date.now(),
          });

          idsGuardados.push(docRef.id);
          actualizadas++;
          console.log(`🔄 Actualizada: ${vacante.empresa} - ${vacante.puesto}`);
        }
      }

      console.log(`✅ EXTRACCIÓN: ${nuevas} nuevas, ${actualizadas} actualizadas`);
      return { nuevas, actualizadas, ids: idsGuardados };
    } catch (error) {
      console.error('❌ EXTRACCIÓN: Error sincronizando:', error);
      throw error;
    }
  }

  /**
   * 🎯 FLUJO COMPLETO: Extraer → Procesar → Sincronizar
   */
  async succionarGrupoCompleto(grupoId: string): Promise<{
    exito: boolean;
    totalMensajes: number;
    vacantesDetectadas: number;
    nuevas: number;
    actualizadas: number;
    resumen: string;
    contexto: string;
    error?: string;
  }> {
    try {
      console.log('🔥 EXTRACCIÓN: Iniciando succión completa del grupo...');

      // Paso 1: Extraer historial
      const mensajes = await this.extraerHistorialGrupo(grupoId);

      if (mensajes.length === 0) {
        return {
          exito: false,
          totalMensajes: 0,
          vacantesDetectadas: 0,
          nuevas: 0,
          actualizadas: 0,
          resumen: 'No se encontraron mensajes en el grupo',
          contexto: '',
          error: 'Grupo vacío o sin permisos',
        };
      }

      // Paso 2: Procesar con IA
      const resultado = await this.procesarHistorialConIA(mensajes);

      // Paso 3: Sincronizar con Firebase
      const sync = await this.sincronizarConFirebase(resultado.vacantes);

      console.log('✅ EXTRACCIÓN: Succión completa exitosa');

      return {
        exito: true,
        totalMensajes: mensajes.length,
        vacantesDetectadas: resultado.vacantes.length,
        nuevas: sync.nuevas,
        actualizadas: sync.actualizadas,
        resumen: resultado.resumen,
        contexto: resultado.contexto,
      };
    } catch (error) {
      console.error('❌ EXTRACCIÓN: Error en succión completa:', error);
      return {
        exito: false,
        totalMensajes: 0,
        vacantesDetectadas: 0,
        nuevas: 0,
        actualizadas: 0,
        resumen: '',
        contexto: '',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}
