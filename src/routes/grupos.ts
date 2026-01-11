import express, { Request, Response } from 'express';

export const gruposRouter = express.Router();

// Mock: Simular grupos hasta que Baileys esté integrado
const GRUPOS_MOCK = [
  { id: '120821943136259@g.us', nombre: 'Jefecito Personal', participantes: 5 },
  { id: '119163918016572@g.us', nombre: 'CORP. TYRELL Team', participantes: 12 },
  { id: '120893663973537@g.us', nombre: 'Nómina y Finanzas', participantes: 8 },
];

const MENSAJES_MOCK: { [key: string]: any[] } = {
  '120821943136259@g.us': [
    { id: '1', remitente: 'Paula Specter', contenido: 'Buenos días equipo', timestamp: Date.now() / 1000 - 3600 },
    { id: '2', remitente: 'Bob', contenido: 'Listo jefa', timestamp: Date.now() / 1000 - 3000 },
    { id: '3', remitente: 'Paula Specter', contenido: 'Cómo va el proyecto?', timestamp: Date.now() / 1000 - 1800 },
  ],
};

// ✅ Endpoint: Listar todos los grupos de Paula
gruposRouter.get('/listar-grupos-paula', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      grupos: GRUPOS_MOCK,
      total: GRUPOS_MOCK.length,
    });
  } catch (error) {
    console.error('❌ Error listando grupos:', error);
    res.status(500).json({
      success: false,
      error: 'Error listando grupos',
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

    const mensajes = MENSAJES_MOCK[grupoId] || [];

    res.json({
      success: true,
      mensajes,
      total: mensajes.length,
    });
  } catch (error) {
    console.error('❌ Error obteniendo mensajes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo mensajes',
    });
  }
});

export default gruposRouter;
