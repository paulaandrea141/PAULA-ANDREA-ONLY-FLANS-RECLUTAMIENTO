// Esquema de Firestore para Only Flans

export interface Vacante {
  id: string;
  empresa: string;
  puesto: string;
  salario: number;
  bonificacion?: number;
  requisitos: {
    genero?: 'M' | 'F' | 'Cualquiera';
    edadMin?: number;
    edadMax?: number;
    formacion?: string;
    experiencia?: string;
    restricciones?: string[]; // ej: "Sin tatuajes en cara/cuello"
  };
  colonias: string[]; // Colonias cercanas donde operar
  horario: {
    horaInicio?: string; // HH:mm
    horaFin?: string;
    jornadaTipo: 'Matutina' | 'Vespertina' | 'Mixta';
  };
  induccion?: {
    obligatoria: boolean;
    hora?: string; // HH:mm
    ubicacion?: string;
  };
  ruta?: string; // Para logística: "Santa María", "Ciénega"
  estado: 'Activa' | 'Pausada' | 'Cerrada';
  candidatosAsignados: number;
  fechaCreacion: number; // timestamp
  fechaActualizacion: number;
}

export interface Candidato {
  id: string;
  nombre: string;
  telefono: string;
  whatsapp: string;
  edad: number;
  genero: 'M' | 'F' | 'Otro';
  colonia: string;
  ciudad: string;
  formacion: string; // Primaria, Secundaria, Preparatoria, Licenciatura
  experiencia?: string;
  restricciones: {
    tatuajesVisibles: boolean;
    tatuajesCaraOCuello: boolean;
  };
  etapa: 'Prospecto' | 'Calificado' | 'Asignado' | 'Inductado' | 'Contratado' | 'Rechazado';
  vacanteAsignada?: string; // ID de la vacante
  empresa?: string; // Empresa a la que está asignado
  enlace?: {
    messageId: string;
    timestamp: number;
    estado: 'Enviado' | 'Leído' | 'Respondido' | 'Ignorado';
  };
  conversacionHistorico: Array<{
    autor: 'Bot' | 'Candidato';
    mensaje: string;
    timestamp: number;
    tipo: 'Texto' | 'Imagen' | 'Link';
  }>;
  score?: number; // Puntuación de compatibilidad (0-100)
  fechaContacto: number;
  fechaActualizacion: number;
}

export interface RutaLogistica {
  id: string;
  nombre: string; // "Santa María", "Ciénega"
  colonias: string[];
  descripcion: string;
  vacanteAsociada: string;
  estado: 'Activa' | 'Completada' | 'Pausada';
  fechaCreacion: number;
}

export interface ConfiguracionBot {
  id: string;
  telefonoWhatsApp: string; // Número con sesión activa (Baileys)
  pausasEscritura: {
    min: number; // milisegundos
    max: number;
  };
  variacionesTexto: boolean; // Para evitar patrones detectables
  horarioOperacion: {
    inicioAM: string;
    finAM: string;
    inicioVespertino?: string;
    finVespertino?: string;
  };
  limites: {
    mensajesPorHora: number;
    candidatosNuevosPorDia: number;
  };
  estado: 'Activo' | 'Pausado' | 'Mantenimiento';
}

export interface RegistroInteraccion {
  id: string;
  telefonoCandidato: string;
  telefonoBot: string;
  vacanteId: string;
  tipMensaje: 'Atracción' | 'Calificación' | 'Asignación' | 'Inducción' | 'Seguimiento';
  contenido: string;
  timestamp: number;
  exitoso: boolean;
  razonFallo?: string;
}

// ===== SCHEMA CRM DE LEADS (NUEVO) =====
export interface Lead {
  id: string;
  // DATA PERSONAL
  nombre: string;
  telefono: string;
  edad: number;
  colonia: string;
  // ESTADO DEL LEAD
  status: 'nuevo' | 'filtrado' | 'citado' | 'no_apto';
  // INFORMACIÓN DE VACANTE
  vacanteId?: string;
  vacanteNombre?: string;
  vacanteSugerida?: string; // Nombre de la vacante sugerida
  // PAPELERÍA Y TRANSPORTE
  papeleríaCompleta: boolean;
  rutaTransporteSabe: boolean; // Conoce su ruta de transporte
  // SEGUIMIENTO
  lastContact: number; // timestamp del último contacto
  proximoContacto?: number; // timestamp del próximo contacto programado
  notes: string; // Notas del agente / observaciones
  conversacionHistorico: Array<{
    autor: 'Bot' | 'Agente';
    mensaje: string;
    timestamp: number;
    tipo: 'Texto' | 'Imagen' | 'Nota';
  }>;
  // METADATOS
  fuenteLead: 'WhatsApp' | 'FacebookAds' | 'Formulario' | 'Manual';
  candidatoId?: string; // Relación con colección Candidato si existe
  score?: number; // Puntuación de calidad del lead (0-100)
  fechaCreacion: number;
  fechaActualizacion: number;
}
