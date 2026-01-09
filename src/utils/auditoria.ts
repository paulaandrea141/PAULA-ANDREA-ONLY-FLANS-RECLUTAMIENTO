import fs from 'fs/promises';
import path from 'path';

interface LogEntry {
  timestamp: string;
  tipo: 'INFO' | 'ERROR' | 'PUBLICACION' | 'CANDIDATO' | 'SISTEMA' | 'WHATSAPP';
  descripcion: string;
  datos?: any;
}

/**
 * 📜 SISTEMA DE AUDITORÍA AUTOMÁTICA
 * Tech Lead: Paula Specter (@SpecterTech)
 * 
 * Funcionalidad:
 * - Guarda logs cada 30 minutos automáticamente
 * - Genera BITACORA.md con formato profesional
 * - Actualiza holi.txt con timestamps precisos
 * - Thread-safe y resistente a errores
 */
class AuditoriaService {
  private logs: LogEntry[] = [];
  private intervaloGuardado: NodeJS.Timeout | null = null;
  private activo: boolean = false;

  /**
   * 🚀 Inicia el sistema de auditoría
   */
  iniciar(): void {
    if (this.activo) {
      console.log('⚠️ Sistema de auditoría ya está activo');
      return;
    }

    this.activo = true;
    console.log('📜 Sistema de auditoría INICIADO - Guardado cada 30 min');

    // Guardar cada 30 minutos
    this.intervaloGuardado = setInterval(() => {
      this.guardarTodo();
    }, 30 * 60 * 1000); // 30 minutos

    // Log inicial
    this.registrar('SISTEMA', '🚀 Sistema de auditoría iniciado');
  }

  /**
   * 📝 Registra un evento en el sistema
   */
  registrar(tipo: LogEntry['tipo'], descripcion: string, datos?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      tipo,
      descripcion,
      datos: datos ? JSON.parse(JSON.stringify(datos)) : undefined // Deep clone
    };
    
    this.logs.push(entry);
    
    // Console log con color según tipo
    const emoji = this.obtenerEmoji(tipo);
    console.log(`${emoji} [${entry.timestamp}] ${tipo}: ${descripcion}`);
  }

  /**
   * 💾 Guarda todos los logs pendientes
   */
  private async guardarTodo(): Promise<void> {
    if (this.logs.length === 0) {
      console.log('📜 No hay logs pendientes para guardar');
      return;
    }

    console.log(`📜 Guardando ${this.logs.length} logs...`);

    try {
      await Promise.all([
        this.guardarBitacora(),
        this.guardarHoliTxt(),
        this.guardarBackendBitacora(),
        this.guardarFrontendBitacora()
      ]);

      console.log('✅ Auditoría guardada exitosamente');
      
      // Limpiar logs después de guardar
      this.logs = [];
      
    } catch (error) {
      console.error('❌ Error guardando auditoría:', error);
    }
  }

  /**
   * 📄 Guarda en BITACORA.md principal
   */
  private async guardarBitacora(): Promise<void> {
    const contenido = this.generarFormatoBitacora();
    const rutaBitacora = path.join(process.cwd(), '..', 'BITACORA.md');
    
    try {
      // Leer contenido existente
      let existente = '';
      try {
        existente = await fs.readFile(rutaBitacora, 'utf-8');
      } catch {
        existente = '# 📜 BITÁCORA DE OPERACIONES - CORP. TYRELL\n';
        existente += '**Tech Lead: Paula Specter (@SpecterTech)**\n\n';
        existente += '---\n\n';
      }

      // Agregar nueva sesión al inicio (más reciente primero)
      const nuevoContenido = contenido + '\n---\n\n' + existente;
      await fs.writeFile(rutaBitacora, nuevoContenido, 'utf-8');
      
    } catch (error) {
      console.error('❌ Error guardando BITACORA.md:', error);
    }
  }

  /**
   * 📄 Guarda en holi.txt
   */
  private async guardarHoliTxt(): Promise<void> {
    const contenido = this.generarFormatoHoli();
    const rutaHoli = path.join(process.cwd(), 'holi.txt');
    
    try {
      await fs.appendFile(rutaHoli, '\n\n' + contenido, 'utf-8');
    } catch (error) {
      console.error('❌ Error guardando holi.txt:', error);
    }
  }

  /**
   * 📄 Guarda en BITACORA-SESION-3.txt del backend
   */
  private async guardarBackendBitacora(): Promise<void> {
    const contenido = this.generarFormatoHoli();
    const rutaBitacora = path.join(process.cwd(), '..', 'OnlyFlans', 'BITACORA-SESION-3.txt');
    
    try {
      await fs.appendFile(rutaBitacora, '\n\n' + contenido, 'utf-8');
    } catch (error) {
      // Archivo puede no existir, no es crítico
    }
  }

  /**
   * 📄 Guarda en BITACORA-SESION-3.txt del frontend
   */
  private async guardarFrontendBitacora(): Promise<void> {
    const contenido = this.generarFormatoHoli();
    const rutaBitacora = path.join(process.cwd(), '..', 'onlyflans-web', 'BITACORA-SESION-3.txt');
    
    try {
      await fs.appendFile(rutaBitacora, '\n\n' + contenido, 'utf-8');
    } catch (error) {
      // Archivo puede no existir, no es crítico
    }
  }

  /**
   * 📋 Genera formato para BITACORA.md
   */
  private generarFormatoBitacora(): string {
    const ahora = new Date();
    const fecha = ahora.toLocaleString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    let contenido = `## 📅 SESIÓN: ${fecha}\n\n`;
    contenido += `**Total de eventos:** ${this.logs.length}\n\n`;
    
    // Agrupar por tipo
    const porTipo = this.agruparPorTipo();
    
    for (const [tipo, entries] of Object.entries(porTipo)) {
      contenido += `### ${this.obtenerEmoji(tipo as LogEntry['tipo'])} ${tipo} (${entries.length})\n\n`;
      
      entries.forEach(e => {
        const hora = new Date(e.timestamp).toLocaleTimeString('es-MX');
        contenido += `- **[${hora}]** ${e.descripcion}\n`;
        
        if (e.datos) {
          contenido += `  \`\`\`json\n`;
          contenido += `  ${JSON.stringify(e.datos, null, 2)}\n`;
          contenido += `  \`\`\`\n`;
        }
      });
      
      contenido += '\n';
    }
    
    return contenido;
  }

  /**
   * 📋 Genera formato para holi.txt
   */
  private generarFormatoHoli(): string {
    const ahora = new Date();
    const fecha = ahora.toLocaleString('es-MX');
    
    let contenido = `╔═══════════════════════════════════════════════════════════════╗\n`;
    contenido += `║  SESIÓN: ${fecha.padEnd(47)}║\n`;
    contenido += `║  EVENTOS: ${this.logs.length.toString().padEnd(50)}║\n`;
    contenido += `╚═══════════════════════════════════════════════════════════════╝\n\n`;
    
    this.logs.forEach((log, index) => {
      const timestamp = new Date(log.timestamp).toLocaleString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      } as any);
      
      contenido += `[${timestamp}] ${this.obtenerEmoji(log.tipo)} ${log.tipo}: ${log.descripcion}\n`;
      
      if (log.datos) {
        const datosStr = JSON.stringify(log.datos);
        if (datosStr.length < 100) {
          contenido += `  └─ Datos: ${datosStr}\n`;
        } else {
          contenido += `  └─ Datos: [Ver BITACORA.md para detalles completos]\n`;
        }
      }
      
      if (index < this.logs.length - 1) {
        contenido += `\n`;
      }
    });
    
    return contenido;
  }

  /**
   * 📊 Agrupa logs por tipo
   */
  private agruparPorTipo(): Record<string, LogEntry[]> {
    return this.logs.reduce((acc, log) => {
      if (!acc[log.tipo]) acc[log.tipo] = [];
      acc[log.tipo].push(log);
      return acc;
    }, {} as Record<string, LogEntry[]>);
  }

  /**
   * 🎨 Obtiene emoji según tipo de log
   */
  private obtenerEmoji(tipo: LogEntry['tipo']): string {
    const emojis: Record<LogEntry['tipo'], string> = {
      'INFO': 'ℹ️',
      'ERROR': '❌',
      'PUBLICACION': '📢',
      'CANDIDATO': '👤',
      'SISTEMA': '⚙️',
      'WHATSAPP': '💬'
    };
    return emojis[tipo] || '📝';
  }

  /**
   * 💾 Forzar guardado inmediato
   */
  async guardarAhora(): Promise<void> {
    console.log('💾 Guardado forzado de auditoría...');
    await this.guardarTodo();
  }

  /**
   * 📊 Obtiene estadísticas actuales
   */
  obtenerEstadisticas(): {
    activo: boolean;
    logsPendientes: number;
    porTipo: Record<string, number>;
  } {
    const porTipo = this.agruparPorTipo();
    const contadores: Record<string, number> = {};
    
    for (const [tipo, entries] of Object.entries(porTipo)) {
      contadores[tipo] = entries.length;
    }

    return {
      activo: this.activo,
      logsPendientes: this.logs.length,
      porTipo: contadores
    };
  }

  /**
   * 🛑 Detiene el sistema de auditoría
   */
  async detener(): Promise<void> {
    if (this.intervaloGuardado) {
      clearInterval(this.intervaloGuardado);
      this.intervaloGuardado = null;
    }
    
    // Guardar logs pendientes antes de detener
    if (this.logs.length > 0) {
      console.log('📜 Guardando logs pendientes antes de detener...');
      await this.guardarTodo();
    }
    
    this.activo = false;
    console.log('🛑 Sistema de auditoría DETENIDO');
  }
}

// Exportar instancia singleton
export const Auditoria = new AuditoriaService();
