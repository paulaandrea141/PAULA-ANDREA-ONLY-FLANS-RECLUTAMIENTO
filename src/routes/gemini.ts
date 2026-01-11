import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// 🧠 Instanciación lazy de Gemini
let gemini: GoogleGenerativeAI | null = null;

function getGeminiInstance() {
  if (!gemini && process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return gemini;
}

/**
 * 💎 POST /api/gemini/chat
 * Chat directo con Gemini IA desde el Dashboard
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { mensaje, contexto } = req.body;

    if (!mensaje || mensaje.trim() === '') {
      return res.json({
        success: false,
        error: 'Mensaje vacío',
      });
    }

    const instance = getGeminiInstance();
    if (!instance) {
      return res.json({
        success: false,
        error: 'GEMINI_API_KEY no configurada',
      });
    }

    console.log(`💎 GEMINI CHAT: Paula pregunta: ${mensaje.substring(0, 50)}...`);

    const model = instance.getGenerativeModel({ model: 'gemini-pro' });

    const systemPrompt = `Eres el asistente ejecutivo personal de Paula Specter, CEO de CORP. TYRELL.

CONTEXTO ACTUAL DE LA ASPIRADORA 3000:
${contexto}

TU ROL:
- Responde como un ejecutivo senior experimentado
- Sé directo, conciso y profesional
- Usa datos del contexto para dar insights valiosos
- Si Paula pregunta sobre vacantes, analiza los datos succionados
- Si pregunta estrategia, da recomendaciones basadas en los datos
- Nunca inventes información que no esté en el contexto

ESTILO:
- Profesional pero cercano
- Usa emojis de negocios cuando sea apropiado (📊 💼 📈)
- Máximo 3-4 párrafos por respuesta`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: systemPrompt + '\n\nUsuario: ' + mensaje,
            },
          ],
        },
      ],
    });

    const respuesta =
      result.response.text() || 'Sin respuesta de Gemini';

    console.log(`✅ GEMINI CHAT: Respuesta generada (${respuesta.length} caracteres)`);

    return res.json({
      success: true,
      respuesta,
    });
  } catch (error: any) {
    console.error('❌ GEMINI CHAT: Error:', error);
    return res.json({
      success: false,
      error: error.message || 'Error al conectar con Gemini',
    });
  }
});

/**
 * 💎 POST /api/gemini/analizar
 * Análisis automático de mensajes de jefecito con Gemini
 */
router.post('/analizar', async (req: Request, res: Response) => {
  try {
    const { mensaje, autor } = req.body;

    const instance = getGeminiInstance();
    if (!instance) {
      return res.json({
        success: false,
        error: 'GEMINI_API_KEY no configurada',
      });
    }

    const model = instance.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Analiza si este mensaje contiene información sobre una VACANTE DE EMPLEO.

Mensaje de ${autor}: "${mensaje}"

IMPORTANTE: Responde SIEMPRE con un JSON válido (sin markdown, sin comillas invertidas):
{
  "esVacante": true/false,
  "puesto": "nombre del puesto" o null,
  "confianza": 0-100,
  "razon": "breve explicación"
}`;

    const result = await model.generateContent(prompt);
    const respuestaJSON = result.response.text() || '{}';

    // Limpiar respuesta si tiene markdown
    const jsonLimpio = respuestaJSON
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const analisis = JSON.parse(jsonLimpio);

    console.log(`💎 GEMINI AUTO: ${analisis.esVacante ? '🎯 VACANTE DETECTADA' : '📝 Mensaje normal'}`);

    return res.json({
      success: true,
      esVacante: analisis.esVacante,
      puesto: analisis.puesto,
      confianza: analisis.confianza,
      razon: analisis.razon,
    });
  } catch (error: any) {
    console.error('❌ GEMINI AUTO: Error:', error);
    return res.json({
      success: false,
      error: error.message || 'Error al analizar mensaje',
    });
  }
});

export { router as geminiRouter };
