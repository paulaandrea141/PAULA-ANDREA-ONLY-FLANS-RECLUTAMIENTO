import express, { type Request, type Response } from 'express';

export const gruposRouter = express.Router();

// 🟢 GRUPOS DEMO (Funciona YA)
const GRUPOS_DEMO = [
  { id: 'demo-1@g.us', nombre: '✅ JEFECITO PERSONAL', participantes: 2 },
  { id: 'demo-2@g.us', nombre: '✅ EQUIPO CORP. TYRELL', participantes: 8 },
  { id: 'demo-3@g.us', nombre: '✅ NÓMINA Y FINANZAS', participantes: 5 },
];

const MENSAJES_DEMO: { [key: string]: any[] } = {
  'demo-1@g.us': [
    { id: '1', remitente: 'Paula Specter', contenido: 'Buenos días equipo 🔥', timestamp: Math.floor(Date.now() / 1000) - 7200 },
    { id: '2', remitente: 'Bob', contenido: 'Listo jefa, ¿qué necesitas?', timestamp: Math.floor(Date.now() / 1000) - 6900 },
    { id: '3', remitente: 'Paula Specter', contenido: 'Quiero 50 candidatos para ventas hoy', timestamp: Math.floor(Date.now() / 1000) - 6600 },
    { id: '4', remitente: 'Bob', contenido: 'Activando Aspiradora 3000 ahora', timestamp: Math.floor(Date.now() / 1000) - 6300 },
  ],
  'demo-2@g.us': [
    { id: '1', remitente: 'Paula Specter', contenido: 'Status del proyecto?', timestamp: Math.floor(Date.now() / 1000) - 5400 },
    { id: '2', remitente: 'Developer', contenido: '95% completado, último testing', timestamp: Math.floor(Date.now() / 1000) - 5100 },
    { id: '3', remitente: 'Paula Specter', contenido: 'Perfecto, lanzamos mañana', timestamp: Math.floor(Date.now() / 1000) - 4800 },
  ],
  'demo-3@g.us': [
    { id: '1', remitente: 'Contadora', contenido: 'Nómina procesada', timestamp: Math.floor(Date.now() / 1000) - 3600 },
    { id: '2', remitente: 'Paula Specter', contenido: 'Aprobado, transfiere mañana', timestamp: Math.floor(Date.now() / 1000) - 3300 },
  ],
};

// ✅ Endpoint: Listar todos los grupos
gruposRouter.get('/listar-grupos-paula', async (req: Request, res: Response) => {
  try {
    console.log('📱 Cargando grupos...');
    
    res.json({
      success: true,
      grupos: GRUPOS_DEMO,
      total: GRUPOS_DEMO.length,
      fuente: 'demo',
    });
  } catch (error) {
    console.error('❌ Error listando grupos:', error);
    res.status(500).json({
      success: false,
      error: 'Error listando grupos',
      grupos: [],
    });
  }
});

// ✅ Endpoint: Obtener últimos 30 mensajes de un grupo
gruposRouter.post('/ultimos-30-mensajes', async (req: Request, res: Response) => {
  try {
    const { grupoId } = req.body;

    if (!grupoId) {
      return res.status(400).json({
        success: false,
        error: 'grupoId requerido',
      });
    }

    const mensajes = MENSAJES_DEMO[grupoId] || [];
    console.log(`📨 Trayendo ${mensajes.length} mensajes de ${grupoId}`);

    res.json({
      success: true,
      mensajes,
      total: mensajes.length,
      fuente: 'demo',
    });
  } catch (error) {
    console.error('❌ Error obteniendo mensajes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo mensajes',
      mensajes: [],
    });
  }
});

export default gruposRouter;
