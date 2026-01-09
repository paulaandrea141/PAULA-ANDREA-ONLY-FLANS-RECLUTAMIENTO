import { ComportamientoHumano } from '../utils/comportamiento-humano';
import { CandidatoService } from '../services/candidato-service';
import { VacanteService } from '../services/vacante-service';
import { LeadService } from '../services/lead-service';
import { MatchingService } from '../matching/matching-engine';
import { generateAIResponse, getConversationHistory } from '../services/ai-service';
import { Candidato, Lead } from '../database/schema';
import { PublicadorGruposService } from './publicador-grupos';
// import { Auditoria } from '../utils/auditoria'; // Temporalmente deshabilitado
import { SeguimientoContratacionService } from '../services/seguimiento-contratacion';
import { WASocket } from '@whiskeysockets/baileys';

export interface MensajeWhatsApp {
  telefono: string;
  contenido: string;
  tipo: 'Texto' | 'Imagen' | 'Link';
  timestamp: number;
}

class BotWhatsAppServiceClass {
  private socket: WASocket | null = null;
  private publicadorGrupos: PublicadorGruposService | null = null;

  /**
   * 🚀 Inicializa el bot con WhatsApp socket
   */
  async inicializar(socket: WASocket): Promise<void> {
    this.socket = socket;
    
    // Iniciar sistema de auditoría
    // Auditoria.iniciar();
    // Auditoria.registrar('SISTEMA', '🚀 Bot WhatsApp inicializado');
    console.log('🚀 Bot WhatsApp inicializado');
    
    // 🔥 PAULA: NO PUBLICAR, SOLO ESCUCHAR
    // Publicador automático DESACTIVADO por orden de la CEO
    // this.publicadorGrupos = new PublicadorGruposService(socket);
    // this.publicadorGrupos.iniciarPublicacionAutomatica();
    console.log('🌪️ Modo SUCCIÓN PURA - NO se publicará en grupos');
    
    console.log('✅ Bot WhatsApp Service COMPLETO inicializado');
  }

  /**
   * 🛑 Detiene todos los servicios
   */
  async detener(): Promise<void> {
    if (this.publicadorGrupos) {
      this.publicadorGrupos.detener();
    }
    // await Auditoria.detener();
    console.log('🛑 Bot WhatsApp Service detenido');
  }

  async procesarMensajeEntrante(telefono: string, mensaje: string): Promise<string> {
    try {
      // Log de mensaje entrante
      // Auditoria.registrar('WHATSAPP', `📩 Mensaje de ${telefono}`, { mensaje: mensaje.substring(0, 100) });
      console.log(`📩 Mensaje de ${telefono}: ${mensaje.substring(0, 100)}`);

      // ✅ NUEVO: Detectar confirmación de contratación PRIMERO
      if (SeguimientoContratacionService.detectarConfirmacion(mensaje)) {
        const lead = await LeadService.obtenerLeadPorTelefono(telefono);
        
        if (lead) {
          console.log(`🎯 Detectada confirmación de contratación de: ${lead.nombre}`);
          
          const datos = await SeguimientoContratacionService.marcarComoContratado(
            lead.id,
            mensaje
          );

          if (datos) {
            const respuesta = SeguimientoContratacionService.generarMensajeFelicitacion(
              datos.nombre,
              datos.empresa
            );

            await this.enviarMensajeConPausa(telefono, respuesta);

            // Log especial para contrataciones
            // Auditoria.registrar(
            //   'CANDIDATO',
            //   `🎉 CONTRATADO: ${datos.nombre} en ${datos.empresa}`,
            //   datos
            // );

            console.log(`✅ Candidato ${datos.nombre} marcado como CONTRATADO en ${datos.empresa}`);
            return respuesta;
          }
        }
      }

      // Flujo normal si no es confirmación de contratación
      const conversationHistory = await getConversationHistory(telefono);
      const { response, extractedData } = await generateAIResponse(
        mensaje,
        telefono,
        conversationHistory
      );

      // Actualizar lead con datos extraídos
      let lead = await LeadService.obtenerLeadPorTelefono(telefono);

      if (!lead) {
        const leadId = await LeadService.crearLead({
          nombre: extractedData.nombre || 'Desconocido',
          telefono,
          edad: 0,
          colonia: '',
          status: 'nuevo',
          papeleríaCompleta: false,
          rutaTransporteSabe: false,
          lastContact: Date.now(),
          notes: `Lead iniciado desde WhatsApp. Experiencia: ${extractedData.experiencia}`,
          conversacionHistorico: [
            {
              autor: 'Bot',
              mensaje,
              timestamp: Date.now(),
              tipo: 'Texto',
            },
            {
              autor: 'Bot',
              mensaje: response,
              timestamp: Date.now(),
              tipo: 'Texto',
            },
          ],
          fuenteLead: 'WhatsApp',
        });
        
        // Log de nuevo candidato
        // Auditoria.registrar('CANDIDATO', `👤 Nuevo lead creado: ${extractedData.nombre || 'Desconocido'}`, { telefono });
        console.log(`👤 Nuevo lead: ${extractedData.nombre || 'Desconocido'} (${telefono})`);
        console.log(`👤 Nuevo lead creado: ${extractedData.nombre || 'Desconocido'}`);
        
        lead = await LeadService.obtenerLead(leadId);
      }

      // Enviar respuesta
      await this.enviarMensajeConPausa(telefono, response);

      // Log de respuesta enviada
      // Auditoria.registrar('WHATSAPP', `📤 Respuesta enviada a ${telefono}`, { response: response.substring(0, 100) });
      console.log(`📤 Respuesta enviada a ${telefono}: ${response.substring(0, 50)}...`);
      console.log(`📤 Respuesta enviada a ${telefono}`);

      return response;
    } catch (error) {
      console.error(`Error procesando mensaje:`, error);
      // Auditoria.registrar('ERROR', `❌ Error procesando mensaje de ${telefono}`, { error: String(error) });
      console.error(`❌ Error: ${telefono}:`, error);
      console.error(`❌ Error procesando mensaje de ${telefono}:`, error);
      return 'Disculpa, tengo un problema técnico. Por favor, intenta más tarde.';
    }
  }

  /**
   * Procesar según el status del lead en el CRM
   */
  private async procesarPorStatusDelLead(lead: Lead, mensajeUsuario: string): Promise<void> {
    const telefono = lead.telefono;

    switch (lead.status) {
      case 'nuevo':
        await this.procesarLeadNuevo(lead, mensajeUsuario);
        break;
      case 'filtrado':
        await this.procesarLeadFiltrado(lead, mensajeUsuario);
        break;
      case 'citado':
        await this.procesarLeadCitado(lead, mensajeUsuario);
        break;
      case 'no_apto':
        // No procesar leads rechazados
        console.log(`⛔ Lead ${lead.id} está marcado como no_apto`);
        break;
    }
  }

  /**
   * Flujo para leads NUEVOS (recabando información básica)
   */
  private async procesarLeadNuevo(lead: Lead, mensaje: string): Promise<void> {
    // Si no tiene nombre, este es el nombre
    if (!lead.nombre || lead.nombre === 'Desconocido') {
      await LeadService.actualizarStatus(lead.id, 'filtrado');
      await LeadService.agregarNota(lead.id, `Nombre: ${mensaje}`);

      const respuesta = `Gusto en conocerte ${mensaje}! 👋\n¿En cuál colonia vives?`;
      await this.enviarMensajeConPausa(lead.telefono, respuesta);
    }
  }

  /**
   * Flujo para leads FILTRADOS (recopilando más datos)
   */
  private async procesarLeadFiltrado(lead: Lead, mensaje: string): Promise<void> {
    const telefono = lead.telefono;

    // Si no tiene colonia, guardar
    if (!lead.colonia) {
      await LeadService.agregarNota(lead.id, `Colonia: ${mensaje}`);

      const respuesta = `Perfecto! 📍 Operamos en esa zona.\n¿Qué edad tienes?`;
      await this.enviarMensajeConPausa(telefono, respuesta);
      return;
    }

    // Si no tiene edad, guardar
    if (lead.edad === 0) {
      const edad = parseInt(mensaje);
      if (isNaN(edad) || edad < 18 || edad > 70) {
        const respuesta = `Por favor, ingresa una edad válida (18-70 años)`;
        await this.enviarMensajeConPausa(telefono, respuesta);
        return;
      }

      await LeadService.agregarNota(lead.id, `Edad: ${edad}`);

      const respuesta = `¡Excelente! 💪 Tengo posiciones que se adaptan a ti.\n¿Tienes tu documentación completa? (INE, RFC, comprobante de domicilio)`;
      await this.enviarMensajeConPausa(telefono, respuesta);
      return;
    }

    // Verificar papelería completa
    const respuestaBaja = mensaje.toLowerCase();
    const tieneDocumentos =
      respuestaBaja.includes('sí') ||
      respuestaBaja.includes('si') ||
      respuestaBaja.includes('claro') ||
      respuestaBaja.includes('todo');

    if (tieneDocumentos) {
      // Preguntar por ruta de transporte
      const respuesta = `¡Perfecto! 🎉 Tenemos 5 rutas operativas en Monterrey.\nEstas son:
1️⃣ DAMAR - Salario: $2,700 + bonificación
2️⃣ ILSAN - Salario: $2,288
3️⃣ MAGNEKON - Salario: $2,500
4️⃣ Ruta Santa María - Logística: $2,000
5️⃣ Ruta Ciénega - Logística: $2,000

¿Cuál te llama más la atención?`;
      await this.enviarMensajeConPausa(telefono, respuesta);
    } else {
      const respuesta = `Entiendo. Es importante que tengas tus documentos listos para la entrevista. 📋\n¿Cuándo podrías organizarte?`;
      await this.enviarMensajeConPausa(telefono, respuesta);
    }
  }

  /**
   * Flujo para leads CITADOS (confirmación y detalles finales)
   */
  private async procesarLeadCitado(lead: Lead, mensaje: string): Promise<void> {
    const telefono = lead.telefono;

    const respuesta = `¡Excelente! 🎯 Tu entrevista está confirmada.\n
📍 Ubicación: Av. Constitución 300, Monterrey
📅 Disponibles: Lunes a Viernes, 9 AM a 5 PM
📱 Contacto: Tu gestor se comunicará en 24h

¡Mucho éxito! 💼`;

    await this.enviarMensajeConPausa(telefono, respuesta);
    await LeadService.agregarNota(lead.id, 'Lead confirmado y listo para entrevista');
  }

  async flujoAtraccionInicial(telefono: string): Promise<void> {
    const saludo = 'Hola, tenemos ofertas de empleo geniales en Monterrey!';
    await this.enviarMensajeConPausa(telefono, saludo);
  }

  async continuarFlujoSegunEtapa(candidato: Candidato, mensaje: string): Promise<void> {
    switch (candidato.etapa) {
      case 'Prospecto':
        await this.flujoCalificacion(candidato, mensaje);
        break;
      default:
        break;
    }
  }

  async flujoCalificacion(candidato: Candidato, mensaje: string): Promise<void> {
    await CandidatoService.agregarMensajeHistorico(candidato.id, 'Candidato', mensaje, 'Texto');
  }

  async flujoAsignacionVacante(candidato: Candidato): Promise<void> {
    const resultado = await MatchingService.encontrarVacantaOptima(candidato);
    if (resultado) {
      await CandidatoService.actualizarCandidato(candidato.id, {
        vacanteAsignada: resultado.vacanteId,
        etapa: 'Asignado',
        score: resultado.score,
      });
      const mensaje = `Posicion: ${resultado.empresa} - ${resultado.puesto}`;
      await this.enviarMensajeConPausa(candidato.whatsapp, mensaje);
    }
  }

  async enviarMensajeConPausa(telefono: string, contenido: string): Promise<void> {
    await ComportamientoHumano.pausaEscritura(contenido.length);
    console.log(`[WhatsApp ${telefono}]: ${contenido}`);
  }
}

export const BotWhatsAppService = new BotWhatsAppServiceClass();
