/**
 * Servicio para simular comportamiento humano en mensajes WhatsApp.
 * Evita patrones detectables que causen bano de cuenta personal.
 */

export const ComportamientoHumano = {
  /**
   * Pausa de escritura realista.
   * Varia entre 2-8 segundos por mensaje típico.
   */
  async pausaEscritura(longitudTexto: number = 100): Promise<void> {
    // ~50ms por carácter, más algo aleatorio
    const tiempoBase = (longitudTexto / 50) * 1000;
    const variacion = Math.random() * 3000 - 1500; // -1500 a +1500ms
    const tiempoTotal = Math.max(1000, tiempoBase + variacion);

    return new Promise((resolve) => setTimeout(resolve, tiempoTotal));
  },

  /**
   * Pausa entre mensajes consecutivos.
   * Entre 3-15 segundos.
   */
  async pausaInterMensajes(): Promise<void> {
    const tiempoMs = Math.random() * 12000 + 3000; // 3-15 segundos
    return new Promise((resolve) => setTimeout(resolve, tiempoMs));
  },

  /**
   * Indica que el bot está escribiendo.
   * Simula el "escribiendo..." de WhatsApp.
   */
  async mostrarIndicadorEscritura(duracionMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, duracionMs));
  },

  /**
   * Genera variaciones de texto para evitar patrones.
   * Ejemplo: "Hola" → "Hola", "Hi", "Buenas"
   */
  generarVariante(templateMensaje: string): string {
    const variaciones: { [key: string]: string[] } = {
      'SALUDO_INICIO': ['Hola', 'Buenas', 'Buen día', 'Qué tal'],
      'PREGUNTA_NOMBRE': ['¿Cuál es tu nombre?', '¿Tu nombre?', '¿Cómo te llamas?'],
      'PREGUNTA_EDAD': ['¿Qué edad tienes?', '¿Cuántos años tienes?', '¿Tu edad?'],
      'PREGUNTA_COLONIA': ['¿En qué colonia vives?', '¿De qué colonia eres?', '¿Dónde está tu domicilio?'],
      'RESPUESTA_POSITIVA': ['Perfecto', 'Excelente', 'Genial', 'Okay, está bien'],
      'RESPUESTA_NEGATIVA': ['Entendido', 'Dale', 'No hay problema', 'Bueno'],
      'DESPEDIDA': ['Saludos', 'Hasta luego', 'Cuidate', 'Nos vemos'],
    };

    let resultado = templateMensaje;
    for (const [clave, opciones] of Object.entries(variaciones)) {
      if (resultado.includes(clave)) {
        const seleccion = opciones[Math.floor(Math.random() * opciones.length)];
        resultado = resultado.replace(clave, seleccion);
      }
    }

    return resultado;
  },

  /**
   * Simula "escribiendo..." con pausas aleatorias.
   * Puede tener "errores" que se corrigen (backspace).
   */
  async escribirConPausas(texto: string, callback?: (caracter: string) => Promise<void>): Promise<void> {
    for (let i = 0; i < texto.length; i++) {
      // 10% probabilidad de "error" (pausa extra)
      if (Math.random() < 0.1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const tiempoCaracter = Math.random() * 100 + 50; // 50-150ms por carácter
      await new Promise((resolve) => setTimeout(resolve, tiempoCaracter));

      if (callback) {
        await callback(texto[i]);
      }
    }
  },

  /**
   * Pausa anti-ban: evita enviar demasiados mensajes en poco tiempo.
   * Respeta límites realistas.
   */
  async pausaAntiBan(cantidadMensajesEnviadosPorHora: number = 5): Promise<void> {
    // Si ya envió 5+ mensajes esta hora, esperar más tiempo
    if (cantidadMensajesEnviadosPorHora >= 5) {
      const tiempoMs = Math.random() * 30000 + 20000; // 20-50 segundos
      return new Promise((resolve) => setTimeout(resolve, tiempoMs));
    }

    return this.pausaInterMensajes();
  },

  /**
   * Emoji ocasional (pero no exagerado).
   * Un emoji cada 2-3 mensajes.
   */
  agregarEmojiOcasional(texto: string): string {
    const probabilidad = 0.3; // 30% de probabilidad
    if (Math.random() < probabilidad) {
      const emojis = ['👍', '😊', '✅', '👌', '🙌', '😄'];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      return `${texto} ${emoji}`;
    }
    return texto;
  },
};
