import express, { type Request, type Response } from 'express';
import path from 'path';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

export const gruposRouter = express.Router();

let socket: any = null;
let reconectandose = false;

const AUTH_INFO_PATH = path.join(process.cwd(), 'auth_info_baileys');

// ✅ RECONEXIÓN AUTOMÁTICA PERMANENTE
async function reconectar() {
  if (reconectandose || socket?.user) return;
  
  reconectandose = true;
  console.log('🔄 Reconectando a Baileys...');
  
  try {
    socket = null;
    await new Promise(r => setTimeout(r, 5000)); // Esperar 5 segundos
    await inicializarBaileysAhora();
  } catch (error) {
    console.error('❌ Error en reconexión:', error);
    reconectandose = false;
  }
}

// ✅ Inicializar Baileys CON QR VISIBLE Y RECONEXIÓN AUTOMÁTICA
export async function inicializarBaileysAhora() {
  try {
    if (socket?.user) {
      console.log('✅ Ya estás conectado a Baileys');
      return socket;
    }

    console.log('📱 Inicializando Baileys...');
    console.log('⏳ Esperando conexión...\n');

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_INFO_PATH);
    const logger = pino({ level: 'silent' });

    socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['CORP. TYRELL', 'Desktop', '1.0.0'],
      logger,
      syncFullHistory: false,
      retryRequestDelayMs: 100,
      maxRetries: 5,
    });

    // MANEJO DE CONEXIÓN
    socket.ev.on('connection.update', (update: any) => {
      const { qr, connection, lastDisconnect } = update;

      if (qr) {
        console.log('\n🔥🔥🔥 ESCANEA ESTE QR CON TU CELULAR 🔥🔥🔥');
        console.log('📱 Tu número: 8124206561\n');
        qrcode.generate(qr, { small: true }, (qrString) => {
          console.log(qrString);
          console.log('\n👆 Apunta tu cámara aquí para conectar\n');
        });
      }

      if (connection === 'open') {
        reconectandose = false;
        console.log('\n✅ ✅ ✅ BAILEYS CONECTADO PERMANENTEMENTE ✅ ✅ ✅');
        console.log('✅ Usuario: 8124206561');
        console.log('✅ Tus grupos están listos en http://localhost:3001');
        console.log('🔒 Reconexión automática ACTIVA');
        console.log('⏳ Cargando chats...\n');
        
        // Cargar todos los chats cuando se conecta
        setTimeout(async () => {
          try {
            if (socket.fetchAllSingleConversations) {
              console.log('📥 Obteniendo chats...');
              await socket.fetchAllSingleConversations();
              console.log('✅ Chats cargados\n');
            }
          } catch (e) {
            console.log('⚠️ Error cargando chats:', e);
          }
        }, 1000);
      } else if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        
        if (reason === DisconnectReason.loggedOut) {
          console.log('❌ Sesión expirada - escanea QR de nuevo');
          socket = null;
          reconectandose = false;
        } else {
          console.log('⚠️ Desconexión detectada - reconectando automáticamente...');
          reconectandose = true;
          setTimeout(() => reconectar(), 3000);
        }
      }
    });

    socket.ev.on('creds.update', saveCreds);

    return socket;
  } catch (error) {
    console.error('❌ Error en Baileys:', error);
    reconectandose = false;
    return null;
  }
}

// ✅ Endpoint: Listar grupos REALES
gruposRouter.get('/listar-grupos-paula', async (req: Request, res: Response) => {
  try {
    console.log('📱 Cargando grupos reales...');

    if (!socket?.user) {
      console.log('⚠️ Baileys no conectado');
      return res.json({
        success: true,
        grupos: [
          { id: 'demo-1@g.us', nombre: '✅ JEFECITO PERSONAL', participantes: 2 },
          { id: 'demo-2@g.us', nombre: '✅ EQUIPO CORP. TYRELL', participantes: 8 },
          { id: 'demo-3@g.us', nombre: '✅ NÓMINA Y FINANZAS', participantes: 5 },
        ],
        total: 3,
        fuente: 'demo',
        nota: 'Escanea QR en terminal para obtener grupos reales',
      });
    }

    // Obtener todos los chats
    await new Promise(resolve => setTimeout(resolve, 500));

    let grupos: any[] = [];

    // Forma 1: Via store.chats
    if (socket.store?.chats) {
      const allChats = socket.store.chats.all?.() || [];
      grupos = allChats
        .filter((chat: any) => chat.id?.endsWith('@g.us'))
        .map((grupo: any) => ({
          id: grupo.id,
          nombre: grupo.name || grupo.subject || 'Sin nombre',
          participantes: grupo.participants?.length || 0,
        }));
    }

    // Forma 2: Si no hay chats, obtener via fetchAllGroupMetadata
    if (grupos.length === 0 && socket.groupFetchAllParticipating) {
      try {
        const groupsData = await socket.groupFetchAllParticipating();
        grupos = Object.entries(groupsData || {})
          .map(([id, data]: any) => ({
            id,
            nombre: data.subject || 'Sin nombre',
            participantes: data.participants?.length || 0,
          }))
          .filter(g => g.id.endsWith('@g.us'));
      } catch (e) {
        console.log('⚠️ No se pudieron obtener grupos via fetchAllGroupMetadata');
      }
    }

    console.log(`✅ ${grupos.length} grupos reales encontrados`);

    if (grupos.length > 0) {
      return res.json({
        success: true,
        grupos,
        total: grupos.length,
        fuente: 'real',
        usuario: socket.user.id,
      });
    }

    // Fallback si no hay grupos
    res.json({
      success: true,
      grupos: [
        { id: 'demo-1@g.us', nombre: '✅ JEFECITO PERSONAL', participantes: 2 },
      ],
      total: 1,
      fuente: 'demo',
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

// ✅ Endpoint: Obtener últimos 30 mensajes
gruposRouter.post('/ultimos-30-mensajes', async (req: Request, res: Response) => {
  try {
    const { grupoId } = req.body;
    if (!grupoId) {
      return res.status(400).json({ success: false, error: 'grupoId requerido' });
    }

    if (!socket?.user) {
      return res.status(503).json({ success: false, error: 'Baileys no disponible' });
    }

    const mensajes = socket.store?.messages?.[grupoId]?.all() || [];
    const mensajesFormateados = mensajes.slice(-30).map((msg: any) => ({
      id: msg.key.id,
      remitente: msg.pushName || msg.key.participant?.split('@')[0] || 'Desconocido',
      contenido: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[Media]',
      timestamp: msg.messageTimestamp,
    }));

    console.log(`📨 ${mensajesFormateados.length} mensajes obtenidos`);

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
      return res.status(400).json({ success: false, error: 'grupoId requerido' });
    }

    if (!socket?.user) {
      return res.status(503).json({ success: false, error: 'Baileys no disponible' });
    }

    const mensajes = socket.store?.messages?.[grupoId]?.all() || [];
    const mensajesFormateados = mensajes.map((msg: any) => ({
      id: msg.key.id,
      remitente: msg.pushName || msg.key.participant?.split('@')[0] || 'Desconocido',
      contenido: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[Media]',
      timestamp: msg.messageTimestamp,
    }));

    console.log(`🌪️ SUCCIONANDO ${mensajesFormateados.length} mensajes reales`);

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
