import { GRUPOS_MONTERREY, PLANTILLAS_PUBLICACION, CONFIG_PUBLICACION } from '../data/grupos-monterrey';

/**
 * Servicio para publicar automáticamente en grupos de WhatsApp
 * Publica de forma inteligente sin parecer spam
 */

interface PublicacionRegistro {
  timestamp: number;
  grupoNombre: string;
  status: 'enviado' | 'fallido' | 'pendiente';
  mensaje: string;
}

const registroPublicaciones: PublicacionRegistro[] = [];

export class AutoPublicadorService {
  /**
   * Obtiene un mensaje aleatorio de las plantillas
   */
  static obtenerMensajeAleatorio(): string {
    const index = Math.floor(Math.random() * PLANTILLAS_PUBLICACION.length);
    return PLANTILLAS_PUBLICACION[index];
  }

  /**
   * Verifica si es hora permitida para publicar
   */
  static esHoraPermitida(): boolean {
    const ahora = new Date();
    const hora = ahora.getHours();
    const dia = ahora.getDay();

    // Verificar horario
    const enHorario =
      hora >= CONFIG_PUBLICACION.horaInicioPub && hora < CONFIG_PUBLICACION.horaFinPub;

    // Verificar día de la semana
    const enDiaPermitido = CONFIG_PUBLICACION.diasPublicacion.includes(dia);

    return enHorario && enDiaPermitido;
  }

  /**
   * Verifica si ya se alcanzó el límite de publicaciones diarias
   */
  static puedePubilcarHoy(): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const publicacionesHoy = registroPublicaciones.filter(
      (p) => new Date(p.timestamp).getTime() >= hoy.getTime()
    );

    return publicacionesHoy.length < CONFIG_PUBLICACION.mensajesPorDia;
  }

  /**
   * Publica un mensaje en un grupo específico (simulado)
   * En producción, esto se haría con la API oficial de WhatsApp
   */
  static async publicarEnGrupo(grupoNombre: string, mensaje: string): Promise<boolean> {
    try {
      console.log(`📤 Publicando en grupo: ${grupoNombre}`);
      console.log(`Mensaje: ${mensaje.substring(0, 50)}...`);

      // Simular delay de envío
      await this.delay(CONFIG_PUBLICACION.delayEntreMensajes);

      // Registrar publicación
      registroPublicaciones.push({
        timestamp: Date.now(),
        grupoNombre,
        status: 'enviado',
        mensaje,
      });

      console.log(`✅ Enviado a: ${grupoNombre}`);
      return true;
    } catch (error) {
      console.error(`❌ Error publicando en ${grupoNombre}:`, error);

      registroPublicaciones.push({
        timestamp: Date.now(),
        grupoNombre,
        status: 'fallido',
        mensaje,
      });

      return false;
    }
  }

  /**
   * Publica automáticamente en todos los grupos
   */
  static async publicarEnTodosLosGrupos(): Promise<{
    exitosos: number;
    fallidos: number;
    total: number;
  }> {
    // Validaciones previas
    if (!this.esHoraPermitida()) {
      console.log('⏰ No es hora permitida para publicar');
      return { exitosos: 0, fallidos: 0, total: 0 };
    }

    if (!this.puedePubilcarHoy()) {
      console.log('📊 Se alcanzó el límite de publicaciones diarias');
      return { exitosos: 0, fallidos: 0, total: 0 };
    }

    const mensaje = this.obtenerMensajeAleatorio();
    const gruposActivos = GRUPOS_MONTERREY.filter((g) => g.activo);

    let exitosos = 0;
    let fallidos = 0;

    console.log(`🚀 Iniciando publicación en ${gruposActivos.length} grupos...`);

    for (const grupo of gruposActivos) {
      const resultado = await this.publicarEnGrupo(grupo.nombre, mensaje);

      if (resultado) {
        exitosos++;
      } else {
        fallidos++;
      }

      // Esperar antes de siguiente grupo
      await this.delay(CONFIG_PUBLICACION.delayEntreGrupos);
    }

    console.log(`\n📊 Resumen:`);
    console.log(`✅ Exitosos: ${exitosos}`);
    console.log(`❌ Fallidos: ${fallidos}`);

    return {
      exitosos,
      fallidos,
      total: gruposActivos.length,
    };
  }

  /**
   * Programa una publicación recurrente
   * Publica cada X minutos según configuración
   */
  static programarPublicacionRecurrente(intervalMinutos: number = 240) {
    console.log(`⏱️  Programando publicación cada ${intervalMinutos} minutos`);

    setInterval(async () => {
      await this.publicarEnTodosLosGrupos();
    }, intervalMinutos * 60 * 1000);
  }

  /**
   * Obtiene estadísticas de publicaciones
   */
  static obtenerEstadisticas() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const publicacionesHoy = registroPublicaciones.filter(
      (p) => new Date(p.timestamp).getTime() >= hoy.getTime()
    );

    const exitosos = publicacionesHoy.filter((p) => p.status === 'enviado').length;
    const fallidos = publicacionesHoy.filter((p) => p.status === 'fallido').length;

    return {
      publicacionesHoy: publicacionesHoy.length,
      exitosos,
      fallidos,
      tasaExito: publicacionesHoy.length > 0 ? (exitosos / publicacionesHoy.length) * 100 : 0,
      gruposUsados: [...new Set(publicacionesHoy.map((p) => p.grupoNombre))],
    };
  }

  /**
   * Utility para delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default AutoPublicadorService;
