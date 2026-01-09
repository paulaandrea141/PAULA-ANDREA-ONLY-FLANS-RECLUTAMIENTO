import { WASocket } from '@whiskeysockets/baileys';
import { GRUPOS_MONTERREY, PLANTILLAS_PUBLICACION } from '../data/grupos-monterrey';
import { db } from '../database/firebase-config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

interface PublicacionLog {
  grupoId: string;
  grupoNombre: string;
  vacante: string;
  timestamp: Timestamp;
  exitoso: boolean;
  error?: string;
}

/**
 * 🎯 PUBLICADOR AUTOMÁTICO DE VACANTES EN GRUPOS
 * Tech Lead: Paula Specter (@SpecterTech)
 * 
 * Funcionalidad:
 * - Publica automáticamente cada 2 horas en grupos diferentes
 * - Evita spam usando el mismo grupo múltiples veces al día
 * - Registra todas las publicaciones en Firebase
 * - Manejo de errores robusto
 */
export class PublicadorGruposService {
  private socket: WASocket | null = null;
  private intervaloPublicacion: NodeJS.Timeout | null = null;
  private gruposPublicadosHoy: Set<string> = new Set();
  private activo: boolean = false;

  constructor(socket: WASocket) {
    this.socket = socket;
  }

  /**
   * 🚀 Inicia el ciclo de publicación automática
   * Publica 1 vacante cada 2 horas en grupos diferentes
   */
  iniciarPublicacionAutomatica(): void {
    if (this.activo) {
      console.log('⚠️ Publicador ya está activo');
      return;
    }

    this.activo = true;
    console.log('🚀 Publicador automático INICIADO - Cada 2 horas');
    
    // Publicar inmediatamente al iniciar (después de 10 segundos)
    setTimeout(() => {
      this.publicarEnGrupoAleatorio();
    }, 10000); // 10 segundos
    
    // Publicar cada 2 horas
    this.intervaloPublicacion = setInterval(() => {
      this.publicarEnGrupoAleatorio();
    }, 2 * 60 * 60 * 1000); // 2 horas

    // Resetear grupos usados a medianoche
    this.programarReseteoMedianoche();
  }

  /**
   * 🎲 Publica en un grupo aleatorio que no se haya usado hoy
   */
  private async publicarEnGrupoAleatorio(): Promise<void> {
    if (!this.socket) {
      console.error('❌ Socket no disponible para publicación');
      return;
    }

    if (!this.activo) {
      console.log('⏸️ Publicador inactivo, saltando publicación');
      return;
    }

    try {
      // Filtrar grupos activos que no se han usado hoy
      const gruposDisponibles = GRUPOS_MONTERREY.filter(
        g => g.activo && !this.gruposPublicadosHoy.has(g.nombre)
      );

      if (gruposDisponibles.length === 0) {
        console.log('⏰ Todos los grupos usados hoy. Reseteando lista...');
        this.gruposPublicadosHoy.clear();
        return;
      }

      // Seleccionar grupo aleatorio
      const grupoAleatorio = gruposDisponibles[
        Math.floor(Math.random() * gruposDisponibles.length)
      ];

      // Seleccionar plantilla aleatoria
      const plantillaAleatoria = PLANTILLAS_PUBLICACION[
        Math.floor(Math.random() * PLANTILLAS_PUBLICACION.length)
      ];

      console.log(`📢 Publicando en: ${grupoAleatorio.nombre}...`);

      // Publicar en el grupo
      await this.socket.sendMessage(`${grupoAleatorio.id}@g.us`, {
        text: plantillaAleatoria
      });

      // Marcar como usado
      this.gruposPublicadosHoy.add(grupoAleatorio.id);

      // Log en Firebase
      await this.guardarLogPublicacion({
        grupoId: grupoAleatorio.id,
        grupoNombre: grupoAleatorio.nombre,
        vacante: 'Operario/Supervisor Industrial',
        timestamp: Timestamp.now(),
        exitoso: true
      });

      console.log(`✅ PUBLICADO EXITOSAMENTE en: ${grupoAleatorio.nombre}`);
      console.log(`📊 Grupos usados hoy: ${this.gruposPublicadosHoy.size}/${GRUPOS_MONTERREY.length}`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`❌ Error en publicación automática:`, errorMsg);
      
      // Intentar guardar log de error
      try {
        await this.guardarLogPublicacion({
          grupoId: 'unknown',
          grupoNombre: 'Error en publicación',
          vacante: 'Operario/Supervisor Industrial',
          timestamp: Timestamp.now(),
          exitoso: false,
          error: errorMsg
        });
      } catch (logError) {
        console.error('❌ Error guardando log de error:', logError);
      }
    }
  }

  /**
   * 📝 Publica manualmente en un grupo específico
   * @param grupoId ID del grupo (sin @g.us)
   * @param mensaje Mensaje a publicar
   */
  async publicarEnGrupo(grupoId: string, mensaje: string): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket no disponible');
    }

    console.log(`📢 Publicación MANUAL en grupo: ${grupoId}`);

    await this.socket.sendMessage(`${grupoId}@g.us`, {
      text: mensaje
    });

    await this.guardarLogPublicacion({
      grupoId,
      grupoNombre: grupoId,
      vacante: 'Publicación Manual',
      timestamp: Timestamp.now(),
      exitoso: true
    });

    console.log(`✅ Publicación manual exitosa`);
  }

  /**
   * 📊 Publica en múltiples grupos a la vez
   * USAR CON PRECAUCIÓN - Puede ser considerado spam
   */
  async publicarEnMultiplesGrupos(mensaje: string, maxGrupos: number = 5): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket no disponible');
    }

    const gruposActivos = GRUPOS_MONTERREY.filter(g => g.activo).slice(0, maxGrupos);
    console.log(`📢 Publicación MASIVA en ${gruposActivos.length} grupos...`);

    for (const grupo of gruposActivos) {
      try {
        await this.socket.sendMessage(`${grupo.id}@g.us`, {
          text: mensaje
        });

        await this.guardarLogPublicacion({
          grupoId: grupo.id,
          grupoNombre: grupo.nombre,
          vacante: 'Publicación Masiva',
          timestamp: Timestamp.now(),
          exitoso: true
        });

        console.log(`✅ Publicado en: ${grupo.nombre}`);
        
        // Esperar 30 segundos entre publicaciones para evitar baneo
        await new Promise(resolve => setTimeout(resolve, 30000));
        
      } catch (error) {
        console.error(`❌ Error en ${grupo.nombre}:`, error);
        
        await this.guardarLogPublicacion({
          grupoId: grupo.id,
          grupoNombre: grupo.nombre,
          vacante: 'Publicación Masiva',
          timestamp: Timestamp.now(),
          exitoso: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    console.log(`✅ Publicación masiva completada`);
  }

  /**
   * 💾 Guarda log de publicación en Firebase
   */
  private async guardarLogPublicacion(log: PublicacionLog): Promise<void> {
    try {
      await addDoc(collection(db, 'publicaciones'), {
        ...log,
        timestamp: log.timestamp || Timestamp.now()
      });
    } catch (error) {
      console.error('❌ Error guardando log en Firebase:', error);
    }
  }

  /**
   * 🌙 Programa reseteo de grupos a medianoche
   */
  private programarReseteoMedianoche(): void {
    const ahora = new Date();
    const manana = new Date(ahora);
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0);
    
    const msHastaMedianoche = manana.getTime() - ahora.getTime();

    setTimeout(() => {
      console.log('🌙 Medianoche - Reseteando lista de grupos...');
      this.gruposPublicadosHoy.clear();
      
      // Reprogramar para la siguiente medianoche
      this.programarReseteoMedianoche();
    }, msHastaMedianoche);

    console.log(`🌙 Reseteo programado para: ${manana.toLocaleString('es-MX')}`);
  }

  /**
   * 📊 Obtiene estadísticas del publicador
   */
  obtenerEstadisticas(): {
    activo: boolean;
    gruposUsadosHoy: number;
    gruposTotales: number;
    gruposDisponibles: number;
  } {
    return {
      activo: this.activo,
      gruposUsadosHoy: this.gruposPublicadosHoy.size,
      gruposTotales: GRUPOS_MONTERREY.length,
      gruposDisponibles: GRUPOS_MONTERREY.filter(
        g => g.activo && !this.gruposPublicadosHoy.has(g.id)
      ).length
    };
  }

  /**
   * ⏸️ Pausa el publicador automático
   */
  pausar(): void {
    this.activo = false;
    console.log('⏸️ Publicador automático PAUSADO');
  }

  /**
   * ▶️ Reanuda el publicador automático
   */
  reanudar(): void {
    this.activo = true;
    console.log('▶️ Publicador automático REANUDADO');
  }

  /**
   * 🛑 Detiene completamente el publicador
   */
  detener(): void {
    if (this.intervaloPublicacion) {
      clearInterval(this.intervaloPublicacion);
      this.intervaloPublicacion = null;
    }
    this.activo = false;
    this.gruposPublicadosHoy.clear();
    console.log('🛑 Publicador automático DETENIDO');
  }
}
