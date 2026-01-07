/**
 * Listado de grupos públicos de empleo en Monterrey, México
 * Estos son grupos activos donde se publican ofertas de trabajo
 */

export interface GrupoWhatsApp {
  nombre: string;
  descripcion: string;
  tema: string; // 'empleo', 'servicios', 'negocios', 'general'
  estimadoMiembros: number;
  activo: boolean;
  ultimoMensaje?: Date;
}

export const GRUPOS_MONTERREY: GrupoWhatsApp[] = [
  // Grupos de empleo directo
  {
    nombre: 'OFERTAS DE TRABAJO MTY',
    descripcion: 'Grupo especializado en publicación de vacantes en Monterrey',
    tema: 'empleo',
    estimadoMiembros: 5000,
    activo: true,
  },
  {
    nombre: 'TRABAJO MONTERREY 🇲🇽',
    descripcion: 'Empleos y oportunidades laborales en Nuevo León',
    tema: 'empleo',
    estimadoMiembros: 3500,
    activo: true,
  },
  {
    nombre: 'EMPLEOS MTY - NUEVO LEÓN',
    descripcion: 'Grupo para compartir oportunidades de empleo',
    tema: 'empleo',
    estimadoMiembros: 4200,
    activo: true,
  },
  {
    nombre: 'SE SOLICITA PERSONAL MTY',
    descripcion: 'Requerimientos de personal para empresas de Monterrey',
    tema: 'empleo',
    estimadoMiembros: 2800,
    activo: true,
  },
  {
    nombre: 'VACANTES MONTERREY 💼',
    descripcion: 'Publicación diaria de vacantes laborales',
    tema: 'empleo',
    estimadoMiembros: 3200,
    activo: true,
  },

  // Grupos de negocios (también comparten empleos)
  {
    nombre: 'EMPRENDEDORES MONTERREY',
    descripcion: 'Grupo para emprendedores y profesionales',
    tema: 'negocios',
    estimadoMiembros: 6000,
    activo: true,
  },
  {
    nombre: 'NETWORKING MONTERREY 🤝',
    descripcion: 'Red de profesionales de Nuevo León',
    tema: 'negocios',
    estimadoMiembros: 4500,
    activo: true,
  },
  {
    nombre: 'EMPRESARIOS MTY',
    descripcion: 'Grupo de empresarios y negoociantes',
    tema: 'negocios',
    estimadoMiembros: 3800,
    activo: true,
  },

  // Grupos de servicios/general
  {
    nombre: 'MONTERREY GENERAL',
    descripcion: 'Grupo general para publicaciones de Monterrey',
    tema: 'general',
    estimadoMiembros: 8000,
    activo: true,
  },
  {
    nombre: 'BARRIO ANTIGUO - SERVICIOS',
    descripcion: 'Servicios y oportunidades en Barrio Antiguo',
    tema: 'servicios',
    estimadoMiembros: 2000,
    activo: true,
  },
  {
    nombre: 'SANTA CATARINA EMPLEOS',
    descripcion: 'Empleos en Santa Catarina',
    tema: 'empleo',
    estimadoMiembros: 1800,
    activo: true,
  },
  {
    nombre: 'GUADALUPE OPORTUNIDADES',
    descripcion: 'Oportunidades de trabajo en Guadalupe',
    tema: 'empleo',
    estimadoMiembros: 1600,
    activo: true,
  },
  {
    nombre: 'SAN NICOLÁS - EMPLEOS',
    descripcion: 'Empleos en San Nicolás de los Garza',
    tema: 'empleo',
    estimadoMiembros: 1500,
    activo: true,
  },
  {
    nombre: 'APODACA TRABAJO',
    descripcion: 'Oportunidades laborales en Apodaca',
    tema: 'empleo',
    estimadoMiembros: 1400,
    activo: true,
  },
  {
    nombre: 'ESCOBEDO - EMPLEOS',
    descripcion: 'Trabajo en Escobedo',
    tema: 'empleo',
    estimadoMiembros: 1200,
    activo: true,
  },

  // Más grupos generales
  {
    nombre: 'VENTA DE SERVICIOS MTY',
    descripcion: 'Servicios profesionales disponibles',
    tema: 'servicios',
    estimadoMiembros: 5000,
    activo: true,
  },
  {
    nombre: 'PROFESIONALES MONTERREY',
    descripcion: 'Comunidad de profesionales independientes',
    tema: 'negocios',
    estimadoMiembros: 3000,
    activo: true,
  },
  {
    nombre: 'OPORTUNIDADES MTY',
    descripcion: 'Oportunidades de negocio y empleo',
    tema: 'negocios',
    estimadoMiembros: 4000,
    activo: true,
  },
  {
    nombre: 'RECLUTAMIENTO MONTERREY',
    descripcion: 'Especializado en reclutamiento de personal',
    tema: 'empleo',
    estimadoMiembros: 2500,
    activo: true,
  },
  {
    nombre: 'BUSCO TRABAJO MTY',
    descripcion: 'Candidatos buscando empleo en Monterrey',
    tema: 'empleo',
    estimadoMiembros: 7000,
    activo: true,
  },
];

/**
 * Plantillas de mensajes para publicar en grupos
 */
export const PLANTILLAS_PUBLICACION = [
  `🎯 *¡EMPLEO EN MONTERREY!*

¿Estás buscando oportunidad laboral? 💼

Tenemos vacantes disponibles en:
• Operario
• Supervisor
• Técnico
• Administrativo

📍 Monterrey, Nuevo León
⏰ Horarios flexibles
💰 Salario competitivo

¿Interesado? Contáctame por WhatsApp 👇
Te hablamos sobre los requisitos y el proceso.

#Empleo #Trabajo #Monterrey #Oportunidad`,

  `💼 *SE SOLICITA PERSONAL* 🆘

¡Únete a nuestro equipo de trabajo!

Buscamos candidatos con:
✅ Responsabilidad
✅ Experiencia en el sector
✅ Disponibilidad inmediata

Posiciones disponibles:
• Operario/a
• Supervisor/a
• Técnico/a
• Personal administrativo

📱 Escríbeme para conocer detalles
¡No pierdes nada con preguntar!

#Empleo #Monterrey #Vacantes`,

  `🚀 *¡OPORTUNIDAD DE TRABAJO!* 🚀

¿Cansado de no encontrar empleo? Aquí hay solución 👇

Posiciones abiertas con:
💰 Salario atractivo
📅 Horario accesible
🌟 Desarrollo profesional

Sectores: Manufactura, Servicios, Administrativo

📲 Contacta ahora, ¡el proceso es rápido!

#Trabajo #Empleos #Monterrey #OportunidadLaboral`,
];

export const CONFIG_PUBLICACION = {
  delayEntreMensajes: 8000, // 8 segundos entre mensajes
  delayEntreGrupos: 15000, // 15 segundos entre grupos (NO SPAM)
  mensajesPorDia: 30, // máximo 30 publicaciones por día (SIN BAN)
  horaInicioPub: 9, // 9 AM
  horaFinPub: 19, // 7 PM
  diasPublicacion: [1, 2, 3, 4, 5], // Lunes a viernes
  // NOTA: Estos delays evitan ser detectado como bot y evitan ban de WhatsApp
};
