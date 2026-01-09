import 'dotenv/config';
import express, { Request, Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { inicializarBaileys } from './bot/baileys-service';
import { WebhookWhatsApp } from './bot/webhook-handler';
import { FacebookWebhookHandler } from './bot/facebook-webhook-handler';
import { vacantesRouter } from './routes/vacantes';
import { db } from './lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ExportacionService } from './services/exportacion-service';
import { SeguimientoContratacionService } from './services/seguimiento-contratacion';
import { IngestaVacantesService } from './services/ingesta-vacantes';
import { VisionOCRService } from './services/vision-ocr-service';
import { ContextoSesion } from './services/contexto-sesion';
import { HistorialIngestaService } from './services/historial-ingesta-service';
import { ExtraccionGruposService } from './services/extraccion-grupos';
import { getSocket } from './bot/baileys-service';
import { AspiradoraStreamingService } from './services/aspiradora-streaming';
import Groq from 'groq-sdk';

const app = express();
const PORT = process.env.PORT || 3000;

// Instancia global del servicio de streaming
const aspiradoraStreaming = new AspiradoraStreamingService();

// Configurar multer para subida de imágenes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  },
});

// Rate Limiting - Protección contra abuso
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: '⚠️ Demasiados requests. Intenta en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS - Permitir frontend
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000',
  process.env.FRONTEND_URL || '',
].filter(Boolean);

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir requests sin origin (Postman, mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('❌ CORS: Origen no permitido'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(express.json());
app.use('/api/', limiter); // Rate limit solo en rutas API
app.use((req: Request, res: Response, next) => {
  res.header('X-Powered-By', 'Only Flans - CORP. TYRELL');
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

// ✅ NUEVO: Endpoint para exportar contratados en Excel
app.get('/api/contratados/export/excel', async (req: Request, res: Response) => {
  try {
    console.log('📊 Generando Excel de contratados...');
    const filePath = await ExportacionService.generarExcelContratados();
    res.download(filePath, 'contratados_TYRELL.xlsx');
  } catch (error) {
    console.error('❌ Error generando Excel:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error generando archivo Excel' 
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🌪️ ASPIRADORA 3000 - STREAMING EN TIEMPO REAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Endpoint SSE (Server-Sent Events) para streaming de mensajes en tiempo real
 * Paula ve CADA mensaje de "jefecito" en la barra lateral
 */
app.get('/api/aspiradora/stream', (req: Request, res: Response) => {
  console.log('🌪️ Nuevo cliente SSE conectado');
  
  const clienteId = aspiradoraStreaming.registrarCliente(res);
  
  // El cliente se desconectará automáticamente cuando cierre la conexión
  req.on('close', () => {
    console.log(`👋 Cliente SSE desconectado: ${clienteId}`);
  });
});

/**
 * Endpoint para obtener estadísticas de la Aspiradora 3000
 */
app.get('/api/aspiradora/stats', (req: Request, res: Response) => {
  try {
    const stats = aspiradoraStreaming.obtenerEstadisticas();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo estadísticas' });
  }
});

/**
 * Endpoint para iniciar/detener el monitoreo
 */
app.post('/api/aspiradora/toggle', async (req: Request, res: Response) => {
  try {
    const sock = getSocket();
    if (!sock) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp no conectado',
      });
    }

    await aspiradoraStreaming.iniciarMonitoreo(sock);

    res.json({
      success: true,
      mensaje: '🌪️ Aspiradora 3000 activada - Monitoreando grupo jefecito 24/7',
      stats: aspiradoraStreaming.obtenerEstadisticas(),
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: 'Error iniciando monitoreo' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════

// ✅ NUEVO: Endpoint para exportar contratados en JSON
app.get('/api/contratados/export/json', async (req: Request, res: Response) => {
  try {
    console.log('📊 Generando JSON de contratados...');
    const filePath = await ExportacionService.generarJSONContratados();
    res.download(filePath, 'contratados_TYRELL.json');
  } catch (error) {
    console.error('❌ Error generando JSON:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error generando archivo JSON' 
    });
  }
});

// ✅ NUEVO: Endpoint para obtener lista de contratados
app.get('/api/contratados', async (req: Request, res: Response) => {
  try {
    const contratados = await SeguimientoContratacionService.obtenerContratados();
    const stats = await SeguimientoContratacionService.obtenerEstadisticas();
    
    res.json({
      success: true,
      data: {
        contratados,
        estadisticas: stats,
      },
    });
  } catch (error) {
    console.error('❌ Error obteniendo contratados:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo datos' 
    });
  }
});

// ✅ NUEVO: Endpoint para generar reporte HTML
app.get('/api/contratados/export/html', async (req: Request, res: Response) => {
  try {
    console.log('📊 Generando reporte HTML...');
    const filePath = await ExportacionService.generarReporteHTML();
    res.download(filePath, 'reporte_TYRELL.html');
  } catch (error) {
    console.error('❌ Error generando HTML:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error generando reporte HTML' 
    });
  }
});

// 🧠 INGESTA INTELIGENTE: Analizar texto caótico y extraer vacante
app.post('/api/vacantes/extract', async (req: Request, res: Response) => {
  try {
    const { texto } = req.body;

    if (!texto || typeof texto !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Se requiere campo "texto" con el mensaje del jefecito'
      });
    }

    console.log('🔍 INGESTA: Recibiendo texto para análisis...', texto.slice(0, 50));

    const resultado = await IngestaVacantesService.procesarIngestaCompleta(texto);

    if (!resultado.exito) {
      return res.status(400).json({
        success: false,
        error: resultado.error
      });
    }

    res.json({
      success: true,
      mensaje: 'Vacante extraída y guardada correctamente',
      vacanteId: resultado.vacanteId,
      datos: resultado.datos
    });
  } catch (error) {
    console.error('❌ INGESTA: Error en endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al procesar la ingesta'
    });
  }
});

// 📸 ENDPOINT: Procesar captura de WhatsApp con Llama Vision
app.post('/api/vacantes/extract/image', upload.single('imagen'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se recibió ninguna imagen',
      });
    }

    console.log('📸 VISION: Recibida imagen de', req.file.size, 'bytes');

    // Convertir a base64
    const imagenBase64 = req.file.buffer.toString('base64');

    // Procesar con Llama Vision
    const resultado = await VisionOCRService.procesarImagenCompleta(imagenBase64);

    if (!resultado.exito) {
      return res.status(400).json({
        success: false,
        error: resultado.error,
      });
    }

    res.json({
      success: true,
      textoExtraido: resultado.textoExtraido,
      datosVacante: resultado.datosVacante,
      mensaje: 'Imagen procesada con éxito',
    });
  } catch (error) {
    console.error('❌ Error procesando imagen:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al procesar imagen',
    });
  }
});

// 🎤 ENDPOINT: Procesar comando de voz
app.post('/api/voice/command', async (req: Request, res: Response) => {
  try {
    const { comando, userId = 'jefa' } = req.body;

    if (!comando) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere campo "comando"',
      });
    }

    console.log(`🎤 VOZ: Comando de ${userId}: "${comando}"`);

    // Generar prompt con contexto
    const promptConContexto = ContextoSesion.generarPromptConContexto(userId, comando);

    // Analizar con Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'user', content: promptConContexto },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const resultado = JSON.parse(completion.choices[0].message.content || '{}');

    res.json({
      success: true,
      resultado,
    });
  } catch (error) {
    console.error('❌ Error procesando comando de voz:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar comando',
    });
  }
});

// 💬 ENDPOINT: Obtener historial de chat
app.get('/api/historial/ingesta', async (req: Request, res: Response) => {
  try {
    const historial = await HistorialIngestaService.obtenerHistorial();
    res.json({
      success: true,
      total: historial.length,
      mensajes: historial,
    });
  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial',
    });
  }
});

// 💬 ENDPOINT: Registrar mensaje usuario
app.post('/api/historial/mensaje', async (req: Request, res: Response) => {
  try {
    const { contenido, tipoInput } = req.body;

    if (!contenido || !tipoInput) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere contenido y tipoInput',
      });
    }

    const id = await HistorialIngestaService.registrarMensajeUsuario(contenido, tipoInput);
    res.json({
      success: true,
      mensajeId: id,
    });
  } catch (error) {
    console.error('❌ Error registrando mensaje:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar mensaje',
    });
  }
});

// 💬 ENDPOINT: Confirmar acción (Aceptar/Rechazar)
app.post('/api/ingesta/confirmar', async (req: Request, res: Response) => {
  try {
    const { accion, vacanteId, empresas = [] } = req.body;

    if (!accion || !['aceptar', 'rechazar'].includes(accion)) {
      return res.status(400).json({
        success: false,
        error: 'Acción inválida. Usa "aceptar" o "rechazar"',
      });
    }

    if (accion === 'aceptar' && vacanteId) {
      await HistorialIngestaService.registrarRespuestaIA(
        '🎯 Vacante confirmada y publicada en la Ristra. Los candidatos ya pueden verla.',
        empresas,
        'guardada',
        vacanteId
      );

      res.json({
        success: true,
        mensaje: 'Vacante publicada exitosamente',
      });
    } else if (accion === 'rechazar') {
      await HistorialIngestaService.registrarRespuestaIA(
        '❌ Vacante rechazada por Paula. No se publicó.',
        empresas,
        'rechazada'
      );

      res.json({
        success: true,
        mensaje: 'Vacante rechazada',
      });
    }
  } catch (error) {
    console.error('❌ Error confirmando acción:', error);
    res.status(500).json({
      success: false,
      error: 'Error al confirmar acción',
    });
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

// 🎯 ENDPOINT: Succionar grupo del jefecito
app.post('/api/grupos/succionar', async (req: Request, res: Response) => {
  try {
    const { grupoId } = req.body;

    if (!grupoId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere campo "grupoId"',
      });
    }

    console.log('🔥 API: Iniciando succión del grupo:', grupoId);

    const socket = getSocket();
    if (!socket) {
      return res.status(500).json({
        success: false,
        error: 'WhatsApp no está conectado. Escanea el QR primero.',
      });
    }

    const extractor = new ExtraccionGruposService(socket);
    const resultado = await extractor.succionarGrupoCompleto(grupoId);

    if (!resultado.exito) {
      return res.status(400).json({ success: false, error: resultado.error });
    }

    res.json({
      success: true,
      mensaje: 'Grupo succionado exitosamente',
      data: {
        totalMensajes: resultado.totalMensajes,
        vacantesDetectadas: resultado.vacantesDetectadas,
        nuevas: resultado.nuevas,
        actualizadas: resultado.actualizadas,
        resumen: resultado.resumen,
        contexto: resultado.contexto,
      },
    });
  } catch (error) {
    console.error('❌ API: Error en succión de grupo:', error);
    res.status(500).json({ success: false, error: 'Error interno al succionar grupo' });
  }
});

// 🔍 ENDPOINT: Listar grupos disponibles
app.get('/api/grupos/listar', async (req: Request, res: Response) => {
  try {
    const socket = getSocket();
    if (!socket) {
      return res.status(500).json({ success: false, error: 'WhatsApp no conectado' });
    }

    const chats = await socket.groupFetchAllParticipating();
    const grupos = Object.values(chats)
      .filter((chat: any) => chat.id.endsWith('@g.us'))
      .map((grupo: any) => ({
        id: grupo.id.replace('@g.us', ''),
        nombre: grupo.subject,
        participantes: grupo.participants?.length || 0,
      }));

    res.json({ success: true, total: grupos.length, grupos });
  } catch (error) {
    console.error('❌ API: Error listando grupos:', error);
    res.status(500).json({ success: false, error: 'Error al listar grupos' });
  }
});

// 📢 ENDPOINT: Publicar en Facebook (preparado para mañana)
app.post('/api/facebook/publicar', async (req: Request, res: Response) => {
  try {
    console.log('📢 Iniciando publicación en Facebook...');

    // TODO: Implementar integración con Meta Graph API
    // Por ahora, simulación para mañana

    res.json({
      success: true,
      publicadas: 5,
      mensaje: 'Vacantes publicadas en Facebook (simulación - mañana real)',
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: 'Error publicando' });
  }
});

// Inicializar servidor
const iniciar = async () => {
  try {
    console.log('🔧 Inicializando Baileys (WhatsApp)...');
    await inicializarBaileys();

    // 🌪️ Iniciar monitoreo automático de Aspiradora 3000
    console.log('🌪️ Iniciando Aspiradora 3000...');
    const sock = getSocket();
    if (sock) {
      try {
        await aspiradoraStreaming.iniciarMonitoreo(sock);
        console.log('✅ Aspiradora 3000 ACTIVA - Monitoreando grupo jefecito 24/7');
      } catch (error) {
        console.warn('⚠️ Aspiradora 3000: Error al iniciar monitoreo (WhatsApp desconectado)');
        console.log('💡 Tip: Escanea el QR code para conectar WhatsApp');
      }
    } else {
      console.warn('⚠️ Aspiradora 3000 esperará conexión de WhatsApp');
    }

    app.listen(PORT, () => {
      console.log(`✅ Servidor iniciado en puerto ${PORT}`);
      console.log(`📱 Webhook WhatsApp: http://localhost:${PORT}/webhook/whatsapp`);
      console.log(`💬 Test: POST http://localhost:${PORT}/test-message`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`🌪️ Aspiradora Stream: http://localhost:${PORT}/api/aspiradora/stream`);
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar:', error);
    process.exit(1);
  }
};

iniciar();