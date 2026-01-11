import { Response } from 'express';
import { WASocket, WAMessage, proto, downloadMediaMessage } from '@whiskeysockets/baileys';
import Groq from 'groq-sdk';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

interface ClienteSSE {
  id: string;
  res: Response;
  timestamp: Date;
}

export class AspiradoraStreamingService {
  private clientes: ClienteSSE[] = [];
  private mensajesProcesados = 0;
  private vacantesDetectadas = 0;
  private monitoreoActivo = false;
  private groq: Groq;
  private grupoJefecitoId: string | null = null;
  // 🎯 ID CONFIRMADO POR PAULA (Grupo "FREELANCE RICARDO BYG")
  private readonly GRUPO_JEFECITO = '120363097823040111@g.us';
  private contextoMensajes: Array<{contenido: string; autor: string; timestamp: Date}> = [];

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || '',
    });
    
    // 🔥 INTERCEPTAR console.log para enviar al frontend
    this.interceptarConsole();
  }

  /**
   * Intercepta console.log y envía al frontend
   */
  private interceptarConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      const mensaje = args.join(' ');
      this.enviarEvento('todos', 'log', {
        tipo: 'info',
        mensaje,
        timestamp: new Date(),
      });
    };
    
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      const mensaje = args.join(' ');
      this.enviarEvento('todos', 'log', {
        tipo: 'error',
        mensaje,
        timestamp: new Date(),
      });
    };
    
    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      const mensaje = args.join(' ');
      this.enviarEvento('todos', 'log', {
        tipo: 'warn',
        mensaje,
        timestamp: new Date(),
      });
    };
  }

  /**
   * Registra un nuevo cliente SSE
   */
  registrarCliente(res: Response): string {
    const clienteId = `cliente-${Date.now()}-${Math.random()}`;

    // Configurar headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx compatibility

    // Enviar comentario inicial para establecer conexión
    res.write(': Aspiradora 3000 conectada\n\n');
    res.flushHeaders();

    const cliente: ClienteSSE = {
      id: clienteId,
      res,
      timestamp: new Date(),
    };

    this.clientes.push(cliente);

    // Keep-alive cada 15 segundos
    const keepAliveInterval = setInterval(() => {
      if (!this.clientes.find(c => c.id === clienteId)) {
        clearInterval(keepAliveInterval);
        return;
      }
      try {
        res.write(': keep-alive\n\n');
      } catch (error) {
        console.error(`Error en keep-alive ${clienteId}:`, error);
        clearInterval(keepAliveInterval);
        this.desregistrarCliente(clienteId);
      }
    }, 15000);

    console.log(`✅ Cliente SSE registrado: ${clienteId} (Total: ${this.clientes.length})`);

    // Enviar mensaje de bienvenida
    this.enviarEvento(clienteId, 'conectado', {
      mensaje: '🌪️ ASPIRADORA 3000 ACTIVA',
      timestamp: new Date(),
    });

    // Enviar estadísticas iniciales
    this.enviarEstadisticas(clienteId);

    // Cleanup cuando el cliente se desconecta
    res.on('close', () => {
      this.desregistrarCliente(clienteId);
    });

    return clienteId;
  }

  /**
   * Desregistra un cliente SSE
   */
  private desregistrarCliente(clienteId: string) {
    this.clientes = this.clientes.filter((c) => c.id !== clienteId);
    console.log(`❌ Cliente SSE desconectado: ${clienteId} (Total: ${this.clientes.length})`);
  }

  /**
   * Envía un evento a un cliente específico o a todos
   */
  private enviarEvento(clienteId: string | 'todos', tipo: string, data: any) {
    const mensaje = `event: ${tipo}\ndata: ${JSON.stringify(data)}\n\n`;

    if (clienteId === 'todos') {
      const clientesDesconectados: string[] = [];
      this.clientes.forEach((cliente) => {
        try {
          if (!cliente.res.writableEnded && !cliente.res.destroyed) {
            cliente.res.write(mensaje);
          } else {
            clientesDesconectados.push(cliente.id);
          }
        } catch (error) {
          console.error(`Error enviando a ${cliente.id}:`, error);
          clientesDesconectados.push(cliente.id);
        }
      });
      // Limpiar clientes desconectados
      clientesDesconectados.forEach(id => this.desregistrarCliente(id));
    } else {
      const cliente = this.clientes.find((c) => c.id === clienteId);
      if (cliente) {
        try {
          if (!cliente.res.writableEnded && !cliente.res.destroyed) {
            cliente.res.write(mensaje);
          } else {
            this.desregistrarCliente(clienteId);
          }
        } catch (error) {
          console.error(`Error enviando a ${clienteId}:`, error);
          this.desregistrarCliente(clienteId);
        }
      }
    }
  }

  /**
   * Envía estadísticas a un cliente o a todos
   */
  private enviarEstadisticas(clienteId: string | 'todos' = 'todos') {
    this.enviarEvento(clienteId, 'estadisticas', {
      mensajesTotales: this.mensajesProcesados,
      vacantesDetectadas: this.vacantesDetectadas,
      timestamp: new Date(),
      groqProcesando: false,
    });
  }

  /**
   * 🧪 Método público para enviar mensajes de prueba
   */
  public enviarMensajePrueba(mensaje: any) {
    this.enviarEvento('todos', 'mensaje', mensaje);
  }

  /**
   * Inicia el monitoreo permanente del grupo jefecito
   */
  async iniciarMonitoreo(sock: WASocket): Promise<void> {
    if (this.monitoreoActivo) {
      console.log('⚠️ Monitoreo ya está activo');
      return;
    }

    console.log('🌪️ INICIANDO MONITOREO PERMANENTE DE GRUPO JEFECITO...');

    // Buscar grupo "jefecito"
    // const grupos = await sock.groupFetchAllParticipating();
    // const gruposArray = Object.values(grupos);
    // const grupoJefecito = gruposArray.find((g: any) =>
    //   g.subject.toLowerCase().includes('jefecito')
    // );
    
    // 🔥 PAULA DIJO QUE USEMOS EL ID DIRECTO DE "FREELANCE RICARDO BYG"
    this.grupoJefecitoId = this.GRUPO_JEFECITO;

    if (!this.grupoJefecitoId) {
      console.error('❌ Grupo "jefecito" no encontrado');
      throw new Error('Grupo "jefecito" no encontrado');
    }

    console.log(`✅ Grupo BYG activado: ${this.grupoJefecitoId}`);
    console.log(`🌪️ ASPIRADORA 3000 - MONITOREO 24/7 ACTIVO`);

    // ℹ️ Informar al frontend que el sistema está listo
    this.enviarEvento('todos', 'info', {
      mensaje: '🌪️ ASPIRADORA 3000 ACTIVADA - Monitoreando grupo jefecito en tiempo real. Envía un mensaje al grupo para probarlo.',
      timestamp: new Date(),
    });

    // Escuchar TODOS los mensajes nuevos del grupo BYG
    sock.ev.on('messages.upsert', async ({ messages, type }: { messages: WAMessage[]; type: any }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        await this.procesarMensajeEnTiempoReal(sock, msg);
      }
    });

    this.monitoreoActivo = true;
    console.log('✅ ASPIRADORA 3000 EN GUARDIA PERMANENTE - GRUPO BYG');
  }

  /**
   * Procesa un mensaje en tiempo real
   */
  private async procesarMensajeEnTiempoReal(sock: WASocket, msg: WAMessage): Promise<void> {
    try {
      // Filtrar solo mensajes del grupo jefecito
      const key = msg.key;
      if (!key.remoteJid || key.remoteJid !== this.grupoJefecitoId) {
        return;
      }

      // Extraer información del mensaje
      const mensaje = msg.message;
      if (!mensaje) return;

      const contenido =
        mensaje.conversation ||
        mensaje.extendedTextMessage?.text ||
        mensaje.imageMessage?.caption ||
        '[Multimedia]';

      const autor = key.participant
        ? key.participant.split('@')[0]
        : 'Desconocido';
      const timestamp = msg.messageTimestamp
        ? new Date(Number(msg.messageTimestamp) * 1000)
        : new Date();

      console.log(`📩 MENSAJE DE JEFECITO: ${autor}: ${contenido.substring(0, 50)}...`);

      // Incrementar contador
      this.mensajesProcesados++;

      // 🧠 GUARDAR EN CONTEXTO (últimos 50 mensajes)
      this.contextoMensajes.unshift({ contenido, autor, timestamp });
      if (this.contextoMensajes.length > 50) {
        this.contextoMensajes.pop();
      }

      // Enviar mensaje a todos los clientes conectados
      this.enviarEvento('todos', 'mensaje', {
        id: key.id || `msg-${Date.now()}`,
        timestamp,
        autor,
        contenido,
        procesado: false,
        esVacante: false,
      });

      // 🤖 GROQ: Analizar mensaje y generar respuesta
      this.procesarMensajeConGroq(contenido, autor, key.id || `msg-${Date.now()}`, timestamp);
    } catch (error) {
      console.error('❌ Error procesando mensaje en tiempo real:', error);
    }
  }

  /**
   * 🤖 GROQ: Procesa mensaje completo (detecta vacante + genera respuesta)
   */
  private async procesarMensajeConGroq(
    contenido: string,
    autor: string,
    mensajeId: string,
    timestamp: Date
  ): Promise<void> {
    try {
      // 🧠 Construir contexto de los últimos mensajes
      const contextoTexto = this.contextoMensajes
        .slice(0, 10)
        .map(m => `[${m.autor}]: ${m.contenido}`)
        .join('\n');

      const prompt = `Eres Paula Specter, CEO de CORP. TYRELL, empresa de reclutamiento. Analiza el mensaje y:

1. Determina si es una VACANTE de trabajo
2. Si es vacante, genera una RESPUESTA PROFESIONAL para responder al grupo

CONTEXTO DE LA CONVERSACIÓN (últimos 10 mensajes):
${contextoTexto}

MENSAJE ACTUAL:
[${autor}]: ${contenido}

RESPONDE EN JSON:
{
  "esVacante": true/false,
  "puesto": "puesto ofrecido",
  "empresa": "nombre empresa",
  "salario": "rango salarial",
  "requisitos": ["req1", "req2"],
  "confianza": 0-100,
  "respuesta": "Mensaje profesional para responder al grupo (solo si es vacante)"
}

Si NO es vacante, responde: {"esVacante": false, "respuesta": null}`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const respuesta = completion.choices[0]?.message?.content || '{}';
      const resultado = JSON.parse(respuesta);

      if (resultado.esVacante && resultado.confianza > 60) {
        console.log(`✅ VACANTE DETECTADA: ${resultado.puesto} - ${resultado.empresa}`);

        // 💾 Guardar en Firebase
        await this.guardarVacanteEnFirebase(resultado, contenido, timestamp);

        // 📤 Enviar respuesta de Groq al frontend
        this.enviarEvento('todos', 'groq_respuesta', {
          id: `groq-${Date.now()}`,
          timestamp: new Date(),
          autor: 'GROQ IA',
          contenido: resultado.respuesta || '✅ Vacante procesada y guardada en Firebase',
          esVacante: true,
          procesado: true,
          vacante: resultado,
        });

        this.vacantesDetectadas++;
      } else {
        console.log(`📝 Mensaje normal de ${autor}`);
      }

      // Actualizar estadísticas
      this.enviarEstadisticas('todos');
    } catch (error: any) {
      console.error('❌ Error en Groq:', error.message);
    }
  }

  /**
   * Guarda una vacante en Firebase
   */
  private async guardarVacanteEnFirebase(
    vacante: any,
    contenidoOriginal: string,
    timestamp: Date
  ): Promise<void> {
    try {
      const vacantesRef = collection(db, 'vacantes');

      // Buscar si ya existe (por puesto + empresa)
      const q = query(
        vacantesRef,
        where('puesto', '==', vacante.puesto),
        where('empresa', '==', vacante.empresa)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Crear nueva vacante
        const nuevaVacante = {
          puesto: vacante.puesto,
          empresa: vacante.empresa,
          sueldo: vacante.sueldo || 'No especificado',
          ubicacion: vacante.ubicacion || 'No especificado',
          requisitos: vacante.requisitos || [],
          descripcion: contenidoOriginal,
          fuente: 'WhatsApp - Grupo Jefecito',
          fechaPublicacion: timestamp,
          estado: 'activa',
          creadoPor: 'ASPIRADORA 3000',
          confianzaIA: vacante.confianza,
        };

        await addDoc(vacantesRef, nuevaVacante);
        console.log(`✅ Vacante guardada en Firebase: ${vacante.puesto}`);
      } else {
        // Actualizar vacante existente
        const docId = querySnapshot.docs[0].id;
        const docRef = doc(db, 'vacantes', docId);
        await updateDoc(docRef, {
          descripcion: contenidoOriginal,
          fechaActualizacion: timestamp,
          confianzaIA: vacante.confianza,
        });
        console.log(`✅ Vacante actualizada en Firebase: ${vacante.puesto}`);
      }
    } catch (error) {
      console.error('❌ Error guardando en Firebase:', error);
    }
  }

  /**
   * Obtiene estadísticas del servicio
   */
  obtenerEstadisticas() {
    return {
      clientesConectados: this.clientes.length,
      mensajesProcesados: this.mensajesProcesados,
      vacantesDetectadas: this.vacantesDetectadas,
      monitoreoActivo: this.monitoreoActivo,
      grupoJefecitoId: this.grupoJefecitoId,
    };
  }
}

// 🌪️ INSTANCIA GLOBAL ÚNICA - Compartida por todo el backend
export const aspiradoraStreaming = new AspiradoraStreamingService();
