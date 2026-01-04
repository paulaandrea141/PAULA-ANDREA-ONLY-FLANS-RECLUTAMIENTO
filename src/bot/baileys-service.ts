import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from 'baileys';
import qrcode from 'qrcode-terminal';
import { BotWhatsAppService } from './whatsapp-bot-service';

let sock: ReturnType<typeof makeWASocket>;
let isConnected = false;

export const inicializarBaileys = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
    browser: ['Only Flans', 'Chrome', '120.0'],
    syncFullHistory: false,
  });

  // Mostrar QR en consola
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 Escanea este QR con WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      isConnected = true;
      console.log('✅ WhatsApp conectado exitosamente!');
    }

    if (connection === 'close') {
      isConnected = false;
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      if (!shouldReconnect) {
        console.log('❌ Sesión cerrada. Escanea el QR nuevamente.');
        process.exit(1);
      } else {
        console.log('⚠️ Reconectando...');
        setTimeout(() => inicializarBaileys(), 3000);
      }
    }
  });

  // Escuchar mensajes entrantes
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const remoteJid = msg.key.remoteJid || '';
    const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

    if (texto.trim()) {
      console.log(`📨 Mensaje de ${remoteJid}: ${texto}`);
      await BotWhatsAppService.procesarMensajeEntrante(remoteJid, texto);
    }
  });

  // Guardar credenciales
  sock.ev.on('creds.update', saveCreds);

  return sock;
};

export const enviarMensaje = async (numero: string, mensaje: string) => {
  if (!isConnected) {
    console.error('❌ WhatsApp no está conectado');
    return;
  }

  try {
    const jid = numero.includes('@s.whatsapp.net') ? numero : `${numero}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: mensaje });
    console.log(`✅ Mensaje enviado a ${numero}`);
  } catch (error) {
    console.error(`❌ Error enviando mensaje:`, error);
  }
};

export const getSocket = () => sock;
export const isConectado = () => isConnected;
