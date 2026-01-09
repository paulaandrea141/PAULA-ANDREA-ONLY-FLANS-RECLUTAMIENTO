import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

/**
 * 🤖 AUTOPOSTER DE FACEBOOK - CORP. TYRELL
 * Tech Lead: Paula Specter (@SpecterTech)
 * 
 * Automatiza publicaciones en grupos de empleo de Monterrey
 * usando Puppeteer (100% GRATIS, sin APIs de paga).
 * 
 * ⚠️ IMPORTANTE:
 * - Requiere sesión activa de Facebook en Chrome
 * - Usar con moderación para evitar detección como bot
 * - Recomendado: Max 10 grupos por hora
 */

interface GrupoFacebook {
  nombre: string;
  url: string;
  activo: boolean;
}

// Lista de grupos de empleo en Monterrey (actualizar con URLs reales)
const GRUPOS_MONTERREY: GrupoFacebook[] = [
  {
    nombre: 'Empleo Monterrey 2026',
    url: 'https://www.facebook.com/groups/ejemplo1',
    activo: true,
  },
  {
    nombre: 'Trabajo en Monterrey NL',
    url: 'https://www.facebook.com/groups/ejemplo2',
    activo: true,
  },
  // ... agregar 28 grupos más del Jefecito
];

const PLANTILLA_POST = `🔥 VACANTE URGENTE - MONTERREY 🔥

💼 Puesto: Operario/Supervisor Industrial
💰 Salario: $2,500 - $2,700 + bonos
📍 Ubicación: Zona Metropolitana de Monterrey
🚌 Transporte: Rutas disponibles desde tu colonia

✅ Requisitos:
• Mayor de 18 años
• Disponibilidad inmediata
• Con o sin experiencia (capacitación incluida)
• Documentos completos (INE, RFC, comprobante)

📱 Interesados enviar WhatsApp:
https://wa.me/5218112345678?text=Hola,%20me%20interesa%20la%20vacante

⏰ Contratación INMEDIATA - Cupos limitados

#EmpleoMonterrey #Trabajo #Vacante #CORPTYRELL`;

export class FacebookAutoPoster {
  private browser: puppeteer.Browser | null = null;
  private gruposPublicados: Set<string> = new Set();

  /**
   * 🚀 Inicia el navegador con sesión persistente
   */
  async inicializar(): Promise<void> {
    console.log('🤖 Iniciando Facebook AutoPoster...');

    this.browser = await puppeteer.launch({
      headless: false, // Modo visible para ver el proceso
      userDataDir: './facebook-session', // Mantener sesión activa
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
      ],
    });

    console.log('✅ Navegador iniciado');
  }

  /**
   * 📱 Publica en un grupo específico
   */
  async publicarEnGrupo(grupo: GrupoFacebook, mensaje: string): Promise<boolean> {
    if (!this.browser) {
      throw new Error('Navegador no inicializado');
    }

    const page = await this.browser.newPage();

    try {
      console.log(`📢 Publicando en: ${grupo.nombre}...`);

      // Ir al grupo
      await page.goto(grupo.url, { waitUntil: 'networkidle2' });

      // Esperar a que cargue
      await page.waitForTimeout(3000);

      // Buscar el área de texto para publicar
      // ⚠️ NOTA: Los selectores de Facebook cambian frecuentemente
      // Estos son ejemplos y deben actualizarse
      const selectors = [
        '[aria-label="Escribe algo..."]',
        '[placeholder="Escribe algo..."]',
        '[data-testid="status-attachment-mentions-input"]',
        'div[contenteditable="true"]',
      ];

      let inputEncontrado = false;

      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          
          // Click en el área de texto
          await page.click(selector);
          await page.waitForTimeout(1000);

          // Escribir mensaje
          await page.keyboard.type(mensaje, { delay: 50 });
          await page.waitForTimeout(2000);

          // Buscar botón de publicar
          const botonPublicar = await page.$('[aria-label="Publicar"]') || 
                                await page.$('[data-testid="react-composer-post-button"]');

          if (botonPublicar) {
            await botonPublicar.click();
            console.log(`✅ Publicado en: ${grupo.nombre}`);
            inputEncontrado = true;
            break;
          }
        } catch (error) {
          // Intentar siguiente selector
          continue;
        }
      }

      if (!inputEncontrado) {
        console.log(`⚠️ No se pudo publicar en: ${grupo.nombre}`);
        return false;
      }

      // Esperar confirmación
      await page.waitForTimeout(3000);

      // Marcar como publicado
      this.gruposPublicados.add(grupo.nombre);

      await page.close();
      return true;

    } catch (error) {
      console.error(`❌ Error en ${grupo.nombre}:`, error);
      await page.close();
      return false;
    }
  }

  /**
   * 📅 Publica en múltiples grupos con delay
   */
  async publicarEnGrupos(
    grupos: GrupoFacebook[],
    mensaje: string,
    delayMinutos: number = 5
  ): Promise<void> {
    console.log(`\n🚀 Iniciando publicación en ${grupos.length} grupos...`);
    console.log(`⏱️ Delay entre publicaciones: ${delayMinutos} min\n`);

    let exitosas = 0;
    let fallidas = 0;

    for (const grupo of grupos) {
      if (!grupo.activo) {
        console.log(`⏭️ Saltando: ${grupo.nombre} (inactivo)`);
        continue;
      }

      const exito = await this.publicarEnGrupo(grupo, mensaje);
      
      if (exito) {
        exitosas++;
      } else {
        fallidas++;
      }

      // Esperar entre publicaciones (parecer humano)
      const delayMs = delayMinutos * 60 * 1000;
      console.log(`⏳ Esperando ${delayMinutos} min antes del siguiente grupo...\n`);
      await this.esperar(delayMs);
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('📊 REPORTE DE PUBLICACIONES');
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Exitosas: ${exitosas}`);
    console.log(`❌ Fallidas: ${fallidas}`);
    console.log(`📊 Total: ${grupos.length}`);
    console.log('═══════════════════════════════════════════\n');

    await this.guardarLog(exitosas, fallidas, grupos.length);
  }

  /**
   * ⏰ Programa publicación para las 07:30 AM
   */
  async programarPublicacion(grupos: GrupoFacebook[], mensaje: string): Promise<void> {
    const ahora = new Date();
    const objetivo = new Date();
    objetivo.setHours(7, 30, 0, 0);

    // Si ya pasó la hora, programar para mañana
    if (ahora > objetivo) {
      objetivo.setDate(objetivo.getDate() + 1);
    }

    const msHastaObjetivo = objetivo.getTime() - ahora.getTime();
    const horas = Math.floor(msHastaObjetivo / (1000 * 60 * 60));
    const minutos = Math.floor((msHastaObjetivo % (1000 * 60 * 60)) / (1000 * 60));

    console.log(`⏰ Publicación programada para: ${objetivo.toLocaleString('es-MX')}`);
    console.log(`⏱️  Tiempo restante: ${horas}h ${minutos}m\n`);

    setTimeout(async () => {
      console.log('🔔 ¡Hora de publicar!');
      await this.publicarEnGrupos(grupos, mensaje);
      await this.cerrar();
    }, msHastaObjetivo);
  }

  /**
   * 📝 Guarda log de publicaciones
   */
  private async guardarLog(exitosas: number, fallidas: number, total: number): Promise<void> {
    const timestamp = new Date().toISOString();
    const log = `
═══════════════════════════════════════════════════════════════
[FACEBOOK AUTOPOSTER] ${timestamp}
═══════════════════════════════════════════════════════════════

📢 PUBLICACIONES EN GRUPOS DE MONTERREY

Resultados:
- Grupos objetivo: ${total}
- Publicaciones exitosas: ${exitosas}
- Publicaciones fallidas: ${fallidas}
- Tasa de éxito: ${((exitosas/total)*100).toFixed(1)}%

Grupos publicados:
${Array.from(this.gruposPublicados).map(g => `  ✅ ${g}`).join('\n')}

Mensaje publicado:
${PLANTILLA_POST}

Tech Lead: Paula Specter (@SpecterTech)
Estado: ${exitosas === total ? '🔥 CAMPAÑA EXITOSA' : '⚠️ REVISAR ERRORES'}
═══════════════════════════════════════════════════════════════
`;

    const filePath = path.join(process.cwd(), 'holi.txt');
    
    try {
      await fs.appendFile(filePath, log, 'utf-8');
      console.log('📝 Log guardado en holi.txt');
    } catch (error) {
      console.error('❌ Error guardando log:', error);
    }
  }

  /**
   * ⏱️ Espera X milisegundos
   */
  private esperar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🛑 Cierra el navegador
   */
  async cerrar(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('🛑 Navegador cerrado');
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// EJEMPLO DE USO
// ═══════════════════════════════════════════════════════════════

async function main() {
  const poster = new FacebookAutoPoster();

  try {
    // Inicializar
    await poster.inicializar();

    // Opción 1: Publicar ahora
    // await poster.publicarEnGrupos(GRUPOS_MONTERREY, PLANTILLA_POST, 5);

    // Opción 2: Programar para 07:30 AM
    await poster.programarPublicacion(GRUPOS_MONTERREY, PLANTILLA_POST);

    console.log('\n✅ AutoPoster configurado correctamente');
    console.log('⏰ El navegador se cerrará automáticamente después de publicar\n');

  } catch (error) {
    console.error('❌ Error crítico:', error);
    await poster.cerrar();
    process.exit(1);
  }
}

// Descomentar para ejecutar
// main();

export default FacebookAutoPoster;
