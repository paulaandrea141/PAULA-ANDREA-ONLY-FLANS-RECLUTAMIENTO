/**
 * Lead Service - CRM de leads automatizado
 * 
 * Gestiona el ciclo de vida completo de un lead:
 * nuevo → filtrado → citado → no_apto
 */

import { db } from '../database/firebase-config';
import { Lead } from '../database/schema';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

class LeadServiceClass {
  private coleccion = 'leads';

  /**
   * Crear un nuevo lead
   */
  async crearLead(datos: Omit<Lead, 'id' | 'fechaCreacion' | 'fechaActualizacion'>): Promise<string> {
    try {
      const leadId = doc(collection(db, this.coleccion)).id;
      const ahora = Date.now();

      const leadCompleto: Lead = {
        id: leadId,
        ...datos,
        papeleríaCompleta: datos.papeleríaCompleta ?? false,
        rutaTransporteSabe: datos.rutaTransporteSabe ?? false,
        conversacionHistorico: datos.conversacionHistorico ?? [],
        fechaCreacion: ahora,
        fechaActualizacion: ahora,
      };

      await setDoc(doc(db, this.coleccion, leadId), leadCompleto);
      console.log(`📝 Lead creado: ${leadId} - ${datos.nombre}`);
      return leadId;
    } catch (error) {
      console.error('❌ Error creando lead:', error);
      throw error;
    }
  }

  /**
   * Obtener lead por ID
   */
  async obtenerLead(leadId: string): Promise<Lead | null> {
    try {
      const docRef = doc(db, this.coleccion, leadId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as Lead;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo lead:', error);
      return null;
    }
  }

  /**
   * Obtener lead por teléfono
   */
  async obtenerLeadPorTelefono(telefono: string): Promise<Lead | null> {
    try {
      const q = query(
        collection(db, this.coleccion),
        where('telefono', '==', telefono)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as Lead;
      }
      return null;
    } catch (error) {
      console.error('❌ Error buscando lead por teléfono:', error);
      return null;
    }
  }

  /**
   * Actualizar status del lead
   */
  async actualizarStatus(
    leadId: string,
    nuevoStatus: 'nuevo' | 'filtrado' | 'citado' | 'no_apto'
  ): Promise<void> {
    try {
      const ahora = Date.now();
      await updateDoc(doc(db, this.coleccion, leadId), {
        status: nuevoStatus,
        fechaActualizacion: ahora,
      });
      console.log(`📊 Lead ${leadId}: status actualizado a "${nuevoStatus}"`);
    } catch (error) {
      console.error('❌ Error actualizando status:', error);
      throw error;
    }
  }

  /**
   * Marcar como "citado" cuando confirma papelería y ruta
   */
  async marcarComoCitado(leadId: string, nota?: string): Promise<void> {
    try {
      const ahora = Date.now();

      // Obtener lead actual para agregar nota a historial
      const leadActual = await this.obtenerLead(leadId);
      if (!leadActual) {
        throw new Error('Lead no encontrado');
      }

      // Crear nota automática
      const notaAutomatica = {
        autor: 'Bot' as const,
        mensaje: nota || '✅ Candidato citado - Papelería completa y ruta confirmada',
        timestamp: ahora,
        tipo: 'Nota' as const,
      };

      const historicoActualizado = [
        ...leadActual.conversacionHistorico,
        notaAutomatica,
      ];

      // Actualizar lead
      await updateDoc(doc(db, this.coleccion, leadId), {
        status: 'citado',
        papeleríaCompleta: true,
        rutaTransporteSabe: true,
        lastContact: ahora,
        notes: nota || leadActual.notes,
        conversacionHistorico: historicoActualizado,
        fechaActualizacion: ahora,
      });

      console.log(`✅ Lead ${leadId} CITADO - Listo para entrevista`);
    } catch (error) {
      console.error('❌ Error marcando como citado:', error);
      throw error;
    }
  }

  /**
   * Marcar como "no_apto" con razón
   */
  async marcarComoNoApto(leadId: string, razon: string): Promise<void> {
    try {
      const ahora = Date.now();

      // Obtener lead actual
      const leadActual = await this.obtenerLead(leadId);
      if (!leadActual) {
        throw new Error('Lead no encontrado');
      }

      // Crear nota automática de rechazo
      const notaRechazo = {
        autor: 'Bot' as const,
        mensaje: `❌ No apto - ${razon}`,
        timestamp: ahora,
        tipo: 'Nota' as const,
      };

      const historicoActualizado = [
        ...leadActual.conversacionHistorico,
        notaRechazo,
      ];

      await updateDoc(doc(db, this.coleccion, leadId), {
        status: 'no_apto',
        lastContact: ahora,
        notes: razon,
        conversacionHistorico: historicoActualizado,
        fechaActualizacion: ahora,
      });

      console.log(`⛔ Lead ${leadId} marcado como NO_APTO: ${razon}`);
    } catch (error) {
      console.error('❌ Error marcando como no_apto:', error);
      throw error;
    }
  }

  /**
   * Agregar nota al lead
   */
  async agregarNota(leadId: string, nota: string, autor: 'Bot' | 'Agente' = 'Bot'): Promise<void> {
    try {
      const ahora = Date.now();
      const leadActual = await this.obtenerLead(leadId);

      if (!leadActual) {
        throw new Error('Lead no encontrado');
      }

      const notaNueva = {
        autor,
        mensaje: nota,
        timestamp: ahora,
        tipo: 'Nota' as const,
      };

      const historicoActualizado = [
        ...leadActual.conversacionHistorico,
        notaNueva,
      ];

      await updateDoc(doc(db, this.coleccion, leadId), {
        conversacionHistorico: historicoActualizado,
        notes: nota,
        lastContact: ahora,
        fechaActualizacion: ahora,
      });

      console.log(`📝 Nota agregada al lead ${leadId}`);
    } catch (error) {
      console.error('❌ Error agregando nota:', error);
      throw error;
    }
  }

  /**
   * Actualizar mensaje en conversación
   */
  async agregarMensajeAHistorial(
    leadId: string,
    mensaje: string,
    autor: 'Bot' | 'Agente',
    tipo: 'Texto' | 'Imagen' | 'Nota' = 'Texto'
  ): Promise<void> {
    try {
      const ahora = Date.now();
      const leadActual = await this.obtenerLead(leadId);

      if (!leadActual) {
        throw new Error('Lead no encontrado');
      }

      const nuevoMensaje = {
        autor,
        mensaje,
        timestamp: ahora,
        tipo,
      };

      const historicoActualizado = [
        ...leadActual.conversacionHistorico,
        nuevoMensaje,
      ];

      await updateDoc(doc(db, this.coleccion, leadId), {
        conversacionHistorico: historicoActualizado,
        lastContact: ahora,
        fechaActualizacion: ahora,
      });
    } catch (error) {
      console.error('❌ Error agregando mensaje:', error);
      throw error;
    }
  }

  /**
   * Programar próximo contacto
   */
  async programarProximoContacto(leadId: string, proximaFecha: number): Promise<void> {
    try {
      const ahora = Date.now();

      await updateDoc(doc(db, this.coleccion, leadId), {
        proximoContacto: proximaFecha,
        fechaActualizacion: ahora,
      });

      const fechaFormato = new Date(proximaFecha).toLocaleString('es-MX');
      console.log(`📅 Próximo contacto programado: ${fechaFormato}`);
    } catch (error) {
      console.error('❌ Error programando contacto:', error);
      throw error;
    }
  }

  /**
   * Obtener leads por status
   */
  async obtenerLeadsPorStatus(
    status: 'nuevo' | 'filtrado' | 'citado' | 'no_apto'
  ): Promise<Lead[]> {
    try {
      const q = query(
        collection(db, this.coleccion),
        where('status', '==', status),
        orderBy('fechaCreacion', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => doc.data() as Lead);
    } catch (error) {
      console.error('❌ Error obteniendo leads por status:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas del CRM
   */
  async obtenerEstadísticas(): Promise<{
    total: number;
    nuevo: number;
    filtrado: number;
    citado: number;
    no_apto: number;
    tasaConversion: number;
  }> {
    try {
      const leadsTodos = await getDocs(collection(db, this.coleccion));
      const total = leadsTodos.size;

      const leadsNuevo = await this.obtenerLeadsPorStatus('nuevo');
      const leadsFiltrado = await this.obtenerLeadsPorStatus('filtrado');
      const leadsCitado = await this.obtenerLeadsPorStatus('citado');
      const leadsNoApto = await this.obtenerLeadsPorStatus('no_apto');

      const tasaConversion = total > 0 ? (leadsCitado.length / total) * 100 : 0;

      return {
        total,
        nuevo: leadsNuevo.length,
        filtrado: leadsFiltrado.length,
        citado: leadsCitado.length,
        no_apto: leadsNoApto.length,
        tasaConversion: Math.round(tasaConversion * 100) / 100,
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        total: 0,
        nuevo: 0,
        filtrado: 0,
        citado: 0,
        no_apto: 0,
        tasaConversion: 0,
      };
    }
  }

  /**
   * Obtener leads que necesitan seguimiento
   */
  async obtenerLeadsParaSeguimiento(): Promise<Lead[]> {
    try {
      const ahora = Date.now();

      // Leads que no son "citado" ni "no_apto" y hace más de 24h sin contacto
      const hace24h = ahora - 24 * 60 * 60 * 1000;

      const q = query(
        collection(db, this.coleccion),
        where('status', 'in', ['nuevo', 'filtrado']),
        orderBy('lastContact', 'asc'),
        limit(10)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => doc.data() as Lead);
    } catch (error) {
      console.error('❌ Error obteniendo leads para seguimiento:', error);
      return [];
    }
  }
}

export const LeadService = new LeadServiceClass();
