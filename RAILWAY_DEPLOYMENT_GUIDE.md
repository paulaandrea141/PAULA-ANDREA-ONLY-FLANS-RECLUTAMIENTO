# 🚀 Deployment en Railway - Only Flans Backend

## ⚡ Railway vs Google Cloud Run

| Característica | Railway | Cloud Run |
|---|---|---|
| **Costo inicial** | $5 USD crédito | $0.40 USD free tier |
| **Facilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Build automático** | Sí, desde GitHub | Sí, desde GitHub |
| **Variables de entorno** | UI simple | UI compleja |
| **Escalado** | Automático | Automático |
| **Cold starts** | Rápidos | Lento |
| **Recomendación** | ✅ Este guide | Alternativa |

## 🚄 Paso 1: Preparar el Backend

```bash
# Verificar que todo está en GitHub
cd C:\Users\choco\Desktop\onlyflans
git status
git log --oneline -5

# Asegurarse que está actualizado
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

## 🎯 Paso 2: Crear cuenta en Railway

1. Ir a: https://railway.app
2. **Sign Up** → GitHub (conecta tu cuenta)
3. Autorizar Railway en GitHub
4. **Skip** wizard inicial (lo hacemos manual)

## 📦 Paso 3: Crear nuevo proyecto

1. Dashboard de Railway
2. **New Project** → "GitHub Repo"
3. Seleccionar: `PAULA-ANDREA-ONLY-FLANS-RECLUTAMIENTO`
4. Click: **Deploy**

Railway automáticamente:
- Detecta `package.json`
- Instala dependencias
- Ejecuta `npm start` (o `npm run dev`)

## 🔐 Paso 4: Configurar Variables de Entorno

En Railway dashboard:

1. Tu proyecto → **Variables** tab
2. **Raw Editor** → Pegar:

```env
# Firebase
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=only-flans
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@only-flans.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=...
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=...

# WhatsApp (Baileys)
FACEBOOK_WHATSAPP_ACCESS_TOKEN=tu_token_aqui (si usas Twilio, no Baileys)
FACEBOOK_WHATSAPP_PHONE_NUMBER_ID=tu_phone_id

# Facebook Ads
FACEBOOK_ACCESS_TOKEN=tu_access_token
FACEBOOK_PAGE_ACCESS_TOKEN=tu_page_token
FACEBOOK_PIXEL_ID=tu_pixel_id
FACEBOOK_WEBHOOK_TOKEN=token_secreto_aleatorio

# Server
PORT=3000
NODE_ENV=production
WEBHOOK_VERIFY_TOKEN=token_secreto_para_validar_webhooks
```

### 🔑 Obtener credenciales Firebase

```
1. Firebase Console: https://console.firebase.google.com
2. Proyecto "Only Flans"
3. Project Settings (⚙️)
4. Service Accounts tab
5. "Generate new private key"
6. Descargar JSON
7. Copiar contenido a FIREBASE_PRIVATE_KEY (con escape de newlines)
```

**O más fácil**: Crear `.env.production` localmente, copiar y pegar valores.

## 🌍 Paso 5: Obtener URL del servidor

1. En Railway dashboard:
2. Tu proyecto → **Settings** tab
3. Buscar **"Public Networking"**
4. Railway asigna URL como: `https://onlyflans-prod-xxxxx.railway.app`

## 🔗 Paso 6: Actualizar Webhooks

Ahora que tienes URL del backend, actualiza:

### Para WhatsApp (Baileys local):
El bot seguirá corriendo en `localhost:3000` durante desarrollo.

Para producción, Baileys se inicia en Railway, pero:
- Necesita QR scanning → requiere terminal interactiva
- Mejor: Mantener Baileys en máquina local + Railway solo para HTTP endpoints

**Solución recomendada**:
```
- Railway: Hosting de WebHooks y APIs
- Local: Baileys WhatsApp (QR scanning)
- Ambos conectan a Firestore
```

### Para Facebook Ads:
1. Facebook Ads Manager → Lead Form Settings
2. **Webhook URL**: `https://your-url.railway.app/webhook/facebook`
3. **Token**: El que pusiste en `FACEBOOK_WEBHOOK_TOKEN`

## ✅ Verificar que funciona

```bash
# El servidor debe estar corriendo
# Ir a: https://your-url.railway.app/health

# Deberías ver:
# {
#   "status": "OK",
#   "timestamp": "2026-01-04T..."
# }
```

## 📊 Monitorear en Railway

Dashboard de Railway:

- **Deployments**: Ver historial de builds
- **Logs**: Ver logs en tiempo real
- **Metrics**: CPU, memoria, requests
- **Settings**: Reiniciar, eliminar proyecto

```
Para ver logs en vivo:
Railway Dashboard → Tu proyecto → Logs
```

## 🔄 Auto-deploy de Railway

Railway automáticamente redeploya cuando:
- Haces push a GitHub (rama main)
- Cambios detectados en `package.json`
- Nuevo commit

## 🚨 Troubleshooting

### "Deployment failed"
```
Verificar:
1. npm install funciona localmente
2. package.json tiene "start" script
3. No hay errores de TypeScript
4. .env tiene todas las variables
```

### "Port already in use"
```
Railway automáticamente asigna puerto
No necesitas PORT=3000 localmente
```

### "Firebase not initialized"
```
Verificar:
- FIREBASE_PROJECT_ID está correcto
- FIREBASE_PRIVATE_KEY tiene escapes (\n)
- Firestore está activo en Firebase Console
```

### "Logs not showing"
```
En Railway → Settings → Verify Logs
Debe estar en "On"
```

## 💡 Comparación Local vs Railway

| Entorno | Uso | Ventaja |
|---|---|---|
| **Local** | Desarrollo | Control total, logs claros |
| **Railway** | Producción | 24/7, uptime, scaling automático |

## 📈 Siguiente fase

Después de Railway:

1. ✅ Frontend en Vercel
2. ✅ Backend en Railway
3. ✅ Database Firestore (24/7)
4. ✅ Webhooks públicos para Facebook + WhatsApp

Bot Baileys opciones:
- **Opción A**: Correr en máquina local (más estable para QR)
- **Opción B**: Correr en Railway (requiere QR en terminal remota)

---

## 🎯 Resumen Deployment

```
GitHub
  ↓
Railway (Backend)
  ├─ npm install
  ├─ npm run build
  └─ npm start
  ↓
Firestore (Database)
  ↓
Vercel (Frontend)
  ├─ next build
  └─ next start
  ↓
Your Domain (DNS pointing)
```

**Total: ~20 minutos setup**

---

## 🔗 Links útiles

- Railway: https://railway.app
- Console: https://railway.app/dashboard
- Docs: https://docs.railway.app
- GitHub: https://github.com/railwayapp

