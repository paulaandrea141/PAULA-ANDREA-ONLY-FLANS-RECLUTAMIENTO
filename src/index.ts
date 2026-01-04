import 'dotenv/config';
import express from 'express';
import { inicializarBaileys } from './bot/baileys-service';
import { WebhookWhatsApp } from './bot/webhook-handler';
import { FacebookWebhookHandler } from './bot/facebook-webhook-handler';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Webhook WhatsApp - GET (validación)
app.get('/webhook/whatsapp', (req, res) => {
  const token = req.query.hub_challenge as string;
  const verifyToken = req.query.hub_verify_token as string;

  if (WebhookWhatsApp.validarWebhook(verifyToken, process.env.WEBHOOK_VERIFY_TOKEN || '')) {
    res.status(200).send(token);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Webhook WhatsApp - POST (recibir mensajes)
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    await WebhookWhatsApp.procesarMensajeDelWebhook(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).json({ error: 'Error procesando mensaje' });
  }
});

// Webhook Facebook Ads - GET (validación)
app.get('/webhook/facebook', (req, res) => {
  const verifyToken = req.query.hub_verify_token as string;
  const mode = req.query.hub_mode as string;
  const challenge = req.query.hub_challenge as string;

  const result = FacebookWebhookHandler.validarWebhook(verifyToken, mode, challenge);
  if (result) {
    res.status(200).send(result);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Webhook Facebook Ads - POST (recibir leads)
app.post('/webhook/facebook', async (req, res) => {
  try {
    await FacebookWebhookHandler.procesarWebhookFacebook(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error en webhook de Facebook:', error);
    res.status(500).json({ error: 'Error procesando lead' });
  }
});

// Inicializar Baileys y servidor
const iniciar = async () => {
  try {
    console.log('🔧 Inicializando Baileys (WhatsApp)...');
    await inicializarBaileys();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📱 Webhook WhatsApp en: http://localhost:${PORT}/webhook/whatsapp`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar:', error);
    process.exit(1);
  }
};

iniciar();


