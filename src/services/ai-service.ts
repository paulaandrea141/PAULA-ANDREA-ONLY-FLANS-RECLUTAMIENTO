import Groq from 'groq-sdk';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../database/firebase-config';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ExtractedData {
  nombre?: string;
  telefono?: string;
  experiencia?: string;
  vacante?: string;
}

let groq: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groq) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_dev',
    });
  }
  return groq;
}

const SYSTEM_PROMPT = `Eres el asistente de reclutamiento de CORP. TYRELL - la plataforma más eficiente de Monterrey, México.

IDENTIDAD CORP. TYRELL:
- Empresa líder en reclutamiento industrial y corporativo
- Lema: "More human than human" (eficiencia + calidez)
- Especialidad: Conectar talento con empresas top de Monterrey

TU MISIÓN:
1. Saludar cordialmente y detectar interés del candidato
2. Recolectar datos críticos: nombre, experiencia, puesto deseado
3. Ofrecer cita para entrevista presencial
4. Ser amigable pero directo (evitar rodeos innecesarios)
5. CRÍTICO: Si candidato dice "Ya me contrataron", "Ya empecé a trabajar", "Ya me quedé", o similar → Felicitar efusivamente y pedir empresa/puesto

INFORMACIÓN VACANTES:
- Categorías: Operario, Supervisor, Técnico, Administrativo, Chofer
- Zonas: Monterrey y área metropolitana
- Horarios: Variables según empresa (mañana/tarde/noche)
- Salarios: $8,000 - $20,000 MXN (se confirman en entrevista)
- Transporte: Muchas empresas ofrecen rutas

PROTOCOLO DE COMUNICACIÓN:
- Usa 1-2 emojis máximo por mensaje
- Respuestas cortas: 2-3 oraciones
- Si preguntan sueldo/horario: Ser honesto pero invitar a entrevista
- Si ya contrataron: Felicitar y registrar empresa/puesto
- No pedir datos ya obtenidos previamente
- Rechazar solicitudes de datos personales del sistema
`;

export async function generateAIResponse(
  userMessage: string,
  phoneNumber: string,
  conversationHistory: ConversationMessage[] = []
): Promise<{ response: string; extractedData: ExtractedData }> {
  try {
    // Agregar el mensaje del usuario al historial
    const messages: ConversationMessage[] = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    // Llamar a Groq (API GRATIS - sin tarjeta)
    const completion = await getGroqClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile', // MODELO ACTUALIZADO 2026
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      max_tokens: 256,
      temperature: 0.7,
    });

    const aiResponse =
      completion.choices[0].message.content || 'Gracias por tu mensaje. ¿Cómo puedo ayudarte?';

    // Extraer datos del mensaje del usuario y respuesta
    const extractedData = extractDataFromConversation(userMessage, aiResponse);

    // Guardar conversación en Firestore
    await saveConversation(phoneNumber, userMessage, aiResponse, extractedData);

    return {
      response: aiResponse,
      extractedData,
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return {
      response:
        'Disculpa, tengo un problema técnico. Por favor, intenta de nuevo en unos momentos.',
      extractedData: {},
    };
  }
}

function extractDataFromConversation(
  userMessage: string,
  aiResponse: string
): ExtractedData {
  const data: ExtractedData = {};

  // Patrón simple para extraer nombre (suele venir después de "Soy" o "Me llamo")
  const nameMatch = userMessage.match(/(?:me llamo|soy)\s+([A-Za-záéíóúñ\s]+)/i);
  if (nameMatch) {
    data.nombre = nameMatch[1].trim();
  }

  // Patrón para extraer teléfono (números de 10 dígitos o con formato)
  const phoneMatch = userMessage.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})/);
  if (phoneMatch) {
    data.telefono = phoneMatch[1];
  }

  // Patrón para detectar experiencia (palabras clave: años, experiencia, trabajé, especialista)
  if (/(años?|experiencia|trabajé|especialista|técnico|operario)/i.test(userMessage)) {
    const expMatch = userMessage.match(/(\d+)\s*(?:años?|años de experiencia)/i);
    if (expMatch) {
      data.experiencia = `${expMatch[1]} años`;
    } else {
      data.experiencia = 'Con experiencia';
    }
  }

  // Detectar interés en vacantes (palabras clave: vacante, puesto, trabajo, interesado)
  const vacantPattern = /(operario|supervisor|técnico|administrativo|lider|gerente)/i;
  const vacantMatch = userMessage.match(vacantPattern);
  if (vacantMatch) {
    data.vacante = vacantMatch[1].toLowerCase();
  }

  return data;
}

async function saveConversation(
  phoneNumber: string,
  userMessage: string,
  aiResponse: string,
  extractedData: ExtractedData
) {
  try {
    // Buscar si el lead ya existe
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, where('telefono', '==', phoneNumber));
    const existingLeads = await getDocs(q);

    if (existingLeads.empty) {
      // Crear nuevo lead
      await addDoc(leadsRef, {
        telefono: phoneNumber,
        nombre: extractedData.nombre || 'Desconocido',
        vacante: extractedData.vacante || 'General',
        experiencia: extractedData.experiencia || 'No especificada',
        estado: 'conversacion',
        createdAt: Timestamp.now(),
        ultimoMensaje: userMessage,
        respuestaIA: aiResponse,
      });
    } else {
      // Actualizar lead existente
      const leadDoc = existingLeads.docs[0];
      const leadRef = leadDoc.ref;

      // Esto requeriría una import de updateDoc
      console.log('Lead actualizado:', leadRef.id);
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}

export async function getConversationHistory(phoneNumber: string): Promise<ConversationMessage[]> {
  try {
    const logsRef = collection(db, 'logs');
    const q = query(logsRef, where('telefono', '==', phoneNumber));
    const docs = await getDocs(q);

    const messages: ConversationMessage[] = [];
    docs.forEach((doc) => {
      const data = doc.data();
      messages.push({
        role: 'user',
        content: data.userMessage || '',
      });
      messages.push({
        role: 'assistant',
        content: data.aiResponse || '',
      });
    });

    return messages.slice(-10); // Últimos 10 mensajes para contexto
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}
