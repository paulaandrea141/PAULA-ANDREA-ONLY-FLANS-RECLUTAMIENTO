import express, { Request, Response } from 'express';
import makeWASocket, { useMultiFileAuthState, Browsers } from 'baileys';
import * as path from 'path';
import * as fs from 'fs';
import { Boom } from '@hapi/boom';

export const gruposRouter = express.Router();

let socket: any = null;
const CREDS_DIR = path.join(process.cwd(), 'auth_info_baileys');

// 🔗 CONECTAR A BAILEYS Y OBTENER SOCKET
async function obtenerSocket() {
  if (socket && socket.ws?.readyState === 1) {
    return socket;
  }

  try {
    if (!fs.existsSync(CREDS_DIR)) {
      fs.mkdirSync(CREDS_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(CREDS_DIR);

    socket = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      generateHighQualityLinkPreview: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 30000,
      emitOwnEventsAsMessage: true,
      retryRequestDelayMs: 250,
    });

    socket.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== 401;
        if (shouldReconnect) {
          console.log('🔄 Reconectando Baileys...');
          socket = null;
          obtenerSocket();
        }
      } else if (connection === 'open') {
        console.log('✅ WhatsApp conectado en grupos.ts');
      }
    });

    socket.ev.on('creds.update', saveCreds);

    return socket;
  } catch (error) {
    console.error('❌ Error conectando Baileys:', error);
    throw error;
  }
}

// ✅ Endpoint: Listar todos los grupos REALES de Paula
gruposRouter.get('/listar-grupos-paula', async (req: Request, res: Response) => {
  try {
    const sock = await obtenerSocket();
    
    if (!sock.store || !sock.store.chats) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp no está conectado aún. Escanea el QR en la consola.',
        grupos: [],
      });
    }

    const chats = sock.store.chats.all();
    
    // Filtrar grupos (ends with '@g.us')
    const grupos = chats
      .filter((chat: any) => chat.id.endsWith('@g.us'))
      .map((chat: any) => ({
        id: chat.id,
        nombre: chat.name || 'Grupo sin nombre',
        participantes: chat.participants?.length || 0,
      }));

    console.log(`📱 ${grupos.length} grupos encontrados`);

    res.json({
      success: true,
      grupos,
      total: grupos.length,
    });
  } catch (error) {
    console.error('❌ Error listando grupos:', error);
    res.status(500).json({
      success: false,
      error: 'Error listando grupos. ¿WhatsApp conectado?',
      grupos: [],
    });
  }
});

// ✅ Endpoint: Obtener TODOS los mensajes de un grupo (o últimos 100)
gruposRouter.post('/ultimos-30-mensajes', async (req: Request, res: Response) => {
  try {
    const { grupoId } = req.body;

    if (!grupoId) {
      return res.status(400).json({
        success: false,
        error: 'grupoId requerido',
      });
    }

    const sock = await obtenerSocket();

    if (!sock.store || !sock.store.messages) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp no está conectado',
        mensajes: [],
      });
    }

    // Obtener mensajes del grupo
    const messages = sock.store.messages[grupoId] || [];
    
    // Tomar últimos 30 (o todos si hay menos)
    const ultimos30 = messages
      .slice(-30)
      .map((msg: any) => ({
        id: msg.key.id,
        remitente: msg.key.fromMe ? 'Tú (Paula)' : (msg.pushName || msg.participant?.split('@')[0] || 'Desconocido'),
        contenido: msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text || 
                   msg.message?.imageMessage?.caption ||
                   '[Archivo multimedia]',
        timestamp: msg.messageTimestamp || Math.floor(Date.now() / 1000),
      }))
      .reverse(); // Mostrar más antiguos primero

    console.log(`📨 ${ultimos30.length} mensajes de ${grupoId}`);

    res.json({
      success: true,
      mensajes: ultimos30,
      total: ultimos30.length,
    });
  } catch (error) {
    console.error('❌ Error obteniendo mensajes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo mensajes',
      mensajes: [],
    });
  }
});

// ✅ Endpoint: Obtener QR para conectar WhatsApp
gruposRouter.get('/qr-status', async (req: Request, res: Response) => {
  try {
    const sock = await obtenerSocket();
    
    if (!sock) {
      return res.json({
        connected: false,
        message: 'Iniciando conexión... revisa la consola para el código QR',
      });
    }

    const connected = sock.user ? true : false;

    res.json({
      connected,
      usuario: connected ? sock.user.name : null,
      message: connected ? '✅ WhatsApp conectado' : '⏳ Esperando código QR',
    });
  } catch (error) {
    res.json({
      connected: false,
      error: String(error),
    });
  }
});

export default gruposRouter;
