#!/usr/bin/env node

/**
 * 🌊 STREAMING 24/7 CLI - Paula Specter
 * Muestra mensajes de WhatsApp en tiempo real en la terminal
 */

const http = require('http');

const API_URL = 'http://localhost:3000';

// Colores para la terminal
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

function log(color, ...args) {
  console.log(`${color}${new Date().toLocaleTimeString()}${colors.reset}`, ...args);
}

function hacerFetch(ruta, opciones = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(ruta);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: opciones.method || 'GET',
      headers: opciones.headers || {},
      timeout: 5000, // 5 segundos de timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout connecting to backend'));
    });

    if (opciones.body) {
      req.write(JSON.stringify(opciones.body));
    }

    req.end();
  });
}

async function cargarUltimosGrupos() {
  log(colors.yellow, '⏳ Conectando al backend...');
  try {
    const data = await hacerFetch(`${API_URL}/api/grupos/listar-grupos-paula`);
    return data.grupos || [];
  } catch (error) {
    throw new Error(`No se pudo conectar al backend: ${error.message}`);
  }
}

async function cargarUltimos50Mensajes(grupos) {
  const todosLosMensajes = [];

  for (const grupo of grupos) {
    try {
      const data = await hacerFetch(`${API_URL}/api/grupos/ultimos-30-mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { grupoId: grupo.id },
      });
      
      if (data.mensajes) {
        data.mensajes.forEach((msg) => {
          todosLosMensajes.push({
            ...msg,
            grupo: grupo.nombre,
          });
        });
      }
    } catch (e) {
      log(colors.yellow, `⚠️  ${grupo.nombre}: ${e.message}`);
    }
  }

  return todosLosMensajes.slice(-50);
}

function conectarStreaming() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_URL}/api/stream/stream`);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      log(colors.green, '✅ Conectado al streaming 24/7');

      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lineas = buffer.split('\n');

        for (let i = 0; i < lineas.length - 1; i++) {
          const linea = lineas[i];
          if (linea.startsWith('data: ')) {
            try {
              const msg = JSON.parse(linea.slice(6));
              if (msg.tipo !== 'conexion' && msg.contenido) {
                log(
                  colors.magenta,
                  `📱 ${msg.autor || 'Sistema'}:`,
                  colors.cyan,
                  msg.contenido
                );
              }
            } catch (e) {
              // Ignorar
            }
          }
        }

        buffer = lineas[lineas.length - 1];
      });

      res.on('end', () => {
        log(colors.red, '❌ Desconexión del streaming. Reconectando en 3s...');
        setTimeout(() => conectarStreaming(), 3000);
      });

      res.on('error', (e) => {
        log(colors.red, '❌ Error en streaming:', e.message);
        setTimeout(() => conectarStreaming(), 3000);
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.clear();
  log(colors.bold + colors.green, '🚀 ASPIRADORA 3000 - STREAMING 24/7 CLI');
  log(colors.green, '════════════════════════════════════════\n');

  let intentos = 0;
  const maxIntentos = 10;

  while (intentos < maxIntentos) {
    intentos++;
    log(colors.yellow, `⏳ Intento ${intentos}/${maxIntentos}: Esperando 20 segundos a que backend inicie...`);
    await new Promise(r => setTimeout(r, 20000));

    try {
      log(colors.yellow, '⏳ Conectando al backend...');
      const grupos = await cargarUltimosGrupos();
      log(colors.green, `✅ ${grupos.length} grupos encontrados\n`);

      if (grupos.length === 0) {
        log(colors.yellow, '⚠️  No hay grupos. Asegúrate de escanear QR primero.');
      }

      log(colors.yellow, '⏳ Cargando últimos 50 mensajes...');
      const mensajes = await cargarUltimos50Mensajes(grupos);

      log(colors.green, `✅ ${mensajes.length} mensajes encontrados\n`);
      
      if (mensajes.length > 0) {
        log(colors.bold + colors.magenta, '📋 ÚLTIMOS MENSAJES:');
        log(colors.magenta, '════════════════════════════════════════\n');

        mensajes.forEach((msg) => {
          log(
            colors.cyan,
            `[${msg.grupo || 'Desconocido'}]`,
            colors.yellow,
            `${msg.remitente || msg.autor}:`,
            colors.magenta,
            msg.contenido
          );
        });
      }

      log(colors.green, '\n════════════════════════════════════════');
      log(colors.bold + colors.green, '🌊 INICIANDO STREAMING 24/7...\n');

      await conectarStreaming();
      break; // Si llegamos aquí, todo fue bien
    } catch (error) {
      log(colors.red, `❌ Intento ${intentos} falló: ${error.message}`);
      
      if (intentos >= maxIntentos) {
        log(colors.red, '❌ Máximo de intentos alcanzado. Backend no responde.');
        log(colors.yellow, 'Verifica que:');
        log(colors.yellow, '  1. El backend esté corriendo en puerto 3000');
        log(colors.yellow, '  2. Baileys haya escanado el QR');
        log(colors.yellow, '  3. No haya errores en la consola del backend');
        process.exit(1);
      }
    }
  }
}

// Manejar Ctrl+C gracefully
process.on('SIGINT', () => {
  log(colors.green, '\n✅ Streaming detenido. ¡Hasta luego, Jefa!');
  process.exit(0);
});

main();
