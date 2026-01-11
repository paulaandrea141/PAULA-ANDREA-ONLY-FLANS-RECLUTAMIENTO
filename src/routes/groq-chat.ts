import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';

const router = Router();

// 🔥 Instanciación lazy de Groq para evitar errores de env vars
let groq: Groq | null = null;

function getGroqInstance() {
  if (!groq && process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
}

/**
 * 🤖 POST /api/groq/chat
 * Chat directo con Groq IA desde el Dashboard
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

    console.log(`💬 GROQ CHAT: Paula pregunta: ${mensaje.substring(0, 50)}...`);

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
- Máximo 3-4 párrafos por respuesta
`;

    const completion = await getGroqInstance()!.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: mensaje },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1000,
    });

    const respuesta = completion.choices[0]?.message?.content || 'Sin respuesta';

    console.log(`✅ GROQ CHAT: Respuesta generada (${respuesta.length} caracteres)`);

    return res.json({
      success: true,
      respuesta,
    });
  } catch (error: any) {
    console.error('❌ GROQ CHAT: Error:', error);
    return res.json({
      success: false,
      error: error.message || 'Error al conectar con Groq',
    });
  }
});

/**
 * 🤖 POST /api/groq/analizar
 * Análisis automático de mensajes de jefecito para detectar vacantes
 */
router.post('/analizar', async (req: Request, res: Response) => {
  try {
    const { mensaje, autor, timestamp } = req.body;

    if (!mensaje || mensaje.trim() === '') {
      return res.json({ success: false, error: 'Mensaje vacío' });
    }

    console.log(`🔍 GROQ AUTO: Analizando mensaje de ${autor}...`);

    const systemPrompt = `Eres un detector de vacantes laborales experto. Analiza el siguiente mensaje de WhatsApp y determina si contiene información de vacante laboral.

CRITERIOS PARA DETECTAR VACANTE:
- Menciona puesto o cargo
- Habla de requisitos (edad, experiencia, escolaridad)
- Menciona salario o rango salarial
- Describe actividades laborales
- Menciona empresa contratante
- Ofrece trabajo o empleo

RESPONDE SOLO EN JSON:
{
  "esVacante": true/false,
  "puesto": "nombre del puesto" o null,
  "confianza": 0-100,
  "razon": "breve explicación"
}`;

    const completion = await getGroqInstance()!.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: mensaje },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const respuestaJSON = completion.choices[0]?.message?.content || '{}';
    const analisis = JSON.parse(respuestaJSON);

    console.log(`✅ GROQ AUTO: ${analisis.esVacante ? '🎯 VACANTE DETECTADA' : '📝 Mensaje normal'}`);

    return res.json({
      success: true,
      ...analisis,
      mensaje,
      autor,
      timestamp,
    });
  } catch (error: any) {
    console.error('❌ GROQ AUTO: Error:', error);
    return res.json({
      success: false,
      error: error.message || 'Error al analizar mensaje',
    });
  }
});

export { router as groqChatRouter };
