import { CandidatoService } from '../services/candidato-service';
import { BotWhatsAppService } from './whatsapp-bot-service';

/**
 * Webhook para recibir mensajes de WhatsApp Personal (vía Baileys/Evolution API).
 * Se ejecuta cuando se recibe un mensaje en la sesión personal.
 */
export const WebhookWhatsApp = {
  /**
   * Procesar mensaje entrante del webhook
   * Estructura típica de Baileys:
   * {
   *   message: {
   *     conversation: "Hola",
   *     extendedTextMessage: { text: "Hola" }
   *   },
   *   key: { remoteJid: "521234567890@s.whatsapp.net" }
   * }
   */
  async procesarMensajeDelWebhook(payload: any): Promise<void> {
    try {
      // Extraer datos del mensaje
      const telefonoCompleto = payload.key?.remoteJid || '';
      const telefono = telefonoCompleto.replace('@s.whatsapp.net', '').replace('@g.us', '');

      // Obtener texto del mensaje
      let textoMensaje = '';
      if (payload.message?.conversation) {
        textoMensaje = payload.message.conversation;
      } else if (payload.message?.extendedTextMessage?.text) {
        textoMensaje = payload.message.extendedTextMessage.text;
      } else if (payload.message?.imageMessage?.caption) {
        textoMensaje = payload.message.imageMessage.caption;
      }

      if (!textoMensaje) {
        console.log(`Mensaje sin texto de ${telefono}, ignorado.`);
        return;
      }

      // Procesar con el bot
      await BotWhatsAppService.procesarMensajeEntrante(telefono, textoMensaje);
    } catch (error) {
      console.error('Error en webhook de WhatsApp:', error);
    }
  },

  /**
   * Validar webhook (para confirmación inicial de Baileys/Evolution)
   */
  validarWebhook(token: string, expectedToken: string): boolean {
    return token === expectedToken;
  },
};

/**
 * Punto de entrada HTTP para Express/Hono/Elysia
 * Ejemplo con Express:
 *
 * app.post('/webhook/whatsapp', async (req, res) => {
 *   await WebhookWhatsApp.procesarMensajeDelWebhook(req.body);
 *   res.status(200).json({ success: true });
 * });
 *
 * app.get('/webhook/whatsapp', (req, res) => {
 *   const token = req.query.hub_challenge;
 *   const isValid = WebhookWhatsApp.validarWebhook(
 *     req.query.hub_verify_token,
 *     process.env.WEBHOOK_VERIFY_TOKEN || ''
 *   );
 *   if (isValid) {
 *     res.status(200).send(token);
 *   } else {
 *     res.status(403).send('Forbidden');
 *   }
 * });
 */
