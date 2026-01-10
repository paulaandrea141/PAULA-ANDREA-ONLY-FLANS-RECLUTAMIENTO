import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from 'baileys';
import qrcode from 'qrcode-terminal';
import { BotWhatsAppService } from './whatsapp-bot-service';
import { colaMensajes } from '../services/cola-mensajes';

/**
 * 🔥 WHATSAPP VINCULADO: Paula Specter - CEO CORP. TYRELL
 * Número: [PROTEGIDO]
 * Sistema: Aspiradora 3000 - Monitoreo permanente 24/7
 */
export const PAULA_WHATSAPP = process.env.SECRET_CEO_WHATSAPP?.replace(/[^0-9]/g, '') || '528124206561'; // Sin espacios ni +
export const PAULA_WHATSAPP_FORMATTED = process.env.SECRET_CEO_WHATSAPP || '+528124206561';

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
      console.log('\n========================================');
      console.log('📱 WHATSAPP - VINCULACIÓN PAULA SPECTER');
      console.log('========================================');
      console.log(`📞 Número CEO: ${PAULA_WHATSAPP_FORMATTED}`);
      console.log('🌪️ Sistema: Aspiradora 3000');
      console.log('\n📱 Escanea este QR con WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      console.log('\n✅ Una vez escaneado, la conexión será PERMANENTE');
      console.log('========================================\n');
    }

    if (connection === 'open') {
      isConnected = true;
      console.log('✅ WhatsApp conectado exitosamente!');
      
      // Inicializar bot con publicador automático
      await BotWhatsAppService.inicializar(sock);
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
      
      // 🗄️ GUARDAR EN COLA si es mensaje de grupo
      if (remoteJid.includes('@g.us')) {
        const pushName = msg.pushName || 'Desconocido';
        colaMensajes.agregar(remoteJid, {
          grupoId: remoteJid,
          timestamp: (msg.messageTimestamp as number) * 1000,
          remitente: msg.key.participant || remoteJid,
          nombre: pushName,
          mensaje: texto,
        });
      }
      
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
