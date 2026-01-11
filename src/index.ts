// 🔴 IMPORTANTE: dotenv DEBE estar antes de cualquier importación de módulos que usen variables de entorno
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { vacantesRouter } from './routes/vacantes';
import { groqChatRouter } from './routes/groq-chat';
import streamRouter from './routes/stream';
import {
  securityHeaders,
  secureLogging,
  errorHandler,
  sanitizeInputs,
} from './middleware/security';

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 MIDDLEWARE DE SEGURIDAD PRIMERO
app.use(securityHeaders); // Headers de seguridad
app.use(secureLogging); // Logging seguro
app.use(sanitizeInputs); // Sanitizar inputs

// Middleware de parseo
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Rutas
app.use('/api/vacantes', vacantesRouter);
app.use('/api/groq-chat', groqChatRouter);
app.use('/api/stream', streamRouter); // 🔴 NUEVO: Streaming en tiempo real

// Cargar Gemini de forma segura
(async () => {
  try {
    const { geminiRouter } = await import('./routes/gemini');
    app.use('/api/gemini', geminiRouter);
    console.log('✅ Gemini router cargado');
  } catch (error) {
    console.warn('⚠️ Gemini router no se pudo cargar:', (error as Error).message);
  }
});

// 🔐 Manejo de errores global (al final)
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
  🔥 CORP. TYRELL - Backend iniciado
  🚀 Servidor corriendo en: http://localhost:${PORT}
  📡 Health: http://localhost:${PORT}/health
  🔐 Seguridad: ACTIVADA
  `);
});

export default app;
