import { collection, addDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../database/firebase-config';

/**
 * 🗣️ SERVICIO DE HISTORIAL DE CHAT - CORP. TYRELL
 * CEO: Paula Andrea Hayle (Jessica Pearson)
 * Socio Mayoritario: Bob (Louis Litt)
 * Tech Lead: Paula Specter (@SpecterTech)
 * 
 * Guarda cada interacción con la IA para auditoría
 */

interface MensajeHistorial {
  id?: string;
  tipo: 'usuario' | 'ia';
  contenido: string;
  timestamp: number;
  metadatos?: {
    tipoInput: 'texto' | 'imagen' | 'voz';
    empresasDetectadas?: string[];
    accionTomada?: 'guardada' | 'rechazada' | 'pendiente';
    vacanteId?: string;
  };
}

export class HistorialIngestaService {
  /**
   * Registra mensaje del usuario (texto/imagen/voz)
   */
  static async registrarMensajeUsuario(
    contenido: string,
    tipoInput: 'texto' | 'imagen' | 'voz'
  ): Promise<string> {
    try {
      const mensaje: MensajeHistorial = {
        tipo: 'usuario',
        contenido,
        timestamp: Date.now(),
        metadatos: { tipoInput },
      };

      const docRef = await addDoc(collection(db, 'historial_ingesta'), mensaje);
      console.log(`💬 Paula: ${contenido.substring(0, 50)}...`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error guardando mensaje usuario:', error);
      throw error;
    }
  }

  /**
   * Registra respuesta de la IA (confirmación/análisis)
   */
  static async registrarRespuestaIA(
    contenido: string,
    empresasDetectadas: string[],
    accionTomada: 'guardada' | 'rechazada' | 'pendiente',
    vacanteId?: string
  ): Promise<string> {
    try {
      const mensaje: MensajeHistorial = {
        tipo: 'ia',
        contenido,
        timestamp: Date.now(),
        metadatos: {
          tipoInput: 'texto',
          empresasDetectadas,
          accionTomada,
          vacanteId,
        },
      };

      const docRef = await addDoc(collection(db, 'historial_ingesta'), mensaje);
      console.log(`🤖 Bob: ${contenido.substring(0, 50)}...`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error guardando respuesta IA:', error);
      throw error;
    }
  }

  /**
   * Obtiene historial completo (últimos 50 mensajes)
   */
  static async obtenerHistorial(): Promise<MensajeHistorial[]> {
    try {
      const q = query(
        collection(db, 'historial_ingesta'),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);
      const mensajes: MensajeHistorial[] = [];

      snapshot.docs.slice(-50).forEach((doc) => {
        mensajes.push({
          id: doc.id,
          ...doc.data(),
        } as MensajeHistorial);
      });

      return mensajes;
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      return [];
    }
  }

  /**
   * Genera respuesta "estilo Bob" para Paula
   */
  static generarRespuestaConfirmacion(
    empresas: string[],
    totalVacantes: number
  ): string {
    if (empresas.length === 0) {
      return `🤔 Paula, no detecté empresas claras en ese mugrero del jefecito. ¿Me pasas más info o lo subimos como "Vacante General"?`;
    }

    if (empresas.length === 1) {
      return `✅ Paula, ya leí la captura. Es **${empresas[0]}** con 1 vacante. ¿La mando a la Ristra o le cambias algo antes?`;
    }

    return `✅ Paula, detecté **${empresas.length} empresas**: ${empresas.join(', ')}. Son **${totalVacantes} vacantes** en total. ¿Las subo todas o reviso alguna primero?`;
  }
}
