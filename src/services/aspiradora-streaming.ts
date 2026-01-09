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
  // 🎯 ID CONFIRMADO POR PAULA (Grupo "FREELANCE RICARDO BYG")
  private readonly GRUPO_JEFECITO = '120363097823040111@g.us';

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || '',
    });
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

    this.grupoJefecitoId = (grupoJefecito as any).id;
    console.log(`✅ Grupo "jefecito" encontrado: ${this.grupoJefecitoId}`);

    // Escuchar TODOS los mensajes nuevos
    sock.ev.on('messages.upsert', async ({ messages, type }: { messages: WAMessage[]; type: any }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        await this.procesarMensajeEnTiempoReal(sock, msg);
      }
    });

    this.monitoreoActivo = true;
    console.log('✅ MONITOREO ACTIVO - ASPIRADORA 3000 EN GUARDIA 24/7');
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

      // Enviar mensaje a todos los clientes conectados
      this.enviarEvento('todos', 'mensaje', {
        id: key.id || `msg-${Date.now()}`,
        timestamp,
        autor,
        contenido,
        procesado: false,
        esVacante: false,
      });

      // Procesar con Groq IA (asíncrono, no bloquea)
      this.analizarConGroqAsync(contenido, key.id || `msg-${Date.now()}`, timestamp);
    } catch (error) {
      console.error('❌ Error procesando mensaje en tiempo real:', error);
    }
  }

  /**
   * Analiza un mensaje con Groq IA (asíncrono)
   */
  private async analizarConGroqAsync(
    contenido: string,
    mensajeId: string,
    timestamp: Date
  ): Promise<void> {
    try {
      // Notificar que Groq está procesando
      this.enviarEvento('todos', 'estadisticas', {
        mensajesTotales: this.mensajesProcesados,
        vacantesDetectadas: this.vacantesDetectadas,
        timestamp: new Date(),
        groqProcesando: true,
      });

      const prompt = `
Eres un extractor de vacantes de trabajo. Analiza el siguiente mensaje de WhatsApp y determina si contiene información de una vacante.

MENSAJE:
"${contenido}"

RESPONDE EN FORMATO JSON:
{
  "esVacante": true/false,
  "puesto": "nombre del puesto",
  "empresa": "nombre de la empresa",
  "sueldo": "rango salarial",
  "ubicacion": "ciudad/zona",
  "requisitos": ["req1", "req2"],
  "confianza": 0-100
}

Si NO es una vacante, responde: {"esVacante": false}
`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 500,
      });

      const respuesta = completion.choices[0]?.message?.content || '{}';
      const match = respuesta.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : '{}';
      const resultado = JSON.parse(jsonStr);

      if (resultado.esVacante && resultado.confianza > 60) {
        console.log(`✅ VACANTE DETECTADA: ${resultado.puesto} en ${resultado.empresa}`);

        // Guardar en Firebase
        await this.guardarVacanteEnFirebase(resultado, contenido, timestamp);

        // Incrementar contador
        this.vacantesDetectadas++;

        // Actualizar mensaje como vacante
        this.enviarEvento('todos', 'mensaje', {
          id: mensajeId,
          timestamp,
          autor: 'GROQ IA',
          contenido: `🎯 VACANTE: ${resultado.puesto} - ${resultado.empresa}`,
          procesado: true,
          esVacante: true,
        });

        // Enviar estadísticas actualizadas
        this.enviarEstadisticas('todos');
      }

      // Notificar que Groq terminó
      this.enviarEvento('todos', 'estadisticas', {
        mensajesTotales: this.mensajesProcesados,
        vacantesDetectadas: this.vacantesDetectadas,
        timestamp: new Date(),
        groqProcesando: false,
      });
    } catch (error) {
      console.error('❌ Error analizando con Groq:', error);
      this.enviarEvento('todos', 'estadisticas', {
        mensajesTotales: this.mensajesProcesados,
        vacantesDetectadas: this.vacantesDetectadas,
        timestamp: new Date(),
        groqProcesando: false,
      });
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
