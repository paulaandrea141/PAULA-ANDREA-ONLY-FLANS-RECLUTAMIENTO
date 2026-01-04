import { Vacante, Candidato } from '../database/schema';
import { VacanteService } from '../services/vacante-service';

interface ResultadoMatching {
  vacanteId: string;
  empresa: string;
  puesto: string;
  score: number;
  razon: string[];
}

class MatchingServiceClass {
  async encontrarVacantaOptima(candidato: Candidato): Promise<ResultadoMatching | null> {
    try {
      const vacantesColonia = await VacanteService.obtenerVacantesPorColonia(candidato.colonia);
      if (vacantesColonia.length === 0) return null;

      const puntuaciones = vacantesColonia.map((vacante) => ({
        vacante,
        score: this.calcularScore(candidato, vacante),
      }));

      const mejores = puntuaciones.sort((a, b) => b.score - a.score);
      if (mejores[0] && mejores[0].score > 0) {
        const mejor = mejores[0];
        return {
          vacanteId: mejor.vacante.id,
          empresa: mejor.vacante.empresa,
          puesto: mejor.vacante.puesto,
          score: mejor.score,
          razon: [`Compatible con ${candidato.colonia}`],
        };
      }
      return null;
    } catch (error) {
      console.error('Error en matching:', error);
      return null;
    }
  }

  private calcularScore(candidato: Candidato, vacante: Vacante): number {
    let score = 50;

    if (vacante.requisitos.genero === candidato.genero) {
      score += 25;
    }

    const edadMin = vacante.requisitos.edadMin || 18;
    const edadMax = vacante.requisitos.edadMax || 65;
    if (candidato.edad >= edadMin && candidato.edad <= edadMax) {
      score += 25;
    }

    return Math.min(score, 100);
  }
}

export const MatchingService = new MatchingServiceClass();
