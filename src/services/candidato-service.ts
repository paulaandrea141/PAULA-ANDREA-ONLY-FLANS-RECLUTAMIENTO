import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../database/firebase-config';
import { Candidato } from '../database/schema';

export const CandidatoService = {
  async crearCandidato(datosCandidato: Omit<Candidato, 'id' | 'fechaContacto' | 'fechaActualizacion' | 'conversacionHistorico'>): Promise<string> {
    const ahora = Timestamp.now().toMillis();
    const docRef = await addDoc(collection(db, 'candidatos'), {
      ...datosCandidato,
      conversacionHistorico: [],
      fechaContacto: ahora,
      fechaActualizacion: ahora,
    });
    return docRef.id;
  },

  async obtenerCandidatosPorEtapa(etapa: string): Promise<Candidato[]> {
    const q = query(collection(db, 'candidatos'), where('etapa', '==', etapa));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Candidato));
  },

  async obtenerCandidatosPorTelefono(telefono: string): Promise<Candidato | null> {
    const q = query(collection(db, 'candidatos'), where('whatsapp', '==', telefono));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docData = snapshot.docs[0].data();
    return { id: snapshot.docs[0].id, ...docData } as Candidato;
  },

  async actualizarCandidato(candidatoId: string, updates: Partial<Candidato>): Promise<void> {
    const docRef = doc(db, 'candidatos', candidatoId);
    await updateDoc(docRef, {
      ...updates,
      fechaActualizacion: Timestamp.now().toMillis(),
    });
  },

  async agregarMensajeHistorico(
    candidatoId: string,
    autor: 'Bot' | 'Candidato',
    mensaje: string,
    tipo: 'Texto' | 'Imagen' | 'Link' = 'Texto'
  ): Promise<void> {
    const docRef = doc(db, 'candidatos', candidatoId);
    const candidato = await this.obtenerCandidatoById(candidatoId);
    if (candidato) {
      const nuevoMensaje = {
        autor,
        mensaje,
        timestamp: Timestamp.now().toMillis(),
        tipo,
      };
      await updateDoc(docRef, {
        conversacionHistorico: [...(candidato.conversacionHistorico || []), nuevoMensaje],
        fechaActualizacion: Timestamp.now().toMillis(),
      });
    }
  },

  async obtenerCandidatoById(candidatoId: string): Promise<Candidato | null> {
    const docRef = doc(db, 'candidatos', candidatoId);
    try {
      const snapshot = await getDocs(query(collection(db, 'candidatos'), where('__name__', '==', candidatoId)));
      if (snapshot.empty) return null;
      const docData = snapshot.docs[0].data();
      return { id: candidatoId, ...docData } as Candidato;
    } catch {
      return null;
    }
  },

  async obtenerCandidatosRecientes(cantidadDias: number = 7): Promise<Candidato[]> {
    const haceDias = Timestamp.now().toMillis() - cantidadDias * 24 * 60 * 60 * 1000;
    const q = query(
      collection(db, 'candidatos'),
      where('fechaContacto', '>=', haceDias),
      orderBy('fechaContacto', 'desc'),
      limit(100)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Candidato));
  },
};
