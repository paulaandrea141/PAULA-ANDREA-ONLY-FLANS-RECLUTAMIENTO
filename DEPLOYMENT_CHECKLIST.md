# 📋 DEPLOYMENT CHECKLIST - Only Flans

## ✅ Paso 1: FRONTEND en Vercel (11 minutos)

### 1.1 Crear repo GitHub
```
https://github.com/new
Nombre: PAULA-ANDREA-ONLY-FLANS-WEB
Crear
```

### 1.2 Push del código
```powershell
cd C:\Users\choco\Desktop\onlyflans-web
git remote set-url origin https://github.com/paulaandrea141/PAULA-ANDREA-ONLY-FLANS-WEB.git
git push -u origin main
```

### 1.3 Deploy en Vercel
```
https://vercel.com
Login GitHub
New Project → PAULA-ANDREA-ONLY-FLANS-WEB
Import → Next.js (auto-detect)

Variables de entorno:
  NEXT_PUBLIC_FIREBASE_API_KEY=...
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
  NEXT_PUBLIC_FIREBASE_APP_ID=...

Deploy → Esperar 5 min
```

### 1.4 Verificar
```
URL: https://your-project.vercel.app
- / → Dashboard ✅
- /vacantes → Vacantes ✅
- /candidatos → Candidatos ✅
- /leads → CRM Leads ✅
```

---

## ✅ Paso 2: BACKEND en Railway (15 minutos)

### 2.1 Asegurar GitHub push
```powershell
cd C:\Users\choco\Desktop\onlyflans
git status
git push origin main  # Actualizado
```

### 2.2 Crear cuenta Railway
```
https://railway.app
Sign Up → GitHub
Autorizar Railway
```

### 2.3 Crear proyecto
```
Dashboard → New Project → GitHub Repo
Seleccionar: PAULA-ANDREA-ONLY-FLANS-RECLUTAMIENTO
Deploy (auto-detects Node.js)
```

### 2.4 Variables de entorno
En Railway dashboard → Variables → Raw Editor:

```env
# Firebase Credentials
FIREBASE_PROJECT_ID=only-flans
FIREBASE_TYPE=service_account
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@only-flans.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=...
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=...

# Facebook Ads
FACEBOOK_ACCESS_TOKEN=tu_token
FACEBOOK_PAGE_ACCESS_TOKEN=tu_page_token
FACEBOOK_PIXEL_ID=tu_pixel_id
FACEBOOK_WEBHOOK_TOKEN=token_aleatorio_fuerte

# WhatsApp (si no usas Baileys local)
FACEBOOK_WHATSAPP_ACCESS_TOKEN=tu_token

# Server
PORT=3000
NODE_ENV=production
WEBHOOK_VERIFY_TOKEN=otro_token_aleatorio
```

### 2.5 Obtener URL pública
```
Railway Dashboard → Settings → Public Networking
URL: https://onlyflans-prod-xxxxx.railway.app
```

### 2.6 Verificar
```
https://your-railway-url.railway.app/health
Respuesta esperada:
{
  "status": "OK",
  "timestamp": "..."
}
```

---

## ✅ Paso 3: WEBHOOKS de Facebook

### 3.1 En Facebook Ads Manager
```
1. Ir a: https://business.facebook.com
2. Ads Manager → Eventos
3. Lead Forms → Seleccionar forma
4. Configurar webhook:

   URL: https://your-railway-url.railway.app/webhook/facebook
   Token: (El que pusiste en FACEBOOK_WEBHOOK_TOKEN)
   
5. Test lead → Verificar en Firestore que llega
```

### 3.2 Verificar en Firestore
```
Console: https://console.firebase.google.com
Proyecto "Only Flans" → Firestore
Colección "leads" → Debería ver documentos nuevos
```

---

## ✅ Paso 4: WHATSAPP BOT Baileys (Desarrollo Local)

### 4.1 Opción A: Bot en tu máquina (Recomendado)
```powershell
cd C:\Users\choco\Desktop\onlyflans

# Setup
npm install
npm run build

# Ejecutar
npm run dev

# Verás QR en terminal → Escanear con WhatsApp
```

**Ventaja**: Control total, fácil debugging, no necesita Railway
**Desventaja**: Máquina debe estar 24/7 encendida

### 4.2 Opción B: Bot en Railway
```
1. Railway dashboard → Variables
2. Agregar: BAILEYS_MODE=server
3. Bot intenta conectar en background
4. Problema: No hay terminal para QR
```

**Mejor solución**: Baileys local + Railway para webhooks

---

## 📊 ARQUITECTURA FINAL

```
┌─────────────────┐
│   WhatsApp      │  ← Baileys (local o Railway)
└────────┬────────┘
         │ (mensaje)
         ↓
┌─────────────────────────────────┐
│  Railway Backend                │  ← https://your-url.railway.app
│  - /webhook/facebook (POST)     │
│  - /webhook/whatsapp (POST)     │
│  - /health (GET)                │
└────────┬────────────────────────┘
         │ (guardar/leer)
         ↓
┌─────────────────────────────────┐
│  Firestore Database (24/7)      │
│  - vacantes                     │
│  - candidatos                   │
│  - leads                        │
│  - configuracionBot             │
└────────┬────────────────────────┘
         │ (sync en tiempo real)
         ↓
┌─────────────────────────────────┐
│  Vercel Frontend                │  ← https://your-url.vercel.app
│  - Dashboard                    │
│  - Vacantes CRUD                │
│  - Candidatos list              │
│  - Leads CRM                    │
└─────────────────────────────────┘
         ↑
         │ (usuario navega)
         ↓
┌─────────────────────────────────┐
│  Tu navegador                   │
│  (desktop/mobile)               │
└─────────────────────────────────┘
```

---

## 🎯 FLUJO DE UN LEAD

```
1. Usuario escribe a WhatsApp
   ↓
2. Baileys recibe → procesarMensajeEntrante()
   ↓
3. LeadService.crearLead() (si es nuevo)
   ↓
4. Bot responde con preguntas (nombre, colonia, edad, papeles)
   ↓
5. Candidato responde
   ↓
6. Bot procesa respuesta → actualiza status en Firestore
   ↓
7. Dashboard (Vercel) se actualiza en tiempo real
   ↓
8. Si todo ok → marcarComoCitado() → envía detalles entrevista
```

---

## 📱 ACCESO DASHBOARD

**Frontend URL**: https://your-url.vercel.app

Páginas:
- **/** → Dashboard con estadísticas
- **/vacantes** → Crear/editar/eliminar vacantes
- **/candidatos** → Ver candidatos con etapa y score
- **/leads** → CRM tabla de leads (nuevo, filtrado, citado, no_apto)

**Monitoreo Backend**:
- Railway logs: https://railway.app/dashboard
- Firestore: https://console.firebase.google.com

**Control Baileys**:
- Terminal local: `npm run dev`
- Escanear QR cada vez que inicia

---

## ⏱️ TIEMPO TOTAL

| Paso | Tiempo |
|------|--------|
| Frontend Vercel | 11 min |
| Backend Railway | 15 min |
| Configurar webhooks | 5 min |
| Baileys setup | 5 min |
| **Total** | **~36 minutos** |

---

## ✨ DESPUÉS DEL DEPLOYMENT

✅ Sistema completamente funcional
✅ 24/7 uptime en Vercel + Railway
✅ Firestore sincroniza en tiempo real
✅ Facebook Ads genera leads automáticamente
✅ Bot contacta candidatos por WhatsApp
✅ Dashboard en tiempo real

---

## 🔐 SEGURIDAD

- [ ] FIREBASE_PRIVATE_KEY nunca en GitHub (Railway secret)
- [ ] FACEBOOK_WEBHOOK_TOKEN fuerte y aleatorio
- [ ] WEBHOOK_VERIFY_TOKEN nunca en cliente
- [ ] Firestore rules: solo lectura pública, escritura admin
- [ ] Vercel: SSL/HTTPS automático
- [ ] Railway: SSL/HTTPS automático

---

## 🚀 PRÓXIMAS FASES

**Fase 2 (Futuro)**:
- [ ] PWA (agregar .json manifest)
- [ ] Google Play Store wrapper
- [ ] Analytics dashboard
- [ ] Email confirmación automática
- [ ] SMS confirmación (Twilio)
- [ ] Reportes PDF semanales

---

## 📞 SOPORTE

Si algo no funciona:

1. **Vercel**: Revisar logs en dashboard
2. **Railway**: Railway dashboard → Logs
3. **Firestore**: Console → Firestore → Data
4. **Baileys**: Terminal local → mensajes de error
5. **Facebook**: Lead Forms → Test forma

---

**¡LISTO PARA ESCALAR! 🚀**

Only Flans deployment completado.
Sistema 100% gratuito, 100% automatizado, 100% funcional.

