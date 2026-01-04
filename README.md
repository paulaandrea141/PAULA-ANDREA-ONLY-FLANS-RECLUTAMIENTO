# Only Flans - Plataforma de Reclutamiento Autónoma

Sistema completamente gratis para automatizar reclutamiento en Monterrey usando WhatsApp Personal + Firebase.

## 🚀 Stack Tech
- **Backend**: Node.js + TypeScript + Express
- **WhatsApp**: Baileys (API personal, sin costo)
- **Base de datos**: Firebase Firestore (Spark Plan gratuito)
- **Frontend Admin**: Next.js + Tailwind CSS
- **Deploy**: Vercel (gratuito)

## 📋 Requisitos

- Node.js 16+
- npm o yarn
- Cuenta Google/Firebase (gratuita)
- WhatsApp personal en tu teléfono

## 🔧 Instalación

### 1. Backend (API Bot)

```bash
cd onlyflans
npm install
```

### 2. Frontend (Dashboard Admin)

```bash
cd ../onlyflans-web
npm install
```

## ⚙️ Configuración

### Backend - Archivo `.env`

```
FIREBASE_API_KEY=tu_key_aqui
FIREBASE_AUTH_DOMAIN=onlyflans.firebaseapp.com
FIREBASE_PROJECT_ID=onlyflans
FIREBASE_STORAGE_BUCKET=onlyflans.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123

WHATSAPP_PHONE=5216xxxxxxxxx
WEBHOOK_VERIFY_TOKEN=token_secreto
PORT=3000
NODE_ENV=development
```

### Frontend - Archivo `.env.local`

```
NEXT_PUBLIC_FIREBASE_API_KEY=tu_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=onlyflans.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=onlyflans
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=onlyflans.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 📱 Ejecutar

### Terminal 1 - Backend (Bot WhatsApp)

```bash
cd onlyflans
npm run dev
```

Verás un código QR en la consola. **Escanéalo con tu WhatsApp personal**.

### Terminal 2 - Frontend (Dashboard)

```bash
cd onlyflans-web
npm run dev
```

Accede a: `http://localhost:3000`

## 🎯 Flujo de Reclutamiento Automático

1. **Atracción**: Bot contacta candidatos por WhatsApp
2. **Calificación**: Recopila edad, colonia, formación
3. **Matching**: Asigna vacante automáticamente según algoritmo
4. **Inducción**: Envía detalles y horario
5. **Seguimiento**: Mantiene contacto post-contratación

## 💾 Base de Datos - Colecciones

- **vacantes**: Trabajos disponibles
- **candidatos**: Prospectos y empleados
- **rutasLogistica**: Rutas de entrega
- **configuracionBot**: Parámetros del sistema

## 🌐 Deploy en Vercel (Gratuito)

```bash
# Solo el frontend
cd onlyflans-web
vercel
```

Para el backend:
- Google Cloud Run (gratis hasta límite)
- Railway.app (gratis con repo GitHub)
- Render.com (gratis)

## 📊 Vacantes Precargadas

- **DAMAR**: $2,100 + $600 bono
- **ILSAN**: $2,288 libres
- **MAGNEKON/BREMBO**: Manufactura
- **Logística**: Rutas Santa María y Ciénega

## 🔐 Seguridad

- ✅ `.env` ignorado en git
- ✅ Variables sensibles protegidas
- ✅ Firestore rules configuradas
- ✅ WhatsApp personal (no público)

## 🛠️ Próximas Mejoras

- [ ] Integración con Facebook Ads
- [ ] Dashboard de reportes
- [ ] Exportar a Excel
- [ ] PWA mobile
- [ ] Google Play Store

## 📞 Soporte

Bot responde automáticamente. Revisa logs en consola para debugging.

---

**Creado con ❤️ para Monterrey - 100% Gratis**
