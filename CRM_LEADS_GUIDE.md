# 📊 CRM de Leads - Documentación Técnica

## 🎯 Descripción General

Sistema de **CRM automatizado** para gestionar leads durante todo el embudo de reclutamiento en Only Flans.

**Cada interacción de WhatsApp se guarda automáticamente como un lead en Firestore**, permitiendo:
- Seguimiento completo del candidato
- Transición automática entre estados
- Historial de conversaciones
- Notas de agentes
- Programación de contactos

---

## 📁 Estructura de Datos

### Colección: `leads` (Firestore)

```typescript
interface Lead {
  id: string;                          // ID único (auto-generado)
  
  // DATOS PERSONALES
  nombre: string;                      // Juan Pérez
  telefono: string;                    // 525512345678
  edad: number;                        // 0-100
  colonia: string;                     // Santa María
  
  // ESTADO DEL LEAD
  status: 'nuevo'                      // Recién llegó, sin datos
         | 'filtrado'                  // Tiene datos básicos, en calificación
         | 'citado'                    // Confirmado, papelería + ruta ok
         | 'no_apto';                  // Rechazado, no cumple requisitos
  
  // INFORMACIÓN DE VACANTE
  vacanteId?: string;                  // ID de Firestore
  vacanteNombre?: string;              // Nombre de empresa
  vacanteSugerida?: string;            // "DAMAR", "ILSAN", "MAGNEKON"
  
  // PAPELERÍA Y TRANSPORTE
  papeleríaCompleta: boolean;          // ¿Tiene INE, RFC, comprobante?
  rutaTransporteSabe: boolean;         // ¿Conoce su ruta de transporte?
  
  // SEGUIMIENTO
  lastContact: number;                 // Timestamp último contacto
  proximoContacto?: number;            // Timestamp próximo contacto (opcional)
  notes: string;                       // "Cliente muy interesado", "Falta documentos"
  
  // HISTORIAL DE CONVERSACIÓN
  conversacionHistorico: Array<{
    autor: 'Bot' | 'Agente';
    mensaje: string;                   // "Hola Juan, tengo una oferta..."
    timestamp: number;
    tipo: 'Texto' | 'Imagen' | 'Nota';
  }>;
  
  // METADATOS
  fuenteLead: 'WhatsApp'               // Donde vino: WhatsApp, Facebook, etc
                | 'FacebookAds'
                | 'Formulario'
                | 'Manual';
  
  candidatoId?: string;                // Relación con colección Candidato
  score?: number;                      // Puntuación de calidad (0-100)
  fechaCreacion: number;               // Timestamp creación
  fechaActualizacion: number;          // Timestamp última modificación
}
```

---

## 🔄 Flujos de Estado

```
NUEVO → FILTRADO → CITADO → ASIGNADO (en Candidato)
   ↓         ↓        ↓
 ERROR    ERROR    ENTREVISTA
   ↓         ↓        ↓
  NO_APTO  NO_APTO  CONTRATADO
```

### 1️⃣ Estado "NUEVO"
**Cuando**: Lead acaba de escribir por WhatsApp
**Datos**: Solo teléfono
**Acciones**:
- Preguntar nombre
- Guardar respuesta en historial
- Transitar a "FILTRADO"

```text
Bot: "¡Hola! ¿Cuál es tu nombre?"
Candidato: "Juan García"
→ Status: FILTRADO
```

### 2️⃣ Estado "FILTRADO"
**Cuando**: Tenemos nombre y estamos recopilando más datos
**Datos**: Nombre, edad, colonia (parcialmente)
**Acciones**:
- Preguntar colonia
- Preguntar edad
- Validar que cumpla requisitos mínimos
- Si todo ok → CITADO
- Si no cumple → NO_APTO

```text
Bot: "¿En qué colonia vives?"
Candidato: "Santa María"
Bot: "¿Qué edad tienes?"
Candidato: "28"
Bot: "¿Tienes documentación completa? (INE, RFC)"
Candidato: "Sí, la tengo"
→ Status: CITADO
```

### 3️⃣ Estado "CITADO"
**Cuando**: Candidato confirmó papelería + conoce su ruta
**Datos**: Completo - nombre, edad, colonia, vacante
**Acciones**:
- Enviar detalles de entrevista
- Programar próximo contacto
- Transitar a Candidato (colección)

```text
Bot: "Perfecto! Tu entrevista está confirmada
📍 Av. Constitución 300, Monterrey
📅 Lunes a Viernes, 9 AM a 5 PM
📱 Tu gestor te contactará en 24h"
→ Status: CITADO (permanente hasta entrevista)
```

### 4️⃣ Estado "NO_APTO"
**Cuando**: No cumple requisitos
**Razones comunes**:
- "Edad fuera del rango (>60 años)"
- "No tiene documentación"
- "No puede trabajar en Monterrey"
- "Tatuajes en cara/cuello (restricción de vacante)"

```text
Bot: "Entiendo que tienes 65 años. 
Lamentablemente el rango es 18-60. 
Gracias por tu interés! 👋"
→ Status: NO_APTO
→ Nota: "Edad > 60"
```

---

## 🛠️ API del LeadService

### Crear Lead
```typescript
const leadId = await LeadService.crearLead({
  nombre: 'Juan Pérez',
  telefono: '525512345678',
  edad: 28,
  colonia: 'Santa María',
  status: 'nuevo',
  papeleríaCompleta: false,
  rutaTransporteSabe: false,
  lastContact: Date.now(),
  notes: 'Lead de WhatsApp',
  conversacionHistorico: [],
  fuenteLead: 'WhatsApp',
});
```

### Obtener Lead
```typescript
const lead = await LeadService.obtenerLead('leadId123');
const lead = await LeadService.obtenerLeadPorTelefono('525512345678');
```

### Actualizar Status
```typescript
// Status: nuevo → filtrado → citado → no_apto
await LeadService.actualizarStatus('leadId', 'filtrado');
```

### Marcar Como Citado (automático cuando confirma papelería)
```typescript
await LeadService.marcarComoCitado('leadId', 'Papelería confirmada');
// Automáticamente:
// - status: 'citado'
// - papeleríaCompleta: true
// - rutaTransporteSabe: true
// - Agrega nota al historial
```

### Marcar Como No Apto
```typescript
await LeadService.marcarComoNoApto('leadId', 'Edad > 60, fuera del rango requerido');
// Automáticamente:
// - status: 'no_apto'
// - Guarda razón en notes
// - Agrega nota al historial
```

### Agregar Nota
```typescript
await LeadService.agregarNota('leadId', 'Cliente muy interesado en turno nocturno', 'Agente');
```

### Agregar Mensaje al Historial
```typescript
await LeadService.agregarMensajeAHistorial(
  'leadId',
  '¿En qué colonia vives?',
  'Bot',
  'Texto'
);
```

### Programar Próximo Contacto
```typescript
const mañana = Date.now() + 24 * 60 * 60 * 1000;
await LeadService.programarProximoContacto('leadId', mañana);
```

### Obtener Leads por Status
```typescript
const nuevos = await LeadService.obtenerLeadsPorStatus('nuevo');
const filtrados = await LeadService.obtenerLeadsPorStatus('filtrado');
const citados = await LeadService.obtenerLeadsPorStatus('citado');
const noAptos = await LeadService.obtenerLeadsPorStatus('no_apto');
```

### Estadísticas del CRM
```typescript
const stats = await LeadService.obtenerEstadísticas();
// Retorna:
// {
//   total: 150,
//   nuevo: 30,
//   filtrado: 60,
//   citado: 45,
//   no_apto: 15,
//   tasaConversion: 30.00  // % citados de total
// }
```

### Leads que Necesitan Seguimiento
```typescript
const pendientes = await LeadService.obtenerLeadsParaSeguimiento();
// Retorna los 10 leads más antiguos sin contacto en 24h
```

---

## 🤖 Integración con Bot WhatsApp

### Flujo Automático

```typescript
// En whatsapp-bot-service.ts

async procesarMensajeEntrante(telefono, mensaje) {
  1. Buscar si existe lead con este teléfono
  2. Si NO existe → Crear lead nuevo (status: 'nuevo')
  3. Si existe → Procesar según su status actual
  4. Guardar mensaje en historial
  5. Responder según el estado
}
```

### Ejemplo Completo

**Usuario escribe en WhatsApp**: "Hola"

```typescript
// 1. Bot recibe: procesarMensajeEntrante('525512345678', 'Hola')

// 2. Busca lead existente
let lead = await LeadService.obtenerLeadPorTelefono('525512345678');
// → null (no existe)

// 3. Crea lead nuevo
lead = await LeadService.crearLead({
  nombre: 'Desconocido',
  telefono: '525512345678',
  edad: 0,
  colonia: '',
  status: 'nuevo',
  papeleríaCompleta: false,
  rutaTransporteSabe: false,
  lastContact: Date.now(),
  notes: 'Lead iniciado desde WhatsApp',
  conversacionHistorico: [
    { autor: 'Bot', mensaje: '👋 Bienvenido. ¿Cuál es tu nombre?', ... }
  ],
  fuenteLead: 'WhatsApp',
});

// 4. Procesa por status
await procesarPorStatusDelLead(lead, 'Hola');
// → como está en 'nuevo', llama procesarLeadNuevo()

// 5. procesarLeadNuevo() extrae el nombre "Hola"
// (En un caso real sería: "Juan García")
// → Actualiza status a 'filtrado'
// → Responde: "Gusto en conocerte Juan! 👋\n¿En cuál colonia vives?"
```

---

## 📊 Dashboard de Leads

Página: `/leads` en Next.js

**Visualiza**:
- Total de leads
- Desglose por status (nuevo, filtrado, citado, no_apto)
- Tabla con todos los leads
- Botón para cambiar status manualmente
- Último contacto formateado
- Link directo a WhatsApp

**Actualización**: Real-time cada 5 segundos

---

## 🔐 Firestore Rules

Para la colección `leads`, agregar:

```firestore
match /leads/{document=**} {
  // Leer: cualquiera (el bot necesita)
  allow read: if true;
  
  // Escribir: solo desde el backend autenticado
  allow write: if request.auth != null && request.auth.uid == 'bot_service';
}
```

---

## 📈 KPIs y Análisis

Desde LeadService.obtenerEstadísticas():

| Métrica | Significado |
|---------|-------------|
| `total` | Leads totales desde inicio |
| `nuevo` | Primer contacto, sin datos |
| `filtrado` | En proceso de calificación |
| `citado` | Confirmado, listo para entrevista |
| `no_apto` | Rechazado |
| `tasaConversion` | % de citados vs total |

**Meta**: Tasa de conversión > 30%

---

## 🚀 Próximas Mejoras

1. **Predicción de Score**: AI para predecir si es buen candidato
2. **Automatización de emails**: Confirmación de cita por email
3. **Reportes semanales**: Estadísticas automáticas
4. **Integración con calendario**: Agendar entrevistas
5. **Recordatorios automáticos**: "Entrevista mañana a las 9 AM"

---

## 🔗 Archivos Relacionados

- `src/services/lead-service.ts` - Lógica del CRM
- `src/bot/whatsapp-bot-service.ts` - Integración con bot
- `src/database/schema.ts` - Interfaces TypeScript
- `pages/leads.tsx` - Dashboard de leads (Frontend)

