import { VacanteService } from '../services/vacante-service';
import { Vacante } from '../database/schema';

/**
 * Script de inicialización: Cargar vacantes actuales en Firestore
 * Ejecutar una sola vez o cuando se actualicen vacantes
 */

export const VacantesIniciales: Omit<Vacante, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'candidatosAsignados'>[] = [
  {
    empresa: 'DAMAR (Juguetería)',
    puesto: 'Vendedor/Almacenista',
    salario: 2100,
    bonificacion: 600,
    requisitos: {
      genero: 'Cualquiera',
      edadMin: 18,
      edadMax: 55,
      formacion: 'Secundaria',
      restricciones: ['Sin tatuajes en cara/cuello'],
    },
    colonias: ['Centro', 'Macroplaza', 'San Jerónimo', 'Barrio Antiguo'],
    horario: {
      horaInicio: '09:00',
      horaFin: '18:00',
      jornadaTipo: 'Matutina',
    },
    induccion: {
      obligatoria: true,
      hora: '06:30',
      ubicacion: 'Tienda DAMAR - Centro',
    },
    estado: 'Activa',
  },
  {
    empresa: 'ILSAN',
    puesto: 'Operario Manufactura',
    salario: 2288,
    bonificacion: 0,
    requisitos: {
      genero: 'F',
      edadMin: 18,
      edadMax: 40,
      formacion: 'Secundaria',
    },
    colonias: ['Apodaca', 'San Nicolás', 'Escobedo', 'Santa Catarina'],
    horario: {
      horaInicio: '06:00',
      horaFin: '14:00',
      jornadaTipo: 'Matutina',
    },
    estado: 'Activa',
  },
  {
    empresa: 'MAGNEKON / BREMBO',
    puesto: 'Técnico Manufactura',
    salario: 2500,
    bonificacion: 300,
    requisitos: {
      genero: 'M',
      edadMin: 21,
      edadMax: 50,
      formacion: 'Preparatoria',
      experiencia: '2+ años en manufactura',
    },
    colonias: ['Escobedo', 'Apodaca', 'García', 'Industrial'],
    horario: {
      horaInicio: '07:00',
      horaFin: '16:00',
      jornadaTipo: 'Matutina',
    },
    estado: 'Activa',
  },
  {
    empresa: 'Logística - Ruta Santa María',
    puesto: 'Repartidor',
    salario: 1800,
    bonificacion: 200,
    requisitos: {
      genero: 'M',
      edadMin: 20,
      edadMax: 45,
      formacion: 'Primaria',
    },
    colonias: ['Santa María', 'Juárez', 'Pesquería'],
    horario: {
      horaInicio: '08:00',
      horaFin: '17:00',
      jornadaTipo: 'Matutina',
    },
    ruta: 'Santa María',
    estado: 'Activa',
  },
  {
    empresa: 'Logística - Ruta Ciénega',
    puesto: 'Repartidor',
    salario: 1800,
    bonificacion: 200,
    requisitos: {
      genero: 'M',
      edadMin: 20,
      edadMax: 45,
      formacion: 'Primaria',
    },
    colonias: ['Ciénega', 'Apodaca', 'Pesquería'],
    horario: {
      horaInicio: '08:00',
      horaFin: '17:00',
      jornadaTipo: 'Matutina',
    },
    ruta: 'Ciénega',
    estado: 'Activa',
  },
];

export const inicializarVacantes = async (): Promise<void> => {
  console.log('🚀 Inicializando vacantes en Firestore...');

  for (const vacante of VacantesIniciales) {
    try {
      const id = await VacanteService.crearVacante(vacante);
      console.log(`✅ Vacante creada: ${vacante.empresa} (${id})`);
    } catch (error) {
      console.error(`❌ Error creando vacante ${vacante.empresa}:`, error);
    }
  }

  console.log('✨ Inicialización completada');
};

// Exportar para ejecución manual
export default inicializarVacantes;
