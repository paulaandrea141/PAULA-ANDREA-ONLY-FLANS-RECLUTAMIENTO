import 'dotenv/config';
import express from 'express';
import { inicializarBaileys } from './bot/baileys-service';
import { WebhookWhatsApp } from './bot/webhook-handler';
import { FacebookWebhookHandler } from './bot/facebook-webhook-handler';
import { vacantesRouter } from './routes/vacantes';
import { db } from './lib/firebase'; // Aseguramos que use tu búnker de Firebase
import { collection, addDoc } from 'firebase/firestore';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// API Routes
app.use('/api/vacantes', vacantesRouter);

// 🛠️ RUTA DE PRUEBA QUE TANTO PEDÍAS (Ahora sí va a jalar el comando)
app.post('/test-message', async (req, res) => {
  try {
    const { phone, message } = req.body;
    console.log(`🧪 RECIBIENDO PRUEBA: ${phone} - ${message}`);
    
    // Guardar directo en el búnker de Firebase
    const docRef = await addDoc(collection(db, "prospectos_prueba"), {
      telefono: phone,
      mensaje: message,
      fecha: new Date().toISOString(),
      origen: "Prueba Manual"
    });

    res.status(200).json({ 
      success: true, 
      msg: "¡Búnker actualizado!", 
      id: docRef.id 
    });
  } catch (error) {
    console.error('❌ Error en prueba:', error);
    res.status(500).json({ error: 'Falla en el sistema' });
  }
});

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

// Webhook WhatsApp - POST (recibir mensajes reales)
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    await WebhookWhatsApp.procesarMensajeDelWebhook(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).json({ error: 'Error procesando mensaje' });
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
      console.log(`🚀 CORP. TYRELL OPERATIVA EN PUERTO ${PORT}`);
      console.log(`📱 Webhook WhatsApp en: http://localhost:${PORT}/webhook/whatsapp`);
      console.log(`🧪 Ruta de prueba lista en: http://localhost:${PORT}/test-message`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar:', error);
    process.exit(1);
  }
};

iniciar();