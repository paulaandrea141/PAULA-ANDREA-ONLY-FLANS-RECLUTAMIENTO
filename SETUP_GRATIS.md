# 🚀 SETUP GRATIS - GUÍA PASO A PASO

**Para Paula Andrea - Sin dinero, todo funcional**

---

## 1️⃣ **GROQ API (IA GRATIS)**

### Paso 1: Crear cuenta en Groq
```
1. Ir a: https://console.groq.com/keys
2. Click en "Sign Up" (no necesita tarjeta)
3. Verificar email
4. Generar API Key
5. Copiar en .env.local: GROQ_API_KEY=tu_key_aqui
```

**¿Por qué Groq y no OpenAI?**
- ✅ API completamente gratis
- ✅ Sin límite de requests
- ✅ Modelos: Mixtral, LLaMA muy buenos
- ✅ No pide tarjeta de crédito
- ❌ OpenAI: pide tarjeta + $5 mínimo

---

## 2️⃣ **WHATSAPP (TU PERSONAL)**

### Paso 1: Usa tu teléfono personal
```bash
# El bot usa Baileys - no es WhatsApp Business
# Escanea QR con tu teléfono cuando levantes el servidor
# Y listo - funciona 100%
```

### Paso 2: No spam - 25-30 msgs/día máximo
```typescript
// En auto-publicador-service.ts
mensajesPorDia: 30 // ← No van a bannearte
delayEntreMensajes: 8000 // 8 segundos
```

**¿Cómo no te ban?**
- ✅ 25-30 mensajes/día = natural
- ✅ Delays de 8-15 segundos = no parece bot
- ✅ Mensajes en grupos públicos = permitido
- ✅ Sin invitar gente a grupos = más seguro
- ❌ 1000+ msgs/día = ban seguro
- ❌ Sin delays = ban seguro

---

## 3️⃣ **FIREBASE (GRATIS TIER)**

```
1. Ya está configurado
2. Free tier = 50k lecturas/día
3. Suficiente para 25-30 leads/día
4. SIN tarjeta requerida (pero pide para verificar)
```

---

## 4️⃣ **ESTRUCTURA GRATIS AHORA**

```
AHORA (Costo: $0):
✅ WhatsApp personal (Baileys)
✅ Groq API (gratis)
✅ Firebase (free tier)
✅ 25-30 publicaciones/día
✅ Conversación IA natural
✅ Extracción de datos automática
✅ Dashboard en tu computadora

DESPUÉS (Cuando tengas dinero):
🚀 WhatsApp Business API ($0.005/msg)
🚀 OpenAI GPT-4 ($20/mes)
🚀 Railway Premium
🚀 2000+ publicaciones/día
🚀 Escalado masivo
```

---

## 5️⃣ **VARIABLES DE ENTORNO (.env.local)**

```env
# Frontend
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx

# Backend
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY="xxx"
FIREBASE_CLIENT_EMAIL=xxx
GROQ_API_KEY=tu_groq_key_aqui
WHATSAPP_SESSION_NAME=onlyflans-bot
PORT=3000
```

---

## 6️⃣ **CÓMO INICIARLO**

### Terminal 1 - Backend
```bash
cd C:\Users\choco\Desktop\OnlyFlans
npm start
# Escanea QR con tu WhatsApp
```

### Terminal 2 - Frontend
```bash
cd C:\Users\choco\Desktop\onlyflans-web
npm run dev -- -p 3001
# Abre http://localhost:3001
```

---

## 7️⃣ **FLUJO COMPLETO (SIN PAGAR NADA)**

```
📱 Tú publicas "SE SOLICITA PERSONAL" en 20 grupos
   ↓
💬 Lead responde en WhatsApp personal
   ↓
🤖 Groq IA responde automáticamente (natural, sin parecer bot)
   ↓
📊 Datos se guardan en Firebase (gratis)
   ↓
📋 Tú ves en dashboard quiénes están citados
   ↓
✅ Citas confirmadas = Candidatos listos
```

---

## ⚠️ **IMPORTANTE - EVITAR BAN**

```
❌ NO HAGAS:
- 1000+ mensajes/día
- Mensajes cada 1 segundo
- Mismos grupos repetidamente
- Invitar gente a grupos propios
- Usar palabras prohibidas (links sospechosos)

✅ HAZLO ASÍ:
- 25-30 mensajes/día máximo
- Delays de 8-15 segundos
- Diferentes grupos cada día
- Solo responder en DM
- Mensajes naturales (con emojis, typos)
```

---

## 📊 **COSTOS MENSUALES**

| Servicio | Costo | Status |
|----------|-------|--------|
| WhatsApp Personal | $0 | Gratis |
| Groq API | $0 | Gratis |
| Firebase | $0 | Free tier |
| Railway | $5-10 | Optional, puedes dejar PC prendida |
| Vercel | $0 | Gratis |
| **TOTAL** | **$0-10** | ✅ Muy viable |

---

## 🎯 **NEXT STEPS**

1. ✅ Obtén API Key de Groq (5 min)
2. ✅ Pon en .env.local (2 min)
3. ✅ `npm start` (levanta backend)
4. ✅ Escanea QR (1 min)
5. ✅ Abre dashboard (frontend)
6. ✅ Prueba enviando un mensaje a ti mismo
7. ✅ Comienza a publicar en 3-5 grupos de prueba

**¿Preguntas?** Pregunta nomas, Paula.
