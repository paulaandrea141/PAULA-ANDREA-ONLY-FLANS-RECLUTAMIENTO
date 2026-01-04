# 📱 Integración Facebook Ads - Solo Flans

## 🎯 ¿Qué es?

Integración **100% GRATUITA** con Facebook Ads Lead Forms. Los leads van automáticamente a:
1. Base de datos Firestore como **Candidatos**
2. Flujo WhatsApp automatizado (Baileys)
3. Seguimiento en dashboard

## 💰 Costo

- **Facebook Ads Campaigns**: ¿Cuánto quieras invertir (tu decisión)*
- **Lead Form Integration**: $0
- **Conversions API**: $0
- **Facebook Pixel**: $0

*La campaña de ads tiene costo según presupuesto, pero la integración técnica es gratis.

---

## 🚀 Configuración Rápida

### 1️⃣ Obtener credenciales de Facebook

```bash
# Ve a: https://developers.facebook.com/apps
# Crea una nueva app → tipo "Business"
# Ve a Settings → Basic
# Copia: App ID, App Secret

# Ve a Messenger → Settings
# Genera: Page Access Token
```

### 2️⃣ Agregar variables de entorno

```env
# .env

# Facebook Ads
FACEBOOK_ACCESS_TOKEN=tu_access_token_aqui
FACEBOOK_PAGE_ACCESS_TOKEN=tu_page_token_aqui
FACEBOOK_PIXEL_ID=tu_pixel_id_aqui
FACEBOOK_WEBHOOK_TOKEN=token_secreto_aleatorio

# WhatsApp (ya existente)
FACEBOOK_WHATSAPP_ACCESS_TOKEN=...
FACEBOOK_WHATSAPP_PHONE_NUMBER_ID=...
```

### 3️⃣ Configurar Lead Form en Facebook

```
1. Facebook Ads Manager → Campaigns → Nueva Campaña
2. Objetivo: "Generar leads"
3. Ad Set → Placement: Feed de Facebook/Instagram
4. Creative → Form: "Lead Form"
5. Campos del formulario:
   - Nombre completo (requerido)
   - Teléfono (requerido)
   - Email (opcional)
6. Envío de leads: Webhook
7. URL Webhook: https://tu-dominio.com/webhook/facebook
8. Token de verificación: (el que pusiste en FACEBOOK_WEBHOOK_TOKEN)
```

### 4️⃣ Configurar Conversions API (seguimiento)

```
Facebook Ads Manager → Conversiones:
1. Ir a: Events Manager
2. Seleccionar: Tu Pixel
3. Connections → Conversions API
4. Generar: "Conversion API Access Token"
5. Agregar a .env:
   FACEBOOK_CONVERSIONS_API_TOKEN=...
```

---

## 📊 Flujo Automático

```
Facebook Ads Lead Form
        ↓
   Persona completa form
        ↓
Webhook POST a /webhook/facebook
        ↓
FacebookLeadsService.procesarLeadFacebook()
        ↓
┌─────────────────────────────┐
│ 1. Extraer datos             │
│    - Nombre                  │
│    - Teléfono                │
│    - Email (opcional)        │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│ 2. Verificar si ya existe    │
│    (evitar duplicados)       │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│ 3. Crear candidato en        │
│    Firestore (etapa:         │
│    "Prospecto")              │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│ 4. Reportar conversión       │
│    a Facebook Pixel          │
│    (para ads optimization)   │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│ 5. Enviar primer mensaje     │
│    por WhatsApp (Baileys)    │
│    "¡Hola! Vimos que te      │
│     interesa..."             │
└─────────────────────────────┘
        ↓
Bot WhatsApp inicia flujo
Atracción → Calificación → Asignación
```

---

## 🔧 API Endpoints

### GET `/webhook/facebook`
**Propósito**: Verificación inicial de Facebook

```bash
GET https://tu-dominio.com/webhook/facebook?
  hub_mode=subscribe&
  hub_verify_token=token_secreto_aleatorio&
  hub_challenge=CHALLENGE_VALUE
```

**Respuesta**: Devuelve el challenge value si el token es válido

### POST `/webhook/facebook`
**Propósito**: Recibir leads completados

```json
{
  "entry": [
    {
      "changes": [
        {
          "field": "leadgen",
          "value": {
            "leadgen_id": "123456789",
            "form_id": "987654321",
            "created_time": "2026-01-04T10:30:00Z"
          }
        }
      ]
    }
  ]
}
```

**Respuesta**:
```json
{
  "success": true
}
```

---

## 📈 Monitoreo en Dashboard

La integración automáticamente:

1. ✅ Crea candidatos en `Candidatos` colección
2. ✅ Etiqueta como "Prospecto" 
3. ✅ Guarda teléfono de WhatsApp
4. ✅ Inicia contacto automático

**En dashboard Next.js**:
- Ve a `/candidatos`
- Filtra por etapa: "Prospecto"
- Verás los leads de Facebook

---

## 🎬 Ejemplo: Crear Campaña de Prueba

```
Presupuesto: $100 MXN
Duración: 7 días
Ubicación: Monterrey, México
Edad: 18-45 años
Géneros: Todos

Textos del anuncio:
"💼 ¡Trabajá con nosotros!
Estamos buscando personas comprometidas.
Completa el formulario → Entrevista por WhatsApp
Salarios desde $2,100 MXN 💰"

CTA: "Solicitar Empleo"
```

Facebook automáticamente:
- Mostrará el anuncio a 50k personas
- Capturará leads en el form
- Enviará datos a tu webhook
- Tu bot los contactará por WhatsApp

---

## 🔐 Seguridad

El webhook valida:

```typescript
// En facebook-leads-service.ts
private validarWebhookFacebook(verifyToken, mode, challenge) {
  if (verifyToken === process.env.FACEBOOK_WEBHOOK_TOKEN) {
    return challenge; // ✅ Válido
  }
  return null; // ❌ Rechazado
}
```

**Importante**: Usa un token fuerte y único en `.env`

---

## 🐛 Troubleshooting

### "Webhook verification failed"
- ✅ Verifica que `FACEBOOK_WEBHOOK_TOKEN` sea idéntico en código y Facebook
- ✅ Asegúrate que tu servidor esté corriendo (puerto 3000 o el que uses)
- ✅ La URL debe ser HTTPS en producción

### "No se crean candidatos"
- ✅ Revisa que Firebase esté funcionando
- ✅ Verifica que `FACEBOOK_ACCESS_TOKEN` sea válido
- ✅ Mira logs: `npm run dev` mostrará errores

### "Los leads no llegan al webhook"
- ✅ En Ads Manager, verifica que el webhook esté "Activo"
- ✅ Completa un lead de prueba
- ✅ Revisa la sección "Activity" en Ads Manager

---

## 💡 Tips Avanzados

### 1. Píxel de Facebook (opcional, para seguimiento)

```html
<!-- En tu página web, agregar -->
<script>
  fbq('track', 'Lead', {
    value: 0,
    currency: 'MXN',
    content_name: 'Recruitment Candidate'
  });
</script>
```

### 2. A/B Testing de Ads

```
Test A: "Eres joven y buscas crecer? 📈"
Test B: "Gana hasta $3,000 MXN 💰"
Test C: "Estamos en Monterrey, ¿te sumas? 🏙️"

Verás cuál genera más leads. Facebook Ads automáticamente 
optimiza y muestra más el que convierte.
```

### 3. Audiencias Personalizadas

```
Crear audiencia en Ads Manager:
- Profesionales de logística
- Edad: 25-50
- Ubicación: Monterrey, área metropolitana
- Intereses: Empleo, carrera profesional
```

---

## 📝 Notas Finales

- **Costo total de integración**: $0 MXN ✅
- **Tiempo de setup**: 15 minutos
- **Mantenimiento**: Mínimo (automático)
- **ROI**: Depende de tu presupuesto en ads

El código maneja automáticamente:
- Validación de webhooks ✅
- Deduplicación de leads ✅
- Creación de candidatos ✅
- Reporting a Facebook ✅
- Contacto por WhatsApp ✅

¡Listo para escalar tu reclutamiento! 🚀
