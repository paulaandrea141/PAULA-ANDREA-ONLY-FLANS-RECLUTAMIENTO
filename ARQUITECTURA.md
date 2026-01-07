# 🚀 ONLY FLANS - Arquitectura Reclutamiento Autónomo

## 📋 Visión General

Sistema de reclutamiento 100% autónomo y gratuito que utiliza:
- **Backend**: Node.js + Baileys (WhatsApp sin API Meta)
- **Frontend**: Next.js + Tailwind CSS (Cyberpunk Glassmorphism)
- **IA**: Groq SDK (llama-3.3-70b)
- **BD**: Firebase Firestore (Spark Plan)

**Flujo**:
```
WhatsApp Bot (Baileys) 
    ↓ (extrae datos candidatos)
Firebase Firestore
    ↓ (listeners en tiempo real)
Dashboard Frontend
    ↓ (IA analiza con Groq)
Clasificación automática
    ↓ (notificaciones a candidatos)
Embudo de Reclutamiento
```

---

## 🎨 Frontend Architecture

### Componentes Clave

#### 1. **RistraCandidatos** 
```tsx
<RistraCandidatos 
  maxItems={15} 
  filtroEtapa="Calificado" 
/>
```
- Horizontal scroll responsive
- Tarjetas con glassmorphism
- Progreso visual en tiempo real
- Badge de estados y scores

#### 2. **FireballSwitch**
```tsx
<FireballSwitch 
  onToggle={(state) => setIaEnabled(state)}
  label="IA BOT"
/>
```
- Toggle elegante para IA
- Efectos visuales fuego/hielo
- Estado persistente

#### 3. **Toast Notifications**
```tsx
const { toasts, show, remove } = useToast();
show('Candidato clasificado', 'success');
```
- Notificaciones sin dependencias
- Tipos: success, error, info, warning
- Auto-dismiss después de 3s

### Styles & Design System

#### **globals.css** - Glassmorphism Extremo
```css
/* Variables CSS customizadas */
--color-primary: #00f0ff (Cyan)
--color-secondary: #c026d3 (Purple)
--color-accent: #ec4899 (Pink)

/* Clases reutilizables */
.glass - Backdrop blur 10px
.glass-heavy - Backdrop blur 20px
.glass-neon - Gradiente cyan/purple
.glow-cyan - Text glow effect
.btn-primary - Botón gradiente cyan
```

#### **tailwind.config.js** - Extensiones
```js
extend: {
  colors: {
    cyberpunk: { dark, darker, cyan, purple, pink, green }
  },
  animation: {
    'pulse-glow': Efecto glow pulsante
    'float': Flotación suave
    'scan': Línea de escaneo
  },
  boxShadow: {
    'glow-cyan', 'glow-purple', 'glow-pink'
  }
}
```

### Estructura de Carpetas
```
components/
├── RistraCandidatos.tsx    (Listado horizontal de candidatos)
├── FireballSwitch.tsx       (Toggle IA on/off)
├── Toast.tsx                (Notificaciones)
├── LoadingSkeleton.tsx      (Placeholders)
└── ...otros componentes

hooks/
├── useVacantes.ts           (Firestore listeners)
├── useCandidatos.ts         (Real-time data)
└── useLeads.ts              (CRM listeners)

lib/
├── firebase.ts              (Config Firebase)
├── validators.ts            (Validación datos)
├── groqService.ts           (Integración IA)
└── ...servicios

types/
└── index.ts                 (Interfaces TypeScript)

pages/
├── index.tsx                (Dashboard principal)
├── candidatos.tsx           (Listado candidatos)
├── leads.tsx                (CRM leads)
└── vacantes.tsx             (Gestión vacantes)
```

---

## 🤖 IA Integration - Groq

### Setup

1. **Crear cuenta en Groq** (Gratis):
   ```bash
   https://console.groq.com/
   ```

2. **Obtener API Key**:
   - Settings → API Keys
   - Copiar a `.env.local`

3. **Variable de Entorno**:
   ```env
   NEXT_PUBLIC_GROQ_API_KEY=gsk_xxxxx
   ```

### Funcionalidades

#### **Análisis de Candidatos**
```typescript
import { groqService } from '@/lib/groqService';

const analisis = await groqService.analizarCandidato(
  nombre, edad, colonia, formacion, experiencia, 
  vacantesDisponibles
);

// Retorna:
{
  score: 75,
  etapa: "Calificado",
  razon: "Experiencia en manufactura",
  vacanteSugerida: "DAMAR",
  recomendaciones: [...]
}
```

#### **Generador de Mensajes**
```typescript
const mensaje = await groqService.generarMensajePersonalizado(
  nombre, puesto, salario
);
// "Hola Juan, tenemos puesto de Operario con $2100/mes..."
```

#### **Análisis de Feedback**
```typescript
const feedback = await groqService.analizarFeedback(
  "No me interesa, bajo salario"
);

// Retorna:
{
  sentimiento: "negativo",
  temas: ["salario", "interes"],
  accion: "Revisar propuesta de compensación"
}
```

### Costos
- **Groq API**: COMPLETAMENTE GRATIS
- Rate limit: 30 requests/minuto (suficiente para chatbot)
- Sin tarjeta de crédito requerida

---

## 💾 Firebase Setup

### Crear Proyecto Firebase

1. **Ir a** `https://console.firebase.google.com/`
2. **Crear nuevo proyecto**: "only-flans"
3. **Seleccionar Spark Plan** (gratis)

### Configurar Firestore

1. **Crear Firestore Database**:
   - Cloud Firestore → Crear base de datos
   - Modo de prueba (para desarrollo)
   - Región: `nam5` (USA)

2. **Crear Colecciones**:

```javascript
// vacantes
{
  empresa: "DAMAR",
  puesto: "Operario",
  salario: 2100,
  descripcion: "...",
  estado: "Activa",
  createdAt: timestamp
}

// candidatos
{
  nombre: "Juan Pérez",
  whatsapp: "+52161234567",
  edad: 28,
  colonia: "Santa María",
  etapa: "Calificado",
  score: 75,
  vacanteAsignada: "DAMAR",
  createdAt: timestamp
}

// leads
{
  nombre: "Maria López",
  telefono: "+52162345678",
  status: "nuevo|filtrado|citado|no_apto",
  lastContact: timestamp,
  fuenteLead: "whatsapp|facebook|referido"
}

// configuracionBot
{
  botStatus: "activo|inactivo",
  ultimaEjecucion: timestamp,
  candidatosHoy: 45
}
```

### Reglas de Seguridad (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Para desarrollo: permitir todo
    match /{document=**} {
      allow read, write: if true;
    }

    // Para producción: Agregar autenticación
    // match /candidatos/{document=**} {
    //   allow read: if request.auth != null;
    //   allow write: if request.auth.uid == resource.data.userId;
    // }
  }
}
```

### Backup & Datos

Firebase mantiene backups automáticos. Descargar datos:
```bash
firebase firestore:export gs://your-bucket/backup
```

---

## 🔌 Backend Integration (Baileys)

### Flujo de Datos

```
WhatsApp Bot (Node.js + Baileys)
    ↓
[Detecta: "Hola, busco trabajo"]
    ↓
Extrae: nombre, edad, colonia, skills
    ↓
Valida con Groq IA
    ↓
Guarda en Firebase/candidatos
    ↓
Frontend escucha cambios (listeners)
    ↓
Dashboard actualiza ristra en tiempo real
    ↓
Admin ve nuevo candidato
```

### Variables que el Bot Envía

```javascript
// El bot envía eventos WebSocket al frontend
{
  type: "nuevo_candidato",
  data: {
    nombre: "Juan",
    whatsapp: "+52161234567",
    edad: 28,
    colonia: "Centro",
    formacion: "Bachiller",
    etapa: "Prospecto"
  }
}
```

---

## 🚀 Deploy (100% Gratuito)

### Frontend - Vercel

```bash
# 1. Push a GitHub
git add .
git commit -m "Initial commit"
git push origin main

# 2. Conectar a Vercel
# https://vercel.com
# Importar repo
# Agregar env vars
# Deploy automático

# Cada push a main = nuevo deploy
```

### Backend - Railway

```bash
# 1. Crear railway.app account
# 2. Conectar repo GitHub
# 3. Variables de entorno
# 4. Deploy automático

# O en Google Cloud Run (aún más gratis)
```

---

## 📊 Monitoreo & Logs

### Firebase Console
- Firestore → Estadísticas
- Ver documentos en tiempo real
- Exportar datos

### Frontend Logs
```javascript
import { groqService } from '@/lib/groqService';

// Los errores se loggan automáticamente
// Ver en: DevTools → Console
```

---

## 🔐 Seguridad

### Best Practices

1. **Nunca commitear .env.local**
   ```bash
   # .gitignore
   .env.local
   .env.*.local
   ```

2. **Validar datos en cliente Y servidor**
   ```typescript
   const validation = validators.validateCandidato(data);
   if (!validation.valid) show(validation.errors[0], 'error');
   ```

3. **Sanitizar inputs**
   ```typescript
   const sanitized = validators.sanitizeString(userInput);
   ```

4. **Firebase Rules** (activar en producción)
   ```javascript
   allow read: if request.auth != null;
   allow write: if request.auth.uid == userId;
   ```

---

## 💰 Costos

| Servicio | Costo | Límites |
|----------|-------|---------|
| Firebase Firestore | $0 | 50k reads/día |
| Firebase Storage | $0 | 1GB/mes |
| Groq API | $0 | 30 requests/min |
| Vercel | $0 | 100GB bandwidth |
| Railway | $0 | $5/mes crédito |
| Baileys | $0 | Ilimitado (WA personal) |

**Total: $0** ✅

---

## 📱 Responsive Design

La ristra de candidatos es totalmente responsive:

```
Desktop (>1024px):
┌─────────────────────────────────────────┐
│ Card 1 │ Card 2 │ Card 3 │ Card 4 │ ... │
└─────────────────────────────────────────┘

Tablet (768px-1024px):
┌──────────────────────────────┐
│ Card 1 │ Card 2 │ Card 3 │...│
└──────────────────────────────┘

Mobile (<768px):
┌─────────────────┐
│ Card 1 │ Card...│
└─────────────────┘
(Scroll horizontal automático)
```

---

## 🎓 Próximos Pasos

- [ ] Agregar autenticación Firebase Auth
- [ ] Implementar exportación a Excel (JS puro)
- [ ] Dashboard de reportes con gráficos
- [ ] PWA offline support
- [ ] WebSockets para notificaciones push
- [ ] Bot en Telegram + Discord
- [ ] Página de estadísticas en tiempo real

---

## 📞 Soporte

Sistema completamente autónomo. Si encuentras bugs:

1. Revisar console del navegador (F12)
2. Revisar Firebase Console logs
3. Revisar terminal del backend

---

**Creado con ❤️ por Paula Andrea**
**Para Monterrey - 100% Gratis**
