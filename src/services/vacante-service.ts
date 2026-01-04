import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../database/firebase-config';
import { Vacante, Candidato } from '../database/schema';

export const VacanteService = {
  async crearVacante(datosVacante: Omit<Vacante, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'candidatosAsignados'>): Promise<string> {
    const ahora = Timestamp.now().toMillis();
    const docRef = await addDoc(collection(db, 'vacantes'), {
      ...datosVacante,
      candidatosAsignados: 0,
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
    });
    return docRef.id;
  },

  async obtenerVacantesActivas(): Promise<Vacante[]> {
    const q = query(collection(db, 'vacantes'), where('estado', '==', 'Activa'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Vacante));
  },

  async obtenerVacantesPorColonia(colonia: string): Promise<Vacante[]> {
    const q = query(
      collection(db, 'vacantes'),
      where('estado', '==', 'Activa'),
      where('colonias', 'array-contains', colonia)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Vacante));
  },

  async obtenerVacanteById(vacanteId: string): Promise<Vacante | null> {
    try {
      const docRef = doc(db, 'vacantes', vacanteId);
      const docSnap = await getDocs(query(collection(db, 'vacantes'), where('id', '==', vacanteId)));
      if (docSnap.empty) return null;
      const docData = docSnap.docs[0].data();
      return { id: vacanteId, ...docData } as Vacante;
    } catch {
      return null;
    }
  },

  async actualizarVacante(vacanteId: string, updates: Partial<Vacante>): Promise<void> {
    const docRef = doc(db, 'vacantes', vacanteId);
    await updateDoc(docRef, {
      ...updates,
      fechaActualizacion: Timestamp.now().toMillis(),
    });
  },

  async incrementarCandidatosAsignados(vacanteId: string): Promise<void> {
    const docRef = doc(db, 'vacantes', vacanteId);
    const vacante = await this.obtenerVacanteById(vacanteId);
    if (vacante) {
      await updateDoc(docRef, {
        candidatosAsignados: (vacante.candidatosAsignados || 0) + 1,
        fechaActualizacion: Timestamp.now().toMillis(),
      });
    }
  },
};
