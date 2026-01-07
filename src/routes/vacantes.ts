import { Router, Request, Response } from 'express';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../database/firebase-config';

const router = Router();

/**
 * GET /api/vacantes
 * Obtiene todas las vacantes activas
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const vacantesRef = collection(db, 'vacantes');
    const snapshot = await getDocs(vacantesRef);

    const vacantes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      total: vacantes.length,
      data: vacantes,
    });
  } catch (error) {
    console.error('Error obteniendo vacantes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener vacantes',
    });
  }
});

/**
 * GET /api/vacantes/:id
 * Obtiene una vacante específica
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vacantesRef = collection(db, 'vacantes');
    const q = query(vacantesRef, where('__name__', '==', id));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Vacante no encontrada',
      });
    }

    const vacante = snapshot.docs[0].data();
    res.json({
      success: true,
      data: {
        id: snapshot.docs[0].id,
        ...vacante,
      },
    });
  } catch (error) {
    console.error('Error obteniendo vacante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener vacante',
    });
  }
});

export const vacantesRouter = router;
