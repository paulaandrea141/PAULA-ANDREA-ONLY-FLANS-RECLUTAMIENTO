# 🚀 OnlyFlans Backend - Guía Rápida

## ✅ Estado Actual
- ✅ Compilación TypeScript: EXITOSA
- ✅ Servidor Express: FUNCIONAL
- ✅ WhatsApp Bot (Baileys): CONECTADO
- ✅ Firebase Firestore: SINCRONIZADO
- ✅ Groq AI Integration: CONFIGURADA

## 📦 Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Compilar TypeScript
npm run build

# 4. Ejecutar en desarrollo
npm run dev
```

## 🎯 Endpoints Disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/test-message` | POST | Enviar mensaje de prueba |
| `/webhook/whatsapp` | GET | Validar webhook WhatsApp |
| `/webhook/whatsapp` | POST | Recibir mensajes WhatsApp |
| `/webhook/facebook` | POST | Recibir leads de Facebook |
| `/api/vacantes` | GET | Obtener todas las vacantes |
| `/api/vacantes/:id` | GET | Obtener vacante específica |

## 🧪 Prueba Rápida

```bash
# Enviar mensaje de prueba
curl -X POST http://localhost:3000/test-message \
  -H "Content-Type: application/json" \
  -d '{"phone":"5218124206561","message":"Hola desde prueba"}'

# Health check
curl http://localhost:3000/health
```

## 🔧 Configuración Necesaria

### Firebase
1. Ir a: https://console.firebase.google.com
2. Crear proyecto o usar existente: `only-flans-reclutami`
3. Obtener credenciales en Configuración del proyecto
4. Copiar valores a `.env`

### Groq API
1. Registrarse en: https://console.groq.com
2. Obtener API Key
3. Modelos disponibles:
   - `llama-3.1-70b-versatile` (recomendado)
   - `llama-3.1-8b-instant`

### WhatsApp (Baileys)
- El QR se mostrará en consola al iniciar
- Escanear con tu WhatsApp personal
- La sesión se guardará automáticamente

## 📝 Archivos Importantes

```
src/
├── index.ts              → Servidor Express principal
├── bot/
│   ├── baileys-service.ts      → Conexión WhatsApp
│   ├── whatsapp-bot-service.ts → Lógica del bot
│   ├── webhook-handler.ts       → Procesar mensajes
│   └── facebook-webhook-handler.ts → Leads de Facebook
├── services/
│   ├── ai-service.ts           → Integración Groq
│   ├── lead-service.ts         → CRM de leads
│   ├── candidato-service.ts    → Gestión candidatos
│   └── vacante-service.ts      → Gestión vacantes
├── lib/
│   └── firebase.ts             → Configuración Firebase
└── routes/
    └── vacantes.ts             → Rutas de vacantes
```

## 🐛 Troubleshooting

**Error: "Module not found"**
```bash
npm install
npm run build
```

**Error: Firebase config not found**
- Verifica que `.env` tenga las variables de Firebase
- Revisa que los valores sean correctos en Firebase Console

**Error: Groq API error**
- Verifica que `GROQ_API_KEY` sea válido
- Verifica que `GROQ_MODEL` sea un modelo activo
- Modelos deprecados: `mixtral-8x7b-32768`

**WhatsApp no conecta**
- Verifica que tengas sesión activa en WhatsApp Web
- Intenta escanear el QR nuevamente
- Borra la carpeta `auth_info_baileys` y reinicia

## 📦 Scripts Disponibles

```bash
npm run dev      # Ejecutar en desarrollo (tsx)
npm run build    # Compilar TypeScript
npm start        # Ejecutar compilado (node)
npm run seed     # Seed de vacantes (si existe)
npm test         # Ejecutar tests (si existen)
```

## 🚀 Deployment

### Railway
```bash
# 1. Push a GitHub
git push origin main

# 2. Conectar con Railway
# https://railway.app

# 3. Agregar variables de entorno
# (Mismas del .env)

# 4. Deploy automático
```

### Vercel (Para frontend Next.js)
```bash
# El backend va en Railway
# El frontend Next.js va en Vercel
# Ver: DEPLOYMENT_FINAL.md
```

## 📊 Tecnología Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Base de Datos**: Firebase Firestore
- **WhatsApp**: Baileys (open-source)
- **IA**: Groq (LLaMA 3.1)
- **Desarrollo**: tsx, tsc

## 🔐 Seguridad

- ✅ Variables de entorno en `.env` (no en Git)
- ✅ Firebase Security Rules configuradas
- ✅ Webhook tokens validados
- ✅ CORS headers configurados
- ✅ Error handling sin exponer detalles internos

## 📞 Soporte

Para problemas:
1. Revisar logs en consola
2. Verificar variables de entorno
3. Verificar credenciales en Firebase Console
4. Revisar Groq Console para API status

---

**Última actualización**: 7 de enero de 2026
**Versión**: 1.0.0
**Estado**: ✅ PRODUCCIÓN LISTA
