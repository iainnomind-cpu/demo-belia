# Spec Kit — Belia
## Traducción del DESIGN.md a los 5 bloques de Spec Kit para Antigravity

> Este archivo **no reemplaza** a `DESIGN_BELIA.md` — sigue siendo tu fuente de verdad de negocio. Esto es la traducción de ese documento al formato que Spec Kit espera, para que Antigravity construya sobre especificaciones ejecutables en vez de interpretar el DESIGN.md a su criterio.

---

## 0. Cómo conectar Spec Kit con Antigravity

Verifiqué esto antes de armar los bloques: **Spec Kit todavía no tiene integración oficial nativa con Antigravity** (hay issues abiertos en el repo de GitHub pidiéndolo). Pero sí hay un camino que ya funciona en la práctica, documentado incluso por Google en un codelab propio. Dos rutas, en orden de preferencia:

**Ruta 1 — Probar soporte nativo primero:**
```bash
specify init belia-app --integration antigravity
```
Si tu versión de `specify-cli` ya lo reconoce, listo. Si tira error de integración no encontrada, pasa a la Ruta 2.

**Ruta 2 — Estructura `.agent/` (la que ya está probada con Antigravity):**
```bash
specify init belia-app --integration copilot   # o cualquier base compatible
```
y luego agregar la carpeta `.agent/` con los workflows (`/speckit.*`) y skills (`@speckit.nombre`) — el proyecto comunitario `Spec-Kit-Antigravity-Skills` (github.com/compnew2006/Spec-Kit-Antigravity-Skills) ya trae esto armado para soltar en la raíz del proyecto. La estructura resultante:

```
.specify/
  memory/constitution.md      ← Bloque 1 vive aquí
.agent/
  workflows/                  ← comandos /speckit.*
  skills/                     ← @speckit.specify, @speckit.plan, etc.
specs/
  001-belia-storefront/
    spec.md                   ← Bloque 2
    plan.md                   ← Bloque 3
    tasks.md                  ← Bloque 4 (se genera solo)
```

Con esto, Antigravity puede invocar tanto el workflow completo (`/speckit.plan`) como una skill puntual (`@speckit.clarify`) sin perder el contexto acumulado.

**Orden de ejecución:**

```
/speckit.constitution  (Bloque 1)
       ↓
/speckit.specify       (Bloque 2)
       ↓
/speckit.clarify       (opcional, MUY recomendado aquí — ver nota abajo)
       ↓
/speckit.plan          (Bloque 3)
       ↓
/speckit.tasks         (Bloque 4 — sin prompt, se genera del plan)
       ↓
/speckit.analyze       (opcional, recomendado antes de implementar)
       ↓
/speckit.implement     (Bloque 5 — fase por fase, no todo de un jalón)
```

---

## 1. Bloque 1 — `/speckit.constitution`

Copia y pega esto tal cual:

```
/speckit.constitution Crea los principios de gobernanza del proyecto Belia (e-commerce + panel de gestión) con base en estas reglas no negociables:

CALIDAD DE CÓDIGO
- TypeScript estricto, sin uso de "any"
- Componentes tipados, sin lógica de negocio duplicada entre frontend y backend

SEGURIDAD (prioridad máxima)
- RLS (Row Level Security) activo en TODAS las tablas de Supabase desde el primer commit, nunca "lo agregamos después"
- Ninguna llamada a APIs externas (Google Sheets, Stripe, envía.com) se hace desde el frontend — siempre vía Supabase Edge Functions
- El precio de proveedor (price_proveedor) nunca se expone en una consulta pública, solo mediante vista/RPC filtrada por rol autenticado y aprobado
- Las credenciales externas viven solo en variables de entorno del backend, nunca con prefijo VITE_

CONSISTENCIA DE UX
- Se respeta el Design System de Belia: paleta (belia-red, belia-coral, belia-charcoal), tipografía definida, componentes reutilizables
- Regla de negocio dura: máximo 3 clics desde el home hasta cualquier ficha de producto
- Mobile-first: todo componente de navegación debe funcionar en responsive antes de darse por terminado

INTEGRIDAD DE DATOS
- La sincronización de catálogo desde Google Sheets nunca borra físicamente un producto, solo lo desactiva (para no romper el historial de pedidos ya facturados con ese producto)
- Los productos con origen "manual" (creados a mano en el admin) nunca son modificados por la sincronización automática

PROCESO DE DESARROLLO
- Una historia de usuario a la vez: no se avanza a la siguiente sin verificar en el navegador que la anterior funciona end-to-end
- Cero placeholders: ningún módulo se entrega con datos hardcodeados o elementos de interfaz sin función real (nada de "próximamente")
- Verificación manual en navegador por fase, no se asume TDD estricto salvo que se indique lo contrario

GIT
- Todos los commits deben usar la identidad iainnomind-cpu / ia.innomind@gmail.com para evitar bloqueos de deployment en Vercel
```

---

## 2. Bloque 2 — `/speckit.specify`

Esto describe el **qué y el por qué**, sin stack técnico — así lo pide Spec Kit. Copia y pega:

```
/speckit.specify Construye Belia, una plataforma de e-commerce de productos de belleza con tres superficies: tienda pública, panel de administración, y portal de solicitud de proveedores.

Historias de usuario, en orden de prioridad (cada una debe ser entregable y verificable de forma independiente):

P1 — Cliente compra un producto
Como cliente, quiero navegar el catálogo por categorías (con subcategorías que se despliegan al pasar el cursor sobre la categoría, similar a un menú tipo Sephora), buscar productos por nombre o marca, ver el detalle de un producto con su precio y disponibilidad, agregarlo al carrito, y completar la compra ingresando mi dirección de envío y pagando con tarjeta. Ningún producto debe requerir más de 3 clics desde el home para llegar a su ficha. Necesito poder crear una cuenta y ver mi historial de pedidos.

P2 — Administrador gestiona pedidos y clientes
Como administrador, quiero ver todos los pedidos recibidos, cambiar su estado (procesando, enviado, entregado, cancelado), y consultar un perfil consolidado de cada cliente que muestre su valor de vida acumulado (LTV) y si califica como cliente VIP.

P3 — Administrador sincroniza el catálogo desde una hoja de cálculo externa
Como administrador, quiero un botón que traiga los productos, precios, promociones y existencias desde una hoja de cálculo externa que yo mantengo, que me muestre un resumen de qué es nuevo, qué cambió y qué ya no está antes de aplicar los cambios, y que quede un registro histórico de cada sincronización.

P4 — Administrador controla el contenido visual y los productos destacados
Como administrador, quiero poder cambiar las imágenes del banner principal de la tienda (una imagen fija o un carrusel) y marcar manualmente qué productos se muestran como "más vendido" o "nuevo", sin que dependa de un cálculo automático basado en ventas.

P5 — Proveedor solicita acceso mayorista
Como proveedor, quiero llenar un formulario público con los datos de mi empresa para solicitar acceso a precios especiales. Como administrador, quiero revisar esas solicitudes y aprobarlas o rechazarlas. Una vez aprobado, el proveedor debe iniciar sesión y ver un precio distinto (de proveedor) al navegar el mismo catálogo que ven los clientes finales, y sus pedidos deben distinguirse de los pedidos al público general.

P6 — El pedido genera una guía de envío automáticamente
Como administrador, quiero que al confirmarse el pago de un pedido, el sistema cotice y genere automáticamente una guía de envío con un servicio de paquetería externo, y que el número de guía y estado de rastreo queden visibles en el pedido.

Criterios de aceptación transversales:
- Si falla una integración secundaria (ej. la generación de la guía de envío), el pedido ya pagado nunca debe perderse ni bloquearse — el error se registra pero el flujo principal continúa.
- Ningún dato de negocio se pierde: desactivar un producto o proveedor nunca implica borrarlo físicamente si tiene historial asociado.
```

**Nota:** después de este bloque, corre `/speckit.clarify` antes de seguir. Sabemos que hay puntos abiertos reales — la estructura de categorías todavía no existe, y la estrategia de precio de proveedor (absoluto vs. % de descuento) no está confirmada por el cliente. Es exactamente el tipo de ambigüedad que `/speckit.clarify` está diseñado para sacar a la luz antes de que se convierta en retrabajo. Si te pregunta por esto, respóndele con lo que ya está en la sección 9 del DESIGN.md.

---

## 3. Bloque 3 — `/speckit.plan`

Aquí sí entra el stack técnico. Copia y pega:

```
/speckit.plan El frontend usa React 18 + Vite + TypeScript, Tailwind CSS para estilos, Framer Motion para animaciones. Zustand se usa únicamente para estado de interfaz efímero (carrito abierto/cerrado, modales) — nunca para datos de negocio.

El backend es Supabase: Postgres con Row Level Security activo desde el primer commit, Supabase Auth con tres roles (cliente, proveedor, admin), y Supabase Storage para imágenes de producto y banners.

La sincronización con Google Sheets (API v4, cuenta de servicio de solo lectura) y la generación de guías con envía.com se ejecutan exclusivamente en Supabase Edge Functions — el frontend nunca las llama directamente.

Los pagos se procesan con Stripe (Payment Intents), evaluando habilitar OXXO y SPEI como métodos adicionales para clientes en México.

El catálogo se modela por producto individual (sku, nombre, categoría, marca, stock, precio público, precio promocional opcional, precio proveedor opcional, etiqueta de destacado tipo "TOP 1"/"TOP 2") — todavía sin un modelo de variantes de tono separado, porque la fuente real de datos (la hoja de cálculo que mantiene el cliente) no lo separa así hoy. El modelo de variantes queda como mejora futura, no como parte de este plan.

Despliegue: frontend en Vercel, backend/base de datos en Supabase, ambos conectados al mismo repositorio de GitHub. Los commits deben usar la identidad iainnomind-cpu para no bloquear el deployment en Vercel.
```

---

## 4. Bloque 4 — `/speckit.tasks`

No lleva prompt adicional:

```
/speckit.tasks
```

Esto genera `tasks.md` organizado por historia de usuario (P1 a P6), con marcadores `[P]` para tareas paralelizables. Una cosa a vigilar: Spec Kit por defecto puede incluir una estructura fuerte de TDD (tareas de test antes de cada implementación). Dado que tu método de verificación es manual en navegador por fase (no suites de test automatizadas), si ves que genera demasiado andamiaje de testing, dile explícitamente:

```
Simplifica las tareas de testing: quiero verificación manual en navegador por historia de usuario, siguiendo el checklist de la metodología Innomind, no una suite de pruebas automatizadas completa.
```

Antes de implementar, corre `/speckit.analyze` — cruza spec.md, plan.md y tasks.md buscando huecos o contradicciones entre los tres documentos. Es barato correrlo aquí y caro descubrir el hueco a la mitad de la Fase 6.

---

## 5. Bloque 5 — `/speckit.implement`

Aquí es donde se conecta con tu regla de "una fase a la vez". No corras `/speckit.implement` a secas la primera vez — esto ejecutaría las 6 historias de usuario seguidas. En su lugar:

```
/speckit.implement Implementa únicamente las tareas de la User Story 1 (P1: Cliente compra un producto). No avances a la User Story 2. Detente al terminar y espera mi confirmación en el navegador.
```

Y al confirmar cada fase, repites con la plantilla que ya usas en tu metodología:

```
User Story 1 funcionando correctamente. Verifiqué [lo que probaste].

/speckit.implement Continúa con la User Story 2 (P2: Administrador gestiona pedidos y clientes). Detente al terminar y espera mi confirmación.
```

Así conservas exactamente el mismo ritmo de verificación por fase que ya documentaste en `METODOLOGIA_INNOMIND.md`, pero ahora cada fase corresponde a una historia de usuario con criterios de aceptación explícitos en `spec.md`, en vez de depender de que Antigravity interprete el DESIGN.md libremente.

---

## 6. Comandos opcionales que valen la pena aquí

| Comando | Cuándo usarlo en Belia |
|---|---|
| `/speckit.clarify` | Justo después de `/speckit.specify` — hay ambigüedad real (categorías, precio proveedor) que conviene resolver antes de planear |
| `/speckit.analyze` | Después de `/speckit.tasks`, antes de `/speckit.implement` — detecta huecos entre spec/plan/tasks |
| `/speckit.checklist` | Antes de dar por cerrada la User Story 5 (Proveedores) — genera un checklist de calidad específico para validar el flujo de aprobación |
| `/speckit.taskstoissues` | Si en algún punto quieres llevar `tasks.md` a GitHub Issues para que Edgar dé seguimiento sin abrir Antigravity |
| `/speckit.converge` | Al final, para que evalúe el código contra spec/plan/tasks y te diga qué quedó pendiente antes de la entrega al cliente |

---

## 7. Resumen del flujo completo

```
DESIGN_BELIA.md (fuente de verdad de negocio, ya existe)
       ↓ se traduce a
/speckit.constitution → /speckit.specify → /speckit.clarify →
/speckit.plan → /speckit.tasks → /speckit.analyze →
/speckit.implement (User Story 1) → confirmar en navegador →
/speckit.implement (User Story 2) → confirmar en navegador →
... hasta User Story 6 →
/speckit.converge → checklist de entrega (Parte 8 de METODOLOGIA_INNOMIND) →
deploy (GitHub → Vercel → Supabase config)
```
