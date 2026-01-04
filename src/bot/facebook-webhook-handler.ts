import { FacebookLeadsService } from './facebook-leads-service';

/**
 * Webhook handler para Facebook Ads Lead Forms
 * 
 * Integración:
 * 1. En Facebook Ads Manager, crear Lead Form
 * 2. Configurar webhook: https://tudominio.com/webhook/facebook
 * 3. Este endpoint recibe automáticamente los leads
 */

export const FacebookWebhookHandler = {
  /**
   * GET - Verificación inicial del webhook
   * Facebook envía un challenge que debe responder con el mismo valor
   */
  validarWebhook(
    verifyToken: string,
    mode: string,
    challenge: string
  ): string | null {
    return FacebookLeadsService.validarWebhookFacebook(verifyToken, mode, challenge);
  },

  /**
   * POST - Recibir leads del formulario de Facebook
   * Estructura del payload típico:
   * {
   *   "entry": [{
   *     "changes": [{
   *       "value": {
   *         "leadgen_id": "123",
   *         "form_id": "456",
   *         "created_time": "2026-01-04T..."
   *       }
   *     }]
   *   }]
   * }
   */
  async procesarWebhookFacebook(payload: any): Promise<void> {
    try {
      // Verificar que sea un evento de leadgen
      if (!payload.entry) {
        console.log('Payload inválido de Facebook');
        return;
      }

      for (const entry of payload.entry) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value.leadgen_id;
            const formId = change.value.form_id;
            const createdTime = change.value.created_time;

            console.log(`📨 Lead Form completado: ${leadgenId}`);

            // En producción, aquí consultarías la API de Facebook
            // para obtener los datos del lead form completo
            // Por ahora, simulamos:
            const lead = {
              id: leadgenId,
              created_time: createdTime,
              field_data: [
                { name: 'phone_number', values: ['5216xxxxxxxxx'] },
                { name: 'full_name', values: ['Juan Pérez'] },
              ],
            };

            await FacebookLeadsService.procesarLeadFacebook(lead);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error procesando webhook de Facebook:', error);
    }
  },
};

/**
 * INTEGRACIÓN EN EXPRESS:
 * 
 * app.get('/webhook/facebook', (req, res) => {
 *   const token = FacebookWebhookHandler.validarWebhook(
 *     req.query.hub_verify_token,
 *     req.query.hub_mode,
 *     req.query.hub_challenge
 *   );
 *   
 *   if (token) {
 *     res.status(200).send(token);
 *   } else {
 *     res.status(403).send('Forbidden');
 *   }
 * });
 * 
 * app.post('/webhook/facebook', async (req, res) => {
 *   await FacebookWebhookHandler.procesarWebhookFacebook(req.body);
 *   res.status(200).json({ success: true });
 * });
 */
