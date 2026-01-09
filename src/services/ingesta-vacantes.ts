import Groq from 'groq-sdk';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../database/firebase-config';

interface VacanteExtraida {
  empresa: string;
  puesto: string;
  salario: string;
  horario: string;
  rutas_transporte: string;
  requisitos: string;
  ubicacion?: string;
  beneficios?: string;
  contacto?: string;
}

interface ResultadoIngesta {
  exito: boolean;
  datos?: VacanteExtraida;
  vacanteId?: string;
  error?: string;
}

let groq: Groq | null = null;

function getGroqClient(): Groq {
  if (!groq) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_dev',
    });
  }
  return groq;
}

const PROMPT_EXTRACCION = `Eres un experto en extraer información estructurada de mensajes caóticos de WhatsApp.

Tu tarea es analizar el siguiente texto (puede estar mal escrito, con abreviaturas, errores ortográficos, etc.) y extraer TODA la información relevante sobre una VACANTE LABORAL.

CAMPOS A EXTRAER (devolver JSON válido):
{
  "empresa": "Nombre de la empresa o marca (si no está claro, poner 'No especificado')",
  "puesto": "Nombre del puesto o rol (ej: Operario, Supervisor, Chofer)",
  "salario": "Rango salarial mencionado (ej: $10,000 - $12,000, o 'A tratar' si no especifican)",
  "horario": "Horario laboral (ej: 8am-5pm, Lunes a Viernes, Turnos rotativos)",
  "rutas_transporte": "Rutas de transporte mencionadas (ej: 'Ruta desde Cumbres', 'Sin transporte')",
  "requisitos": "Lista de requisitos o habilidades necesarias (ej: 'Experiencia mínima 1 año', 'Secundaria terminada')",
  "ubicacion": "Dirección, zona o ciudad de la empresa (ej: 'Santa Catarina', 'Av. Lincoln')",
  "beneficios": "Prestaciones o beneficios mencionados (ej: 'Vales de despensa', 'IMSS', 'Comedor')",
  "contacto": "Información de contacto si se menciona (teléfono, nombre, etc.)"
}

REGLAS:
1. Si un campo no se menciona en el texto, devuelve "No especificado" o array vacío []
2. Normaliza abreviaturas: "sup" = "supervisor", "ope" = "operario", "suel" = "salario"
3. Si hay múltiples horarios o turnos, sepáralos con " / " (ej: "8-5 / 2-10")
4. Para salarios con rangos, usa formato "$10,000 - $12,000"
5. Si mencionan "urgente", "inmediato", agrégalo a requisitos
6. Devuelve SOLO el JSON válido, sin explicaciones adicionales

IMPORTANTE: El texto puede ser un caos total. Tu trabajo es encontrar ORO en el lodo.`;

/**
 * EXTRACTOR INTELIGENTE: Analiza texto caótico y extrae datos de vacante
 * 
 * @param textoOriginal - El copy/paste del jefecito (puede ser horrible)
 * @returns VacanteExtraida con todos los campos estructurados
 * 
 * Ejemplo:
 * Input: "urge operario en DAMAR sueldo 10k turno matutino ruta desde cumbres"
 * Output: { empresa: "DAMAR", puesto: "Operario", salario: "$10,000", ... }
 */
export async function analizarTextoVacante(textoOriginal: string): Promise<VacanteExtraida> {
  try {
    console.log('🔍 INGESTA: Analizando texto...', textoOriginal.slice(0, 100));

    const completion = await getGroqClient().chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: PROMPT_EXTRACCION },
        { role: 'user', content: `TEXTO A ANALIZAR:\n\n${textoOriginal}` },
      ],
      max_tokens: 1024,
      temperature: 0.3, // Baja temperatura para respuestas más precisas
      response_format: { type: 'json_object' },
    });

    const respuestaIA = completion.choices[0].message.content || '{}';
    const datosExtraidos: VacanteExtraida = JSON.parse(respuestaIA);

    console.log('✅ INGESTA: Datos extraídos exitosamente', datosExtraidos);

    return datosExtraidos;
  } catch (error) {
    console.error('❌ INGESTA: Error al analizar texto', error);
    
    // Fallback: Devolver estructura vacía pero válida
    return {
      empresa: 'No especificado',
      puesto: 'No especificado',
      salario: 'A tratar',
      horario: 'No especificado',
      rutas_transporte: 'No especificado',
      requisitos: 'No especificado',
      ubicacion: 'Monterrey',
      beneficios: 'No especificado',
      contacto: 'No especificado',
    };
  }
}

/**
 * GUARDADO AUTOMÁTICO: Crea vacante en Firebase desde datos extraídos
 * 
 * @param datos - VacanteExtraida del analizador
 * @returns ID de la vacante creada
 * 
 * Se guarda en colección 'vacantes' con estructura:
 * {
 *   titulo: string,
 *   empresa: string,
 *   descripcion: string,
 *   salario: string,
 *   ubicacion: string,
 *   estado: 'Activa' | 'Pausada' | 'Cerrada',
 *   fechaCreacion: Timestamp,
 *   candidatosAsignados: string[]
 * }
 */
export async function crearVacanteDesdeAnalisis(datos: VacanteExtraida): Promise<string> {
  try {
    // Construir descripción consolidada
    const descripcion = `
📍 Ubicación: ${datos.ubicacion || 'Monterrey'}
⏰ Horario: ${datos.horario}
🚌 Transporte: ${datos.rutas_transporte}
📋 Requisitos: ${datos.requisitos}
💰 Salario: ${datos.salario}
${datos.beneficios !== 'No especificado' ? `🎁 Beneficios: ${datos.beneficios}` : ''}
${datos.contacto !== 'No especificado' ? `📞 Contacto: ${datos.contacto}` : ''}
    `.trim();

    const nuevaVacante = {
      titulo: `${datos.puesto} - ${datos.empresa}`,
      empresa: datos.empresa,
      descripcion,
      salario: datos.salario,
      ubicacion: datos.ubicacion || 'Monterrey',
      estado: 'Activa',
      fechaCreacion: Timestamp.now(),
      candidatosAsignados: [],
      // Metadata adicional
      puesto: datos.puesto,
      horario: datos.horario,
      requisitos: datos.requisitos,
    };

    const docRef = await addDoc(collection(db, 'vacantes'), nuevaVacante);
    console.log('✅ INGESTA: Vacante creada en Firebase', docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('❌ INGESTA: Error al guardar en Firebase', error);
    throw new Error('No se pudo guardar la vacante en Firebase');
  }
}

/**
 * FLUJO COMPLETO: Analiza texto + crea vacante + devuelve resultado
 * 
 * @param textoOriginal - El caos del jefecito
 * @returns ResultadoIngesta con éxito/error y datos
 * 
 * Este es el método principal que llama el endpoint de backend.
 */
export async function procesarIngestaCompleta(textoOriginal: string): Promise<ResultadoIngesta> {
  try {
    // Paso 1: Análisis con IA
    const datosExtraidos = await analizarTextoVacante(textoOriginal);

    // Validar que al menos tenga empresa y puesto
    if (datosExtraidos.empresa === 'No especificado' && datosExtraidos.puesto === 'No especificado') {
      return {
        exito: false,
        error: 'No se pudo identificar empresa ni puesto en el texto. Intenta con más información.',
      };
    }

    // Paso 2: Guardar en Firebase
    const vacanteId = await crearVacanteDesdeAnalisis(datosExtraidos);

    return {
      exito: true,
      datos: datosExtraidos,
      vacanteId,
    };
  } catch (error: any) {
    console.error('❌ INGESTA: Error en flujo completo', error);
    return {
      exito: false,
      error: error.message || 'Error desconocido al procesar la vacante',
    };
  }
}

// Export para uso en otros módulos
export const IngestaVacantesService = {
  analizarTextoVacante,
  crearVacanteDesdeAnalisis,
  procesarIngestaCompleta,
};
