import express, { type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import { makeWASocket, AuthenticationCreds, AuthenticationState, WAMessage } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

export const gruposRouter = express.Router();

let socket: any = null;
let gruposCache: any[] = [];
let gruposActualizados = false;

const AUTH_INFO_PATH = path.join(process.cwd(), 'auth_info_baileys');

// ✅ Inicializar Baileys sin QR (usa credenciales guardadas)
async function inicializarBaileys() {
  try {
    if (socket) {
      console.log('✅ Baileys ya está conectado');
      return socket;
    }

    console.log('📱 Inicializando Baileys...');

    const { makeAuthFileStore } = await import('@whiskeysockets/baileys');
    const store = makeAuthFileStore({ folder: AUTH_INFO_PATH });

    socket = makeWASocket({
      auth: store.auth,
      printQRInTerminal: true,
      browser: ['CORP. TYRELL', 'Desktop', '1.0.0'],
      logger: undefined,
    });

    // Guardar auth cada que cambie
    store.bind(socket.ev);

    // Evento de conexión
    socket.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'open') {
        console.log('✅ BAILEYS CONECTADO - Obteniendo grupos reales...');
        gruposActualizados = false;
      } else if (connection === 'close') {
        if ((lastDisconnect?.error as Boom)?.output?.statusCode !== 401) {
          console.log('⚠️ Reconectando...');
          // Reintentar
        } else {
          console.log('❌ Credenciales inválidas');
          socket = null;
        }
      }
    });

    return socket;
  } catch (error) {
    console.error('❌ Error inicializando Baileys:', error);
    socket = null;
    return null;
  }
}

// ✅ Obtener grupos reales
async function obtenerGruposReales() {
  try {
    const wa = await inicializarBaileys();
    if (!wa) {
      console.log('⚠️ Baileys no disponible, usando datos demo');
      return null;
    }

    // Esperar a que esté conectado
    let intentos = 0;
    while (intentos < 30 && !wa.user) {
      await new Promise(r => setTimeout(r, 1000));
      intentos++;
    }

    if (!wa.user) {
      console.log('⚠️ No se pudo conectar a Baileys');
      return null;
    }

    console.log(`✅ Conectado como: ${wa.user.id}`);

    // Obtener todos los chats
    const chats = await wa.fetchLatestBaileysVersion();
    const allChats = wa.store?.chats?.all() || [];

    const grupos = allChats
      .filter((chat: any) => chat.id.endsWith('@g.us'))
      .map((grupo: any) => ({
        id: grupo.id,
        nombre: grupo.name || 'Sin nombre',
        participantes: grupo.participants?.length || 0,
      }));

    gruposCache = grupos;
    gruposActualizados = true;

    console.log(`📱 Grupos obtenidos: ${grupos.length}`);
    return grupos;
  } catch (error) {
    console.error('❌ Error obteniendo grupos:', error);
    return null;
  }
}

// ✅ Endpoint: Listar grupos REALES
gruposRouter.get('/listar-grupos-paula', async (req: Request, res: Response) => {
  try {
    console.log('📱 Cargando grupos reales de Paula...');

    // Intentar obtener reales
    const gruposReales = await obtenerGruposReales();

    if (gruposReales && gruposReales.length > 0) {
      return res.json({
        success: true,
        grupos: gruposReales,
        total: gruposReales.length,
        fuente: 'real',
        usuario: '+528124206561',
      });
    }

    // Fallback a demo si falla
    console.log('⚠️ Usando datos demo');
    const GRUPOS_DEMO = [
      { id: 'demo-1@g.us', nombre: '✅ JEFECITO PERSONAL', participantes: 2 },
      { id: 'demo-2@g.us', nombre: '✅ EQUIPO CORP. TYRELL', participantes: 8 },
      { id: 'demo-3@g.us', nombre: '✅ NÓMINA Y FINANZAS', participantes: 5 },
    ];

    res.json({
      success: true,
      grupos: GRUPOS_DEMO,
      total: GRUPOS_DEMO.length,
      fuente: 'demo',
      nota: 'Escanea QR en terminal para obtener grupos reales',
    });
  } catch (error) {
    console.error('❌ Error listando grupos:', error);
    res.status(500).json({
      success: false,
      error: 'Error listando grupos',
      grupos: [],
    });
  }
});

// ✅ Endpoint: Obtener últimos 30 mensajes de un grupo REAL
gruposRouter.post('/ultimos-30-mensajes', async (req: Request, res: Response) => {
  try {
    const { grupoId } = req.body;

    if (!grupoId) {
      return res.status(400).json({
        success: false,
        error: 'grupoId requerido',
      });
    }

    const wa = await inicializarBaileys();
    if (!wa) {
      return res.status(503).json({
        success: false,
        error: 'Baileys no disponible',
      });
    }

    // Obtener mensajes del grupo
    const allMessages = await wa.fetchLatestBaileysVersion();
    const mensajes = wa.store?.messages?.[grupoId]?.all() || [];

    const mensajesFormateados = mensajes
      .slice(-30)
      .map((msg: WAMessage) => ({
        id: msg.key.id,
        remitente: msg.pushName || msg.key.participant?.split('@')[0] || 'Desconocido',
        contenido: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[Media]',
        timestamp: msg.messageTimestamp,
      }));

    console.log(`📨 Trayendo ${mensajesFormateados.length} mensajes de ${grupoId}`);

    res.json({
      success: true,
      mensajes: mensajesFormateados,
      total: mensajesFormateados.length,
      fuente: 'real',
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

// ✅ Endpoint: Succionar grupo completo
gruposRouter.post('/succionar', async (req: Request, res: Response) => {
  try {
    const { grupoId } = req.body;

    if (!grupoId) {
      return res.status(400).json({
        success: false,
        error: 'grupoId requerido',
      });
    }

    const wa = await inicializarBaileys();
    if (!wa) {
      return res.status(503).json({
        success: false,
        error: 'Baileys no disponible',
      });
    }

    const allMessages = await wa.fetchLatestBaileysVersion();
    const mensajes = wa.store?.messages?.[grupoId]?.all() || [];

    const mensajesFormateados = mensajes.map((msg: WAMessage) => ({
      id: msg.key.id,
      remitente: msg.pushName || msg.key.participant?.split('@')[0] || 'Desconocido',
      contenido: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[Media]',
      timestamp: msg.messageTimestamp,
    }));

    console.log(`🌪️ SUCCIONANDO ${mensajesFormateados.length} mensajes reales de ${grupoId}`);

    res.json({
      success: true,
      data: {
        totalMensajes: mensajesFormateados.length,
        vacantesDetectadas: 0,
        nuevas: 0,
        actualizadas: 0,
        mensajes: mensajesFormateados,
      },
    });
  } catch (error) {
    console.error('❌ Error succionando grupo:', error);
    res.status(500).json({
      success: false,
      error: 'Error succionando grupo',
    });
  }
});

export default gruposRouter;

// ✅ Endpoint: Obtener últimos 30 mensajes de un grupo
gruposRouter.post('/ultimos-30-mensajes', async (req: Request, res: Response) => {
  try {
    const { grupoId } = req.body;

    if (!grupoId) {
      return res.status(400).json({
        success: false,
        error: 'grupoId requerido',
      });
    }

    const mensajes = MENSAJES_DEMO[grupoId] || [];
    console.log(`📨 Trayendo ${mensajes.length} mensajes de ${grupoId}`);

    res.json({
      success: true,
      mensajes,
      total: mensajes.length,
      fuente: 'demo',
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

// ✅ Endpoint: Succionar grupo completo (alias de ultimos-30-mensajes)
gruposRouter.post('/succionar', async (req: Request, res: Response) => {
  try {
    const { grupoId } = req.body;

    if (!grupoId) {
      return res.status(400).json({
        success: false,
        error: 'grupoId requerido',
      });
    }

    const mensajes = MENSAJES_DEMO[grupoId] || [];
    console.log(`🌪️ SUCCIONANDO ${mensajes.length} mensajes de ${grupoId}`);

    res.json({
      success: true,
      data: {
        totalMensajes: mensajes.length,
        vacantesDetectadas: 2,
        nuevas: 1,
        actualizadas: 1,
        mensajes,
      },
    });
  } catch (error) {
    console.error('❌ Error succionando grupo:', error);
    res.status(500).json({
      success: false,
      error: 'Error succionando grupo',
    });
  }
});

export default gruposRouter;
