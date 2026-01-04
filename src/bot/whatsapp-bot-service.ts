import { ComportamientoHumano } from '../utils/comportamiento-humano';
import { CandidatoService } from '../services/candidato-service';
import { VacanteService } from '../services/vacante-service';
import { MatchingService } from '../matching/matching-engine';
import { Candidato } from '../database/schema';

export interface MensajeWhatsApp {
  telefono: string;
  contenido: string;
  tipo: 'Texto' | 'Imagen' | 'Link';
  timestamp: number;
}

class BotWhatsAppServiceClass {
  async procesarMensajeEntrante(telefono: string, mensaje: string): Promise<void> {
    try {
      let candidato = await CandidatoService.obtenerCandidatosPorTelefono(telefono);
      if (!candidato) {
        await this.flujoAtraccionInicial(telefono);
      } else {
        await this.continuarFlujoSegunEtapa(candidato, mensaje);
      }
    } catch (error) {
      console.error(`Error procesando mensaje:`, error);
    }
  }

  async flujoAtraccionInicial(telefono: string): Promise<void> {
    const saludo = 'Hola, tenemos ofertas de empleo geniales en Monterrey!';
    await this.enviarMensajeConPausa(telefono, saludo);
  }

  async continuarFlujoSegunEtapa(candidato: Candidato, mensaje: string): Promise<void> {
    switch (candidato.etapa) {
      case 'Prospecto':
        await this.flujoCalificacion(candidato, mensaje);
        break;
      default:
        break;
    }
  }

  async flujoCalificacion(candidato: Candidato, mensaje: string): Promise<void> {
    await CandidatoService.agregarMensajeHistorico(candidato.id, 'Candidato', mensaje, 'Texto');
  }

  async flujoAsignacionVacante(candidato: Candidato): Promise<void> {
    const resultado = await MatchingService.encontrarVacantaOptima(candidato);
    if (resultado) {
      await CandidatoService.actualizarCandidato(candidato.id, {
        vacanteAsignada: resultado.vacanteId,
        etapa: 'Asignado',
        score: resultado.score,
      });
      const mensaje = `Posicion: ${resultado.empresa} - ${resultado.puesto}`;
      await this.enviarMensajeConPausa(candidato.whatsapp, mensaje);
    }
  }

  async enviarMensajeConPausa(telefono: string, contenido: string): Promise<void> {
    await ComportamientoHumano.pausaEscritura(contenido.length);
    console.log(`[WhatsApp ${telefono}]: ${contenido}`);
  }
}

export const BotWhatsAppService = new BotWhatsAppServiceClass();
