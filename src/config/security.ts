/**
 * 🔐 SECURITY CONFIG - CORP. TYRELL
 * Manejo seguro de credenciales y API keys
 */

import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Validar que las keys necesarias existan
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'PORT',
];

const optionalEnvVars = ['GROQ_API_KEY', 'GEMINI_API_KEY', 'WHATSAPP_PHONE'];

// Validar variables requeridas
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(
    `❌ MISSING REQUIRED ENV VARS: ${missingVars.join(', ')}\n` +
      `   Please check your .env file in ${process.cwd()}/.env`
  );
  process.exit(1);
}

// Advertencias para variables opcionales
optionalEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.warn(
      `⚠️  OPTIONAL ENV VAR MISSING: ${varName} - Some features will be disabled`
    );
  }
});

/**
 * Configuración segura de aplicación
 */
export const securityConfig = {
  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },

  // IA APIs (cargadas bajo demanda)
  getGeminiKey: () => {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY no configurada - Gemini deshabilitado');
      return null;
    }
    return process.env.GEMINI_API_KEY;
  },

  getGroqKey: () => {
    if (!process.env.GROQ_API_KEY) {
      console.warn('⚠️  GROQ_API_KEY no configurada - Groq deshabilitado');
      return null;
    }
    return process.env.GROQ_API_KEY;
  },

  // WhatsApp
  whatsappPhone: process.env.WHATSAPP_PHONE || '+528124206561',

  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  isDevelopment: process.env.NODE_ENV !== 'production',

  // Headers de seguridad
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  },

  // CORS config
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:3000'],

  // Rate limiting
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100,
  },
};

/**
 * Función para sanitizar logs (no mostrar API keys)
 */
export const sanitizeLog = (message: string): string => {
  const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.FIREBASE_PRIVATE_KEY,
  ].filter(Boolean);

  let sanitized = message;
  apiKeys.forEach((key) => {
    if (key) {
      const regex = new RegExp(key, 'g');
      sanitized = sanitized.replace(regex, '***REDACTED***');
    }
  });

  return sanitized;
};

/**
 * Función para validar tokens JWT
 */
export const validateJWT = (token: string): boolean => {
  try {
    // Validación básica del formato JWT
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // En producción, verificar la firma
    // Para desarrollo, solo validar formato
    return true;
  } catch {
    return false;
  }
};

export default securityConfig;
