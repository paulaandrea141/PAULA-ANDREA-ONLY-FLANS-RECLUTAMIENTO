import Groq from 'groq-sdk';

/**
 * 🔥 SERVICIO DE VISIÓN OCR - CORP. TYRELL
 * Tech Lead: Paula Specter (@SpecterTech)
 * 
 * Usa Llama 3.2 Vision (11B) para leer capturas de WhatsApp
 * 100% GRATIS con Groq
 */

let groq: Groq | null = null;

function getGroqClient(): Groq {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('❌ GROQ_API_KEY no configurada');
    }
    groq = new Groq({ apiKey });
  }
  return groq;
}

interface VisionResult {
  textoExtraido: string;
  confianza: number;
  errores: string[];
}

/**
 * ⚡ Extrae texto de imagen usando Llama Vision
 */
export async function extraerTextoDeImagen(
  imagenBase64: string
): Promise<VisionResult> {
  try {
    console.log('📸 VISION: Procesando imagen con Llama 3.2 Vision...');

    const completion = await getGroqClient().chat.completions.create({
      model: 'llama-3.2-11b-vision-preview', // 🔥 MODELO GRATIS CON VISIÓN
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Eres un experto en extraer información de capturas de WhatsApp.

MISIÓN: Lee esta captura y extrae TODO el texto que veas.

REGLAS:
1. Transcribe EXACTAMENTE lo que ves (typos incluidos)
2. Mantén el formato si hay listas o viñetas
3. Si hay números de teléfono, inclúyelos
4. Si ves emojis, transcríbelos como texto (ej: ✅ = "check")
5. Ignora la interfaz de WhatsApp (hora, señal, batería)

IMPORTANTE: Solo devuelve el texto extraído, sin comentarios adicionales.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imagenBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.1, // Muy determinista para OCR
    });

    const textoExtraido = completion.choices[0]?.message?.content || '';

    if (!textoExtraido.trim()) {
      return {
        textoExtraido: '',
        confianza: 0,
        errores: ['No se pudo extraer texto de la imagen'],
      };
    }

    console.log(`✅ VISION: Texto extraído (${textoExtraido.length} caracteres)`);

    return {
      textoExtraido,
      confianza: 95, // Llama Vision es muy preciso
      errores: [],
    };
  } catch (error) {
    console.error('❌ VISION: Error procesando imagen:', error);
    return {
      textoExtraido: '',
      confianza: 0,
      errores: [error instanceof Error ? error.message : 'Error desconocido'],
    };
  }
}

/**
 * 🔄 Procesa imagen y analiza con pipeline completo
 */
export async function procesarImagenCompleta(
  imagenBase64: string
): Promise<{
  exito: boolean;
  textoExtraido?: string;
  datosVacante?: any;
  error?: string;
}> {
  try {
    // Paso 1: OCR
    const resultadoVision = await extraerTextoDeImagen(imagenBase64);

    if (!resultadoVision.textoExtraido) {
      return {
        exito: false,
        error: 'No se pudo leer texto en la imagen',
      };
    }

    // Paso 2: Análisis con ingesta normal
    const { analizarTextoVacante } = await import('./ingesta-vacantes');
    const datosVacante = await analizarTextoVacante(resultadoVision.textoExtraido);

    return {
      exito: true,
      textoExtraido: resultadoVision.textoExtraido,
      datosVacante,
    };
  } catch (error) {
    console.error('❌ Error en pipeline de imagen:', error);
    return {
      exito: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

export const VisionOCRService = {
  extraerTextoDeImagen,
  procesarImagenCompleta,
};
