import 'dotenv/config';
import express, { Request, Response } from 'express';
import { inicializarBaileys } from './bot/baileys-service';
import { WebhookWhatsApp } from './bot/webhook-handler';
import { FacebookWebhookHandler } from './bot/facebook-webhook-handler';
import { vacantesRouter } from './routes/vacantes';
import { db } from './lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use((req: Request, res: Response, next) => {
  res.header('X-Powered-By', 'Only Flans');
  next();
});

// API Routes
app.use('/api/vacantes', vacantesRouter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test message endpoint
app.post('/test-message', async (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requieren campos: phone y message' 
      });
    }

    console.log(`🧪 Mensaje de prueba: ${phone} - ${message}`);
    
    const docRef = await addDoc(collection(db, 'prospectos_prueba'), {
      telefono: phone,
      mensaje: message,
      fecha: new Date().toISOString(),
      origen: 'Prueba Manual'
    });

    res.status(200).json({ 
      success: true, 
      message: '✅ Mensaje guardado correctamente', 
      id: docRef.id 
    });
  } catch (error) {
    console.error('❌ Error en prueba:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al guardar mensaje'
    });
  }
});

// Webhook WhatsApp - GET (validación)
app.get('/webhook/whatsapp', (req: Request, res: Response) => {
  const token = req.query.hub_challenge as string;
  const verifyToken = req.query.hub_verify_token as string;

  if (WebhookWhatsApp.validarWebhook(verifyToken, process.env.WEBHOOK_VERIFY_TOKEN || '')) {
    res.status(200).send(token);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Webhook WhatsApp - POST (recibir mensajes)
app.post('/webhook/whatsapp', async (req: Request, res: Response) => {
  try {
    await WebhookWhatsApp.procesarMensajeDelWebhook(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error en webhook WhatsApp:', error);
    res.status(500).json({ error: 'Error procesando mensaje' });
  }
});

// Webhook Facebook Ads - POST (recibir leads)
app.post('/webhook/facebook', async (req: Request, res: Response) => {
  try {
    await FacebookWebhookHandler.procesarWebhookFacebook(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error en webhook Facebook:', error);
    res.status(500).json({ error: 'Error procesando lead' });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path 
  });
});

// Error handler
app.use((err: any, req: Request, res: Response) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor' 
  });
});

// Inicializar servidor
const iniciar = async () => {
  try {
    console.log('🔧 Inicializando Baileys (WhatsApp)...');
    await inicializarBaileys();

    app.listen(PORT, () => {
      console.log(`✅ Servidor iniciado en puerto ${PORT}`);
      console.log(`📱 Webhook WhatsApp: http://localhost:${PORT}/webhook/whatsapp`);
      console.log(`💬 Test: POST http://localhost:${PORT}/test-message`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar:', error);
    process.exit(1);
  }
};

iniciar();