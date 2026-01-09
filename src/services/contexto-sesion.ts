/**
 * 🧠 SISTEMA DE MEMORIA DE CONTEXTO - CORP. TYRELL
 * Tech Lead: Paula Specter (@SpecterTech)
 * 
 * Permite que la IA "recuerde" la sesión actual y maneje micro-cambios
 */

interface SesionContexto {
  id: string;
  vacanteActual?: any;
  cambiosPendientes: Array<{
    campo: string;
    valorAnterior: any;
    valorNuevo: any;
    timestamp: number;
  }>;
  iniciada: number;
  ultimaActividad: number;
}

class ContextoSesionService {
  private sesiones: Map<string, SesionContexto> = new Map();
  private TIMEOUT_SESION = 30 * 60 * 1000; // 30 minutos

  /**
   * Inicia o recupera sesión
   */
  obtenerSesion(userId: string = 'jefa'): SesionContexto {
    let sesion = this.sesiones.get(userId);

    if (!sesion || Date.now() - sesion.ultimaActividad > this.TIMEOUT_SESION) {
      sesion = {
        id: userId,
        cambiosPendientes: [],
        iniciada: Date.now(),
        ultimaActividad: Date.now(),
      };
      this.sesiones.set(userId, sesion);
      console.log(`🧠 Nueva sesión iniciada para ${userId}`);
    }

    sesion.ultimaActividad = Date.now();
    return sesion;
  }

  /**
   * Guarda vacante en contexto actual
   */
  guardarVacanteActual(userId: string, vacante: any): void {
    const sesion = this.obtenerSesion(userId);
    sesion.vacanteActual = vacante;
    console.log(`💾 Vacante guardada en contexto de ${userId}`);
  }

  /**
   * Registra un micro-cambio
   */
  registrarCambio(userId: string, campo: string, valorAnterior: any, valorNuevo: any): void {
    const sesion = this.obtenerSesion(userId);
    sesion.cambiosPendientes.push({
      campo,
      valorAnterior,
      valorNuevo,
      timestamp: Date.now(),
    });
    console.log(`✏️ Cambio registrado: ${campo} de "${valorAnterior}" a "${valorNuevo}"`);
  }

  /**
   * Genera prompt con contexto para Groq
   */
  generarPromptConContexto(userId: string, comandoVoz: string): string {
    const sesion = this.obtenerSesion(userId);

    if (!sesion.vacanteActual) {
      return comandoVoz;
    }

    const contexto = `CONTEXTO ACTUAL:
Última vacante procesada:
- Empresa: ${sesion.vacanteActual.empresa}
- Puesto: ${sesion.vacanteActual.puesto}
- Salario: ${sesion.vacanteActual.salario}
- Horario: ${sesion.vacanteActual.horario}

COMANDO DE VOZ: "${comandoVoz}"

TAREA: Analiza el comando y determina si es un micro-cambio a la vacante actual.
Si menciona "sube", "cambia", "modifica", "actualiza", extrae el campo y el nuevo valor.

Responde en JSON:
{
  "tipo": "cambio" | "nueva_vacante" | "consulta",
  "campo": "<nombre_campo>",
  "valorNuevo": "<nuevo_valor>",
  "confirmacion": "<mensaje para la jefa>"
}`;

    return contexto;
  }

  /**
   * Limpia sesión
   */
  limpiarSesion(userId: string): void {
    this.sesiones.delete(userId);
    console.log(`🗑️ Sesión de ${userId} limpiada`);
  }
}

export const ContextoSesion = new ContextoSesionService();
