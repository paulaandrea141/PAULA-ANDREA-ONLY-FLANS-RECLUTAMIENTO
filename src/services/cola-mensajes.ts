/**
 * 🗄️ Cola de Mensajes - Sistema de caché temporal
 * Guarda mensajes entrantes para succión posterior
 */

interface MensajeCache {
  grupoId: string;
  timestamp: number;
  remitente: string;
  nombre: string;
  mensaje: string;
}

class ColaMensajesService {
  private mensajes: Map<string, MensajeCache[]> = new Map();
  private readonly MAX_MENSAJES_POR_GRUPO = 500; // Guardar hasta 500 mensajes por grupo

  /**
   * 📥 Agregar mensaje a la cola
   */
  agregar(grupoId: string, mensaje: MensajeCache) {
    if (!this.mensajes.has(grupoId)) {
      this.mensajes.set(grupoId, []);
    }

    const cola = this.mensajes.get(grupoId)!;
    cola.push(mensaje);

    // Limitar tamaño (mantener solo los últimos 500)
    if (cola.length > this.MAX_MENSAJES_POR_GRUPO) {
      cola.shift(); // Eliminar el más antiguo
    }

    console.log(`📥 COLA: Mensaje guardado en ${grupoId} (Total: ${cola.length})`);
  }

  /**
   * 📤 Obtener últimos N mensajes de un grupo
   */
  obtener(grupoId: string, limite = 300): MensajeCache[] {
    const cola = this.mensajes.get(grupoId) || [];
    const mensajes = cola.slice(-limite); // Últimos N mensajes
    console.log(`📤 COLA: Extrayendo ${mensajes.length} mensajes de ${grupoId}`);
    return mensajes;
  }

  /**
   * 🧹 Limpiar cola de un grupo
   */
  limpiar(grupoId: string) {
    this.mensajes.delete(grupoId);
    console.log(`🧹 COLA: Limpiada cola de ${grupoId}`);
  }

  /**
   * 📊 Estadísticas
   */
  estadisticas(): { [grupoId: string]: number } {
    const stats: { [grupoId: string]: number } = {};
    this.mensajes.forEach((mensajes, grupoId) => {
      stats[grupoId] = mensajes.length;
    });
    return stats;
  }

  /**
   * 📋 Grupos activos
   */
  gruposActivos(): string[] {
    return Array.from(this.mensajes.keys());
  }
}

// Singleton global
export const colaMensajes = new ColaMensajesService();
