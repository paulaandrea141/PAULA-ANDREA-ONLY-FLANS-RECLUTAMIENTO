/**
 * 🔐 SECURITY MIDDLEWARE - CORP. TYRELL
 * Protección contra ataques comunes y validación de requests
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Rate limiting global
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: '❌ Demasiadas solicitudes desde esta IP, intenta más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting estricto para AI endpoints (prevenir abuse)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: '❌ Límite de solicitudes de IA excedido',
});

/**
 * Middleware para sanitizar inputs (prevenir inyecciones)
 */
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  // Sanitizar body
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      const value = req.body[key];
      if (typeof value === 'string') {
        // Remover caracteres peligrosos
        req.body[key] = value
          .replace(/<script/gi, '')
          .replace(/<iframe/gi, '')
          .replace(/javascript:/gi, '')
          .trim();
      }
    });
  }

  // Sanitizar query
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      const value = req.query[key];
      if (typeof value === 'string') {
        req.query[key] = value
          .replace(/<script/gi, '')
          .replace(/<iframe/gi, '')
          .replace(/javascript:/gi, '')
          .trim();
      }
    });
  }

  next();
};

/**
 * Middleware para validar API Key en endpoints protegidos
 */
export const validateAPIKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.API_KEY_SECRET;

  if (!expectedKey) {
    console.warn('⚠️ API_KEY_SECRET no configurada');
    // En desarrollo, permitir sin key
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
  }

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: '❌ API Key inválida o ausente',
    });
  }

  next();
};

/**
 * Middleware para agregar headers de seguridad
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevenir XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Información de política de seguridad
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );

  // HSTS (HTTP Strict Transport Security)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
};

/**
 * Middleware para logging seguro (sin exponer secrets)
 */
export const secureLogging = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log al finalizar
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `${new Date().toISOString()} | ${req.method} ${req.path} | Status: ${res.statusCode} | Duration: ${duration}ms`;

    if (res.statusCode >= 400) {
      console.error(logMessage);
    } else {
      console.log(logMessage);
    }
  });

  next();
};

/**
 * Middleware para manejo de errores global
 */
export const errorHandler = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  console.error('❌ Error:', err.message);

  // No exponer detalles en producción
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message;

  res.status(err.status || 500).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Función para validar datos de entrada comunes
 */
export const validateInput = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  phone: (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  },

  texto: (texto: string, minLength = 1, maxLength = 5000): boolean => {
    return texto.length >= minLength && texto.length <= maxLength;
  },

  numero: (num: any): boolean => {
    return !isNaN(num) && isFinite(num);
  },

  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
};

export default {
  limiter,
  aiLimiter,
  sanitizeInputs,
  validateAPIKey,
  securityHeaders,
  secureLogging,
  errorHandler,
  validateInput,
};
