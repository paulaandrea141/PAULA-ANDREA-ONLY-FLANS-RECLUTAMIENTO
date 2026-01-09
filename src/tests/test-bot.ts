import { generateAIResponse } from '../services/ai-service';
import { LeadService } from '../services/lead-service';
import { SeguimientoContratacionService } from '../services/seguimiento-contratacion';
import { Auditoria } from '../utils/auditoria';

/**
 * 🧪 SIMULADOR DE BOT - CORP. TYRELL
 * Tech Lead: Paula Specter (@SpecterTech)
 * 
 * Simula 5 candidatos interactuando con la IA de Groq
 * para validar el sistema completo antes del lanzamiento.
 */

interface TestCase {
  candidato: string;
  telefono: string;
  mensajes: string[];
}

const CASOS_DE_PRUEBA: TestCase[] = [
  {
    candidato: 'Juan Pérez',
    telefono: '+5218112345001',
    mensajes: [
      'Hola, me interesa el trabajo',
      'Juan Pérez',
      'Tengo 28 años',
      'Vivo en Guadalupe',
      '¿Cuál es el sueldo de operario?',
      '¿Qué horarios manejan?',
    ],
  },
  {
    candidato: 'María González',
    telefono: '+5218112345002',
    mensajes: [
      'Buenos días, vi la vacante',
      'María González',
      '32 años',
      'Colonia San Nicolás',
      '¿El transporte está incluido?',
      'Ya me quedé en DAMAR!', // ✅ Debe marcar como CONTRATADO
    ],
  },
  {
    candidato: 'Carlos Ramírez',
    telefono: '+5218112345003',
    mensajes: [
      'Hola',
      'Carlos',
      '24',
      'Santa Catarina',
      '¿Cuánto pagan en ILSAN?',
    ],
  },
  {
    candidato: 'Ana López',
    telefono: '+5218112345004',
    mensajes: [
      'Buenas tardes',
      'Ana López',
      'Tengo 30 años',
      'Colonia Mitras',
      'Ya empecé a trabajar en MAGNEKON', // ✅ Debe marcar como CONTRATADO
    ],
  },
  {
    candidato: 'Roberto Sánchez',
    telefono: '+5218112345005',
    mensajes: [
      'Hola, busco empleo',
      'Roberto Sánchez',
      '26 años',
      'Apodaca',
      '¿Hay vacantes de supervisor?',
      'Me contrataron ayer', // ✅ Debe marcar como CONTRATADO
    ],
  },
];

class TestBotSimulator {
  private resultados: Array<{
    candidato: string;
    exito: boolean;
    mensajes: number;
    contratado: boolean;
    errores: string[];
  }> = [];

  /**
   * 🚀 Ejecuta todos los casos de prueba
   */
  async ejecutarTests(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🧪 CORP. TYRELL - SIMULADOR DE BOT');
    console.log('═══════════════════════════════════════════════════════════\n');

    const inicio = Date.now();

    for (const caso of CASOS_DE_PRUEBA) {
      console.log(`\n📱 Simulando: ${caso.candidato} (${caso.telefono})`);
      await this.simularCandidato(caso);
      
      // Esperar 2 segundos entre candidatos
      await this.esperar(2000);
    }

    const duracion = ((Date.now() - inicio) / 1000).toFixed(2);
    
    await this.generarReporte(duracion);
  }

  /**
   * 👤 Simula la conversación de un candidato
   */
  private async simularCandidato(caso: TestCase): Promise<void> {
    const errores: string[] = [];
    let mensajesExitosos = 0;
    let marcadoComoContratado = false;

    try {
      for (let i = 0; i < caso.mensajes.length; i++) {
        const mensaje = caso.mensajes[i];
        console.log(`  💬 [${i + 1}/${caso.mensajes.length}] "${mensaje}"`);

        try {
          // Simular detección de contratación
          if (SeguimientoContratacionService.detectarConfirmacion(mensaje)) {
            console.log(`  ✅ Detectada confirmación de contratación!`);
            
            // Buscar o crear lead
            let lead = await LeadService.obtenerLeadPorTelefono(caso.telefono);
            
            if (!lead) {
              const leadId = await LeadService.crearLead({
                nombre: caso.candidato,
                telefono: caso.telefono,
                edad: 0,
                colonia: '',
                status: 'nuevo',
                papeleríaCompleta: false,
                rutaTransporteSabe: false,
                lastContact: Date.now(),
                notes: 'Lead de prueba - Test Bot',
                conversacionHistorico: [],
                fuenteLead: 'Test Simulador',
              });
              
              lead = await LeadService.obtenerLead(leadId);
            }

            if (lead) {
              // Marcar como contratado
              await SeguimientoContratacionService.marcarComoContratado(
                lead.id,
                mensaje
              );
              
              marcadoComoContratado = true;
              console.log(`  🎉 Marcado como CONTRATADO en Dashboard!`);
            }
          } else {
            // Enviar a IA normal
            const { response } = await generateAIResponse(
              mensaje,
              caso.telefono,
              []
            );
            
            console.log(`  🤖 IA: ${response.substring(0, 80)}...`);
          }

          mensajesExitosos++;
          
          // Esperar entre mensajes (simular humano)
          await this.esperar(1000);
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
          console.log(`  ❌ Error: ${errorMsg}`);
          errores.push(`Mensaje ${i + 1}: ${errorMsg}`);
        }
      }

      this.resultados.push({
        candidato: caso.candidato,
        exito: errores.length === 0,
        mensajes: mensajesExitosos,
        contratado: marcadoComoContratado,
        errores,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error crítico';
      console.log(`  ❌ Error crítico: ${errorMsg}`);
      
      this.resultados.push({
        candidato: caso.candidato,
        exito: false,
        mensajes: mensajesExitosos,
        contratado: marcadoComoContratado,
        errores: [errorMsg],
      });
    }
  }

  /**
   * 📊 Genera reporte de resultados
   */
  private async generarReporte(duracion: string): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 REPORTE DE TESTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const exitosos = this.resultados.filter(r => r.exito).length;
    const contratados = this.resultados.filter(r => r.contratado).length;
    const totalMensajes = this.resultados.reduce((sum, r) => sum + r.mensajes, 0);

    console.log(`⏱️  Duración total: ${duracion}s`);
    console.log(`📨 Mensajes enviados: ${totalMensajes}`);
    console.log(`✅ Tests exitosos: ${exitosos}/${this.resultados.length}`);
    console.log(`🎉 Contratados detectados: ${contratados}/3`);
    console.log('');

    // Detalles por candidato
    this.resultados.forEach((resultado, i) => {
      const icono = resultado.exito ? '✅' : '❌';
      const estado = resultado.contratado ? '🟢 VERDE' : '⚪ Normal';
      
      console.log(`${icono} ${resultado.candidato}`);
      console.log(`   Mensajes: ${resultado.mensajes} | Estado: ${estado}`);
      
      if (resultado.errores.length > 0) {
        resultado.errores.forEach(err => {
          console.log(`   ⚠️  ${err}`);
        });
      }
      console.log('');
    });

    // Guardar en holi.txt
    await this.guardarEnHoliTxt(exitosos, contratados, totalMensajes, duracion);

    // Resultado final
    if (exitosos === this.resultados.length && contratados === 3) {
      console.log('🔥 TEST PASSED - Sistema operativo al 100%');
      Auditoria.registrar('SISTEMA', '🔥 Test Bot PASSED - Todos los casos exitosos');
    } else {
      console.log('⚠️  TEST FAILED - Revisar errores');
      Auditoria.registrar('ERROR', '❌ Test Bot FAILED - Revisar logs');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 📝 Guarda resultados en holi.txt
   */
  private async guardarEnHoliTxt(
    exitosos: number,
    contratados: number,
    mensajes: number,
    duracion: string
  ): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const timestamp = new Date().toISOString();
    const log = `
═══════════════════════════════════════════════════════════════
[TEST BOT SIMULATOR] ${timestamp}
═══════════════════════════════════════════════════════════════

🧪 SIMULACIÓN DE 5 CANDIDATOS

Resultados:
- Candidatos simulados: ${this.resultados.length}
- Tests exitosos: ${exitosos}/${this.resultados.length}
- Mensajes enviados: ${mensajes}
- Contratados detectados: ${contratados}/3 esperados
- Duración total: ${duracion}s

Detalles:
${this.resultados.map(r => `
  ${r.exito ? '✅' : '❌'} ${r.candidato}
     Mensajes: ${r.mensajes}
     Estado: ${r.contratado ? '🟢 VERDE (CONTRATADO)' : '⚪ Normal'}
     Errores: ${r.errores.length === 0 ? 'Ninguno' : r.errores.join(', ')}
`).join('')}

Estado Final: ${exitosos === this.resultados.length && contratados === 3 ? '🔥 TEST PASSED' : '⚠️ TEST FAILED'}

Tech Lead: Paula Specter (@SpecterTech)
═══════════════════════════════════════════════════════════════
`;

    const filePath = path.join(process.cwd(), 'holi.txt');
    
    try {
      await fs.appendFile(filePath, log, 'utf-8');
      console.log('📝 Resultados guardados en holi.txt');
    } catch (error) {
      console.error('❌ Error guardando en holi.txt:', error);
    }
  }

  /**
   * ⏱️ Espera X milisegundos
   */
  private esperar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Ejecutar tests
const simulator = new TestBotSimulator();
simulator.ejecutarTests().catch(error => {
  console.error('❌ Error crítico en tests:', error);
  process.exit(1);
});
