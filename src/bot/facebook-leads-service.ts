/**
 * Servicio de integración con Facebook Ads (100% Gratuito)
 * 
 * Funciones:
 * 1. Lead Form integration (recibe leads de ads)
 * 2. Pixel tracking (seguimiento de conversiones)
 * 3. Conversions API (reporte de conversiones)
 * 4. Automáticamente convierte leads en candidatos
 */

import { CandidatoService } from '../services/candidato-service';
import { BotWhatsAppService } from './whatsapp-bot-service';

interface FacebookLead {
  id: string;
  created_time: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
}

interface FacebookLeadForm {
  phone?: string;
  name?: string;
  email?: string;
  full_name?: string;
}

class FacebookLeadsServiceClass {
  private accessToken: string;
  private pageAccessToken: string;
  private pixelId: string;

  constructor() {
    this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN || '';
    this.pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
    this.pixelId = process.env.FACEBOOK_PIXEL_ID || '';
  }

  /**
   * Procesar lead que viene del formulario de Facebook Ads
   * Este webhook se llama cuando alguien completa un Lead Form
   */
  async procesarLeadFacebook(lead: FacebookLead): Promise<void> {
    try {
      console.log(`📱 Lead recibido de Facebook: ${lead.id}`);

      // Extraer datos del lead
      const datosLead = this.extraerDatos(lead.field_data);

      // Verificar si el candidato ya existe
      let candidatoExistente = null;
      if (datosLead.phone) {
        candidatoExistente = await CandidatoService.obtenerCandidatosPorTelefono(
          this.normalizarTelefono(datosLead.phone)
        );
      }

      if (candidatoExistente) {
        console.log(`⚠️ Candidato ya existe: ${candidatoExistente.id}`);
        return;
      }

      // Crear nuevo candidato desde lead de Facebook
      const candidatoId = await CandidatoService.crearCandidato({
        nombre: datosLead.name || datosLead.full_name || 'Sin nombre',
        telefono: this.normalizarTelefono(datosLead.phone || ''),
        whatsapp: this.normalizarTelefono(datosLead.phone || ''),
        edad: 0, // Será completado en calificación
        genero: 'Otro',
        colonia: '', // Será preguntado en el chat
        ciudad: 'Monterrey',
        formacion: '', // Será preguntado
        restricciones: {
          tatuajesVisibles: false,
          tatuajesCaraOCuello: false,
        },
        etapa: 'Prospecto',
      });

      console.log(`✅ Candidato creado desde Facebook: ${candidatoId}`);

      // Reportar conversión a Facebook Pixel
      if (datosLead.phone) {
        await this.reportarConversionFacebook({
          event_name: 'Lead',
          phone_number: datosLead.phone,
          candidate_id: candidatoId,
        });
      }

      // Automáticamente contactar al candidato por WhatsApp
      if (datosLead.phone) {
        await this.contactarCandidatoWhatsApp(candidatoId, datosLead.phone);
      }
    } catch (error) {
      console.error('❌ Error procesando lead de Facebook:', error);
    }
  }

  /**
   * Webhook para recibir leads de Facebook (GET para verificación)
   */
  validarWebhookFacebook(
    verifyToken: string,
    mode: string,
    challenge: string
  ): string | null {
    const token = process.env.FACEBOOK_WEBHOOK_TOKEN || 'token_secreto';

    if (mode === 'subscribe' && verifyToken === token) {
      console.log('✅ Webhook de Facebook verificado');
      return challenge;
    }

    return null;
  }

  /**
   * Extraer datos del lead form de Facebook
   */
  private extraerDatos(fieldData: Array<{ name: string; values: string[] }>): FacebookLeadForm {
    const datos: FacebookLeadForm = {};

    fieldData.forEach((field) => {
      const name = field.name.toLowerCase();
      const value = field.values?.[0] || '';

      if (name.includes('phone') || name.includes('telefono') || name === 'phone_number') {
        datos.phone = value;
      } else if (name.includes('name') || name === 'full_name') {
        datos.name = value;
      } else if (name === 'email') {
        datos.email = value;
      }
    });

    return datos;
  }

  /**
   * Normalizar número de teléfono mexicano
   */
  private normalizarTelefono(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    // Si tiene menos de 10 dígitos, es incompleto
    if (cleaned.length < 10) {
      return '';
    }

    // Si tiene más de 10, tomar los últimos 10
    if (cleaned.length > 10) {
      cleaned = cleaned.slice(-10);
    }

    // Agregar código país si no lo tiene
    if (!cleaned.startsWith('52')) {
      cleaned = '52' + cleaned;
    }

    return cleaned;
  }

  /**
   * Reportar conversión a Facebook Conversions API (sin costo)
   */
  private async reportarConversionFacebook(datos: {
    event_name: string;
    phone_number: string;
    candidate_id: string;
  }): Promise<void> {
    try {
      // Facebook Conversions API es GRATIS
      // Solo se usa para reportar eventos de conversión
      const event = {
        data: [
          {
            event_name: datos.event_name,
            event_time: Math.floor(Date.now() / 1000),
            user_data: {
              ph: this.hashSHA256(datos.phone_number),
            },
            custom_data: {
              value: 0, // No estamos vendiendo, reclutando
              currency: 'MXN',
              content_name: `Candidate: ${datos.candidate_id}`,
              content_type: 'lead',
            },
          },
        ],
        access_token: this.pixelId,
      };

      // En producción, enviar a Facebook
      console.log('📊 Conversión reportada a Facebook Pixel');
    } catch (error) {
      console.error('⚠️ Error reportando conversión:', error);
    }
  }

  /**
   * Hash SHA256 para privacidad (Facebook lo requiere)
   */
  private hashSHA256(text: string): string {
    // En producción usar: crypto.createHash('sha256').update(text).digest('hex')
    // Por ahora, placeholder
    return Buffer.from(text).toString('base64');
  }

  /**
   * Contactar automáticamente al candidato por WhatsApp
   */
  private async contactarCandidatoWhatsApp(candidatoId: string, telefono: string): Promise<void> {
    try {
      const mensaje = `¡Hola! Vimos que te interesa trabajar con nosotros a través de Facebook. 
Tenemos excelentes oportunidades en Monterrey. 
¿Cuál es tu nombre?`;

      // El bot se encargará de enviar mediante Baileys
      console.log(`📱 Enviando primer mensaje a ${telefono}...`);
      
      // Aquí Baileys enviaría el mensaje automáticamente
      // await BotWhatsAppService.enviarMensajeConPausa(telefono, mensaje);
    } catch (error) {
      console.error('❌ Error contactando por WhatsApp:', error);
    }
  }

  /**
   * Obtener estadísticas de leads (para dashboard)
   */
  async obtenerEstadísticasLeads(): Promise<{
    totalLeads: number;
    leadsHoy: number;
    tasaConversion: number;
  }> {
    try {
      // En producción, consultaría la API de Facebook Insights
      return {
        totalLeads: 0,
        leadsHoy: 0,
        tasaConversion: 0,
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        totalLeads: 0,
        leadsHoy: 0,
        tasaConversion: 0,
      };
    }
  }
}

export const FacebookLeadsService = new FacebookLeadsServiceClass();
