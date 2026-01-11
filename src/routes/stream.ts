/**
 * 📡 SSE STREAMING - Real-time Message Streaming
 * Transmite mensajes de WhatsApp en tiempo real a los clientes
 */

import express from 'express';
import type { Request, Response } from 'express';

// Almacenar clientes conectados
const connectedClients = new Set<Response>();

// Almacenar mensajes para nuevos clientes
const messageHistory: Array<{
  id: string;
  contenido: string;
  autor: string;
  timestamp: number;
  tipo: 'whatsapp' | 'vacante' | 'sistema';
}> = [];

export const streamRouter = express.Router();

/**
 * GET /stream - Conectarse al streaming SSE
 */
streamRouter.get('/stream', (req: Request, res: Response) => {
  // Headers para SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Enviar mensaje inicial
  res.write(
    `data: ${JSON.stringify({
      tipo: 'conexion',
      mensaje: '✅ Conectado al streaming 24/7',
      timestamp: Date.now(),
    })}\n\n`
  );

  // Agregar cliente a la lista
  connectedClients.add(res);
  console.log(`🟢 Cliente conectado. Total: ${connectedClients.size}`);

  // Enviar historial
  messageHistory.slice(-20).forEach((msg) => {
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  });

  // Limpiar cuando se desconecta
  req.on('close', () => {
    connectedClients.delete(res);
    console.log(`🔴 Cliente desconectado. Total: ${connectedClients.size}`);
    res.end();
  });

  // Heartbeat para mantener conexión viva
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  req.on('close', () => clearInterval(heartbeat));
});

/**
 * POST /broadcast - Enviar mensaje a todos los clientes conectados
 */
streamRouter.post('/broadcast', (req: Request, res: Response) => {
  const { contenido, autor, tipo = 'whatsapp' } = req.body;

  if (!contenido || !autor) {
    return res.status(400).json({ error: 'Faltan campos: contenido, autor' });
  }

  const mensaje = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    contenido,
    autor,
    timestamp: Date.now(),
    tipo: tipo as 'whatsapp' | 'vacante' | 'sistema',
  };

  // Guardar en historial
  messageHistory.push(mensaje);
  if (messageHistory.length > 500) {
    messageHistory.shift(); // Mantener solo últimos 500
  }

  // Enviar a todos los clientes
  const data = `data: ${JSON.stringify(mensaje)}\n\n`;
  connectedClients.forEach((client) => {
    try {
      client.write(data);
    } catch (error) {
      console.error('Error enviando a cliente:', error);
      connectedClients.delete(client);
    }
  });

  res.json({
    success: true,
    enviados: connectedClients.size,
    mensaje_id: mensaje.id,
  });
});

/**
 * GET /stats - Estadísticas del streaming
 */
streamRouter.get('/stats', (req: Request, res: Response) => {
  res.json({
    clientes_conectados: connectedClients.size,
    mensajes_en_historial: messageHistory.length,
    ultimos_mensajes: messageHistory.slice(-5),
  });
});

/**
 * Función auxiliar para enviar mensaje desde otras rutas
 */
export const broadcastMessage = (
  contenido: string,
  autor: string,
  tipo: 'whatsapp' | 'vacante' | 'sistema' = 'whatsapp'
) => {
  const mensaje = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    contenido,
    autor,
    timestamp: Date.now(),
    tipo,
  };

  messageHistory.push(mensaje);
  if (messageHistory.length > 500) {
    messageHistory.shift();
  }

  const data = `data: ${JSON.stringify(mensaje)}\n\n`;
  connectedClients.forEach((client) => {
    try {
      client.write(data);
    } catch (error) {
      connectedClients.delete(client);
    }
  });

  return mensaje;
};

export default streamRouter;
