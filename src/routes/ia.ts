import express, { type Request, type Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const iaRouter = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'AIzaSyAFVJZYf-BZREtkWpYJo35-PrG6ZlXTcEc');

/**
 * 🧠 POST /analizar - Analizar mensaje con IA (Gemini)
 * Retorna análisis en tiempo real para cada mensaje
 */
iaRouter.post('/analizar', async (req: Request, res: Response) => {
  try {
    const { contenido, contexto = '' } = req.body;

    if (!contenido) {
      return res.status(400).json({ error: 'contenido requerido' });
    }

    console.log('🧠 Analizando con IA:', contenido);

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro-latest',
      systemInstruction: `Eres un asistente especializado en análisis de candidatos para reclutamiento. 
Analiza cada mensaje brevemente y extrae:
1. Sentimiento (positivo/neutro/negativo)
2. Palabras clave (máx 3)
3. Recomendación (Entrevistar/Seguimiento/Descartar)
Responde SOLO en JSON válido sin explicaciones.`
    });

    const prompt = `Analiza este mensaje de candidato: "${contenido}" ${contexto ? `Contexto: ${contexto}` : ''}`;

    const result = await model.generateContent(prompt);
    const respuesta = result.response.text();

    // Intentar parsear como JSON
    let analisis = { raw: respuesta };
    try {
      analisis = JSON.parse(respuesta);
    } catch {
      // Si no es JSON válido, intentar extraerlo
      const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analisis = JSON.parse(jsonMatch[0]);
      }
    }

    return res.json({
      success: true,
      contenido,
      analisis,
    });
  } catch (error) {
    console.error('❌ Error en análisis IA:', error);
    return res.status(500).json({ error: 'Error analizando con IA' });
  }
});

/**
 * 🔮 POST /predecir-candidato - Análisis completo de candidato
 */
iaRouter.post('/predecir-candidato', async (req: Request, res: Response) => {
  try {
    const { mensajes } = req.body;

    if (!mensajes || !Array.isArray(mensajes)) {
      return res.status(400).json({ error: 'mensajes array requerido' });
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro-latest',
      systemInstruction: `Eres un experto en selección de candidatos. 
Basándote en el historial de mensajes, proporciona un perfil del candidato con:
- Puntuación (0-100)
- Fortalezas (máx 3)
- Debilidades (máx 3)
- Recomendación final (Contratar/Entrevista/Descartar)
Responde SOLO en JSON.`
    });

    const conversacion = mensajes.map((m: any) => `${m.autor}: ${m.contenido}`).join('\n');
    const prompt = `Historial de conversación:\n${conversacion}`;

    const result = await model.generateContent(prompt);
    const respuesta = result.response.text();

    let prediccion = { raw: respuesta };
    try {
      prediccion = JSON.parse(respuesta);
    } catch {
      const jsonMatch = respuesta.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prediccion = JSON.parse(jsonMatch[0]);
      }
    }

    return res.json({
      success: true,
      prediccion,
    });
  } catch (error) {
    console.error('❌ Error en predicción:', error);
    return res.status(500).json({ error: 'Error en predicción' });
  }
});
