// 🔴 IMPORTANTE: dotenv DEBE estar antes de cualquier importación de módulos que usen variables de entorno
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { gruposRouter, inicializarBaileysAhora } from './routes/grupos';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de parseo
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
  });
});

// Rutas
app.use('/api/grupos', gruposRouter);

// 🔥 Iniciar servidor y Baileys
app.listen(PORT, async () => {
  console.log(`
  🔥 CORP. TYRELL - Backend iniciado
  🚀 Servidor corriendo en: http://localhost:${PORT}
  📡 Health: http://localhost:${PORT}/health
  `);
  
  // 📱 Inicializar Baileys INMEDIATAMENTE
  console.log('📱 Inicializando Baileys para obtener tus grupos...');
  await inicializarBaileysAhora();
});
