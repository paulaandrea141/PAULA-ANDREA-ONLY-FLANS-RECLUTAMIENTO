import makeWASocket, { useMultiFileAuthState, Browsers } from 'baileys';
import { Boom } from '@hapi/boom';
import * as fs from 'fs';
import * as path from 'path';

let socket: any = null;
const CREDS_DIR = path.join(process.cwd(), 'auth_info_baileys');

export async function initiateBaileysSession() {
  if (socket) {
    return socket;
  }

  try {
    // Crear directorio de credenciales si no existe
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

    // Escuchar eventos
    socket.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== 401;
        if (shouldReconnect) {
          console.log('🔄 Reconectando Baileys...');
          socket = null;
          initiateBaileysSession();
        }
      } else if (connection === 'open') {
        console.log('✅ WhatsApp conectado');
      }
    });

    socket.ev.on('creds.update', saveCreds);

    return socket;
  } catch (error) {
    console.error('❌ Error iniciando Baileys:', error);
    throw error;
  }
}

export function getSocket() {
  return socket;
}
