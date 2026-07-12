# DESIGN.md — Belia
## Plataforma E-commerce + Sistema de Gestión Integral

> **Cliente:** Belia (belleza y cuidado capilar)
> **Proyecto:** Innomind
> **Versión:** 2.0 — Post-retroalimentación de cliente (sustituye la demo Zustand-only descrita en README.md)
> **Metodología:** Innomind (Spec-Driven Development) + Spec Kit
> **Fuente de verdad:** este documento. El código se ajusta al DESIGN, no al revés.

---

## 0. Resumen ejecutivo

La demo aprobada (React 18 + Vite + TS + Tailwind + Framer Motion + Zustand + React Router, documentada en README.md) valida la experiencia de usuario y el flujo general, pero es un **prototipo de estado en memoria**: no hay base de datos real, el catálogo es data local hardcodeada, y el admin no tiene persistencia entre sesiones.

Con la retro del cliente, el sistema deja de ser un MVP y pasa a ser un **desarrollo completo**. Los cambios estructurales más importantes:

1. **Backend real con Supabase** (Postgres + Auth + Storage + RLS) reemplazando Zustand como fuente de datos.
2. **Catálogo por variantes**, no por producto-por-tono. Un tinte es un producto con N variantes (tono/gama), no N productos.
3. **Sincronización de catálogo desde Google Sheets** con detección de altas, bajas y cambios de precio/stock.
4. **Módulo de Proveedores**: solicitud pública → aprobación en admin → acceso a precio de proveedor.
5. **Navegación por mega-menú** (categorías/subcategorías dinámicas, estilo Sephora) con regla de 3 clics máximo.
6. **Contenido 100% administrable**: banners, carrusel, destacados manuales — cero valores hardcodeados en el frontend.

Ninguna fase debe entregarse con datos de prueba hardcodeados ni elementos de interfaz sin función real (nada de botones "próximamente"): si un módulo no está listo, no se muestra.

---

## 1. Identidad visual (Design System)

Extraído del logo y manual de marca proporcionados.

### 1.1 Paleta de color

| Token | Uso | Aproximación HEX* |
|---|---|---|
| `belia-red` | Color primario — CTAs, logo, acentos de marca | `#F6423C` |
| `belia-coral` | Secundario — hovers, degradados, fondos suaves de acento | `#FB7A76` |
| `belia-charcoal` | Texto principal, fondos oscuros, variante de logo en negro | `#232323` |
| `belia-white` | Fondos limpios, variante de logo en blanco | `#FFFFFF` |
| `belia-gray` (nuevo, sugerido) | Bordes, fondos neutros, variante de logo en gris | `#9A9A9A` |

\* *Los HEX son una estimación visual extraída de la imagen del manual de marca (compresión JPEG). Antes de fijarlos en `tailwind.config`, confírmalos con el eyedropper sobre el archivo original de Canva o el sitio `.com.mx` del cliente (la reunión confirma que ahí se puede extraer el pantone exacto).*

### 1.2 Tipografía

El manual de marca especifica **TT Norms** (bold/regular, mayúsculas/minúsculas). Es una fuente comercial de TypeType.

- **Verificar licencia de uso web** (`@font-face` / Adobe Fonts / TypeType webfont license) antes de integrarla.
- Si no hay licencia disponible, alternativa geométrica gratuita muy cercana: **Plus Jakarta Sans** o **Poppins**.
- Regla del cliente (explícita en la reunión): **máximo 2 tipografías** — una para títulos, otra para texto de cuerpo. No usar una tercera.

### 1.3 Logo

Isotipo circular con degradado, ícono de "b" con trazo tipo mechón/llama, wordmark en minúsculas geométricas. Variantes provistas: rojo (fondo claro), gris (uso secundario/desactivado), negro (fondo claro alternativo). Falta una variante para fondo oscuro (blanco sobre transparente) — agregar a fase de assets.

### 1.4 Tailwind config (extensión sugerida)

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      belia: {
        red: '#F6423C',
        coral: '#FB7A76',
        charcoal: '#232323',
        gray: '#9A9A9A',
        white: '#FFFFFF',
      }
    },
    fontFamily: {
      heading: ['"TT Norms"', 'sans-serif'],
      body: ['"TT Norms"', 'sans-serif'],
    }
  }
}
```

---

## 2. Arquitectura técnica

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Se conserva de la demo |
| Estilos | Tailwind CSS | Se conserva |
| Animaciones | Framer Motion | Se conserva |
| Estado UI (no datos) | Zustand | Se conserva solo para estado de UI efímero (carrito abierto/cerrado, modales). **Los datos de negocio ya no viven en Zustand**, viven en Supabase. |
| Backend / DB | Supabase (Postgres + Auth + Storage + Edge Functions) | Nuevo |
| Autenticación | Supabase Auth (email/password) | Roles: `cliente`, `proveedor`, `admin` |
| Catálogo externo | Google Sheets API v4 (service account) | Solo lectura, llamado desde backend/Edge Function — **nunca desde el frontend** |
| Envíos | envia.com API | Llamado desde backend tras crear pedido |
| Pagos | **Stripe** (confirmado por cliente) | Considerar habilitar métodos locales de Stripe para México (OXXO y SPEI), además de tarjeta — común para e-commerce de belleza en MX donde una parte de los clientes prefiere pago en efectivo/transferencia. Definir en Fase 6 si se activan desde el arranque o se dejan para una segunda iteración. |
| Hosting | Vercel (frontend) + Supabase (backend/DB) | Sin Railway; todo lo server-side vive en Supabase Edge Functions |

**Regla de integración externa (heredada de tu metodología):** frontend nunca llama a Google Sheets, envia.com o el proveedor de pagos directamente. Todo pasa por Supabase Edge Functions. Credenciales sensibles solo en variables de entorno de Supabase, nunca en `VITE_*`.

---

## 3. Modelo de datos (Supabase)

```
brands
  id, name, logo_url, active

categories
  id, name, slug, parent_id (nullable → subcategoría), order, active
  -- self-referencial: parent_id NULL = categoría raíz, parent_id != NULL = subcategoría

color_families
  id, name (ej. "Rubio", "Castaño", "Cobrizo", "Negro")
  -- taxonomía CANÓNICA, independiente de cómo cada marca nombra sus tonos

products
  id, sku, name, description, brand_id, category_id, subcategory_id (nullable — aún no definida por el cliente),
  base_image_url, stock, price_publico, price_promo (nullable), price_proveedor (nullable),
  featured_label (texto libre, ej "TOP 1", "TOP 2" — mapea directo a la columna I de la plantilla real del cliente),
  tone_code (nullable, texto libre — ej "6.12", tal como viene embebido en el Título por ahora),
  color_family_id (nullable — se llena después, cuando exista taxonomía de color),
  source ('manual' | 'sheet'), active, last_synced_at

product_variants   -- ver nota de alcance en 5.3: se activa en una fase posterior,
                    -- no en la carga inicial desde la plantilla real
  id, product_id, sku_variant, tone_code, tone_name, color_family_id,
  image_url (nullable, hereda de product si es null),
  stock, price_publico, price_promo, price_proveedor, active

product_images
  id, product_id, url, order   -- soporta carrusel de imágenes

customers
  id, user_id (fk auth.users), nombre, email, telefono, ltv, is_vip, created_at
  -- LTV y VIP se calculan automático (se conserva la lógica de la demo)

orders
  id, customer_id, tipo ('publico' | 'mayoreo'), status, subtotal, shipping_cost, total,
  shipping_address (jsonb), envia_shipment_id, tracking_number, created_at

order_items
  id, order_id, variant_id, quantity, unit_price, subtotal

suppliers
  id, empresa, contacto_nombre, email, telefono, rfc, categoria_interes,
  status ('pendiente' | 'aprobado' | 'rechazado'), notes_admin,
  requested_at, reviewed_at, reviewed_by, user_id (fk auth.users, nullable hasta aprobar)

sync_logs
  id, source ('google_sheets'), started_at, finished_at,
  new_count, updated_count, deactivated_count, status, error_message,
  triggered_by, raw_diff (jsonb)

site_content
  id, section_key (ej "home_hero", "home_carousel"), type ('image' | 'carousel'),
  content (jsonb), active
```

### 3.1 Seguridad (RLS)

| Tabla | Lectura pública | Escritura |
|---|---|---|
| `products`, `product_variants`, `categories`, `brands` | Sí (solo `active = true`, y **sin** `price_proveedor`) | Solo admin |
| `product_variants.price_proveedor` | **No** vía select directo — exponer solo a través de una vista/RPC filtrada por rol `proveedor` autenticado y aprobado | Solo admin / sync |
| `customers`, `orders` | Solo el dueño (`user_id = auth.uid()`) o admin | Dueño (crear su propio pedido) / admin (todo) |
| `suppliers` | No | Insert público (solo creación de solicitud) / admin controla status |
| `sync_logs` | No | Solo admin (lectura), solo Edge Function (escritura) |

---

## 4. Módulos del sistema

### 4.1 Storefront público (`/`)

- **Header con mega-menú** estilo Sephora: hover sobre categoría → despliega subcategorías automáticamente. Categorías/subcategorías se leen de la tabla `categories`, **no están hardcodeadas** — el cliente ya dijo que la estructura la va a definir él y puede cambiar.
- **Buscador** (nombre, marca, tono, código de tono, SKU).
- **Filtros laterales**: categoría, subcategoría, marca, familia de color (canónica), rango de precio.
- **Regla de negocio dura: máximo 3 clics** desde home hasta cualquier ficha de producto. Esto condiciona el diseño del árbol de navegación — validar en cada fase de QA.
- **Ficha de producto con variantes**: selector de tono/gama dentro de la misma ficha (no productos separados). Cada variante tiene su propio stock y precio, imagen opcional (si no tiene, hereda la imagen base del producto).
- **Carrito** (`CartSidebar`): un solo paso de checkout, ahora persistido en Supabase, no en memoria.
- **Cuenta de usuario**: registro/login con Supabase Auth. Al registrarse se crea automáticamente el perfil en `customers`.
- **Checkout**: dirección de envío → cotización/generación de guía vía envía.com → pago (pendiente definir proveedor) → creación de `order` + `order_items`.
- **Responsive**: menú de hamburguesa en móvil, mismo mega-menú colapsado.
- **Contenido customizable**: banner hero e imágenes de categoría se gestionan desde `site_content` (imagen fija o carrusel), editables desde el admin sin deploy.

### 4.2 Panel Admin (`/admin`)

> **Nota de seguridad:** el README actual dice que el admin está "simulado sin contraseña para fines de demo". Esto **debe cambiar** en el desarrollo completo — el admin requiere autenticación real con rol `admin` vía Supabase Auth + RLS.

- **Pedidos** (`/admin/orders`): listar, cambiar estado (Procesando / Enviado / Entregado / Cancelado), ver dirección y guía de envío. Distinguir visualmente pedidos `publico` vs `mayoreo`.
- **CRM de Clientes** (`/admin/customers`): se conserva la lógica de LTV automático y etiqueta VIP de la demo, ahora sobre datos reales de Supabase.
- **Inventario/Catálogo** (`/admin/products`):
  - Alta/edición manual de productos y variantes (para productos que no vienen de Sheets).
  - **Botón "Sincronizar catálogo"** (ver sección 5).
  - Control manual de destacados: toggles `is_featured_bestseller` y `is_featured_new` por producto — **el cliente fue explícito: no quiere que "más vendidos" sea automático por ventas.**
- **Proveedores** (`/admin/suppliers`, nuevo): ver sección 6.
- **Contenido visual** (`/admin/content`, nuevo): gestión de banners/carrusel de home y categorías (tabla `site_content`).
- **Categorías** (`/admin/categories`, nuevo): CRUD de categorías/subcategorías con orden — alimenta el mega-menú del storefront en tiempo real.

### 4.3 Badges de estado (consistencia visual, mismo patrón que tu sistema CFDI)

| Estado de pedido | Color |
|---|---|
| Procesando | Amarillo |
| Enviado | Azul |
| Entregado | Verde |
| Cancelado | Rojo |

| Estado de proveedor | Color |
|---|---|
| Pendiente | Amarillo |
| Aprobado | Verde |
| Rechazado | Rojo |

---

## 5. Sincronización de catálogo (Google Sheets)

### 5.1 Estructura real de la hoja ("PLANTILLA BELIA")

El cliente ya tiene la hoja creada y la va a mantener él mismo. Esta es la estructura real (confirmada por captura), no una plantilla ideal — el sistema se adapta a esto, no al revés:

| Columna Sheet | Campo en sistema | Tipo | Obligatorio | Nota |
|---|---|---|---|---|
| A `Código` | `sku` | texto | Sí (llave única de sync) | Código de barras/SKU |
| B `Título` | `name` | texto | Sí | Incluye marca y a veces el tono/tamaño en el mismo texto (ej. "TINTE KUUL 6.12 90 ML") |
| C `Categoria` | `category` | texto | Vacía por ahora | El cliente aún no define la taxonomía — ver 5.3 y sección 9 |
| D `Descripción` | `description` | texto | Sí | |
| E `Stock` | `stock` | entero | Sí | |
| F `Precio` | `price_publico` | número | Sí | |
| G `Promo` | `price_promo` | número | No | Precio promocional opcional, si está vacío se usa `price_publico` |
| H `Marca` | `brand` | texto | Sí | |
| I *(sin header formal aún, ejemplo "TOP 1/2/3")* | `featured_label` | texto | No | **Resuelve el requerimiento de destacados manuales** — sugerir al cliente formalizar el header como `Destacado` y usar valores tipo "TOP 1", "TOP 2", "TOP 3" o dejar vacío |

**Columnas que faltan y hay que agregar cuando el cliente decida su estrategia de proveedores** (ver 6.3): una columna `Precio Proveedor` o `Descuento Proveedor %`, según la opción que se elija.

No hay columna `activo`: por ahora, un producto se considera activo mientras exista en la hoja con `Stock > 0`; si el cliente borra la fila o pone stock en 0, el sync lo desactiva (ver 5.2).

### 5.2 Lógica de sincronización

1. Admin da clic en **"Sincronizar catálogo"**.
2. Edge Function (backend) lee la hoja vía Google Sheets API (service account con acceso de solo lectura).
3. Compara cada fila contra `product_variants` usando `sku_variant` como llave:
   - **No existe en DB** → se marca como **nuevo** (insert pendiente).
   - **Existe y hay diferencias** (precio, stock, nombre, activo) → se marca como **actualización**.
   - **Existe en DB con `source = 'sheet'` pero ya no está en la hoja** → se marca como **desactivación** (nunca se borra físicamente, para no romper el historial de pedidos ya facturados con ese `variant_id`).
   - **Productos con `source = 'manual'`** (creados a mano en el admin) → el sync **nunca los toca**.
4. Se muestra un **preview del diff** antes de aplicar: "X nuevos, Y actualizados, Z desactivados" con detalle expandible.
5. Admin confirma → se aplican los cambios → se guarda un registro en `sync_logs`.

> Diseño intencional: el sync **no aplica cambios a ciegas**. Esto evita que un error de captura en la hoja tumbe precios en producción sin que nadie lo vea. Si prefieres aplicar directo sin preview, es un cambio menor de una línea en el flujo — pero para un catálogo con precios reales, el preview es la práctica correcta.

### 5.3 Ajuste de alcance: tono/variantes vs. la hoja real

En la reunión, el cliente quería evitar 143 productos separados por cada tono de una misma línea de tinte, agrupándolos como variantes de un solo producto. Pero la plantilla real que va a mantener **no tiene columnas separadas para tono/gama** — el tono viene embebido como texto libre dentro del `Título` (ej. "TINTE KUUL 6.12 90 ML"), y cada tono es su propia fila con su propio `Código`.

Dado que **las categorías tampoco están definidas todavía**, la decisión más honesta es no sobre-construir el modelo de variantes en esta primera fase:

- **Fase 4 (inicial):** cada fila de la hoja = un `product` independiente (no variante). El storefront lo muestra como un producto normal. Esto es exactamente cómo lo maneja el cliente hoy, así que no le cambia su manera de capturar nada.
- **Fase posterior (mejora, no bloqueante):** una vez que el cliente defina categorías y decida si quiere invertir en separar tono/gama en columnas propias, se activa `product_variants` y se agrupan por línea (ej. todos los "TINTE KUUL 6.1x" bajo un mismo producto padre). Esto se puede hacer con una herramienta de "fusionar productos" en el admin, sin tocar la hoja del cliente.
- `color_family` (Rubios, Castaños...) se difiere igual: no se puede clasificar de forma confiable sin que el cliente lo indique explícitamente (razón ya señalada en la reunión — la numeración no es universal entre marcas), así que no se infiere automáticamente. Cuando el cliente quiera activar el filtro por familia de color, se agrega como columna adicional en el sheet.

Este ajuste evita construir una capa de complejidad (variantes + taxonomía de color) sobre datos que todavía no existen, mientras se conserva el modelo de datos (sección 3) ya preparado para crecer hacia allá cuando el cliente esté listo.

---

## 6. Módulo de Proveedores

### 6.1 Flujo

1. **Formulario público** (`/proveedores`, nuevo): empresa, nombre de contacto, email, teléfono, RFC, categoría/marca de interés. Se guarda en `suppliers` con `status = 'pendiente'`.
2. **Admin revisa** en `/admin/suppliers`: aprueba o rechaza, con nota opcional.
3. **Al aprobar**: se crea una cuenta de Supabase Auth para el proveedor (o se vincula si ya se registró), con rol `proveedor`.
4. **Proveedor autenticado** ve `price_proveedor` en vez de `price_publico` en el storefront (misma tienda, precio distinto según rol — vía la vista/RPC segura mencionada en 3.1, no exponiendo la columna directamente).
5. Los pedidos que haga un proveedor se etiquetan `tipo = 'mayoreo'` para que el admin los distinga fácilmente en `/admin/orders`.

### 6.2 Decisión abierta

¿El proveedor compra desde el mismo storefront con precio especial, o necesita una vista/flujo de pedido distinto (por volumen, sin carrito de "cliente final")? El diseño de arriba asume la opción más simple (mismo storefront, precio distinto). Si el cliente quiere un flujo de mayoreo separado (cantidades mínimas, cotización en vez de compra directa), es una fase adicional — **marcar como pregunta para el cliente antes de construir la Fase 9.**

### 6.3 Estrategia de precio de proveedor configurable desde Sheets

Confirmaste que quieres que el precio de proveedor también se actualice desde la hoja. Es completamente viable — el sync ya lee la hoja desde el backend con una cuenta de servicio privilegiada, así que agregar una columna más no cambia el modelo de seguridad (la RLS que oculta `price_proveedor` del público sigue aplicando en Supabase sin importar de dónde vino el dato). Hay dos formas de capturarlo en la hoja; te recomiendo la segunda:

**Opción A — Precio de proveedor absoluto** (columna `Precio Proveedor`)
- Más directo de entender.
- Riesgo: si el cliente actualiza `Precio` (público) pero olvida actualizar `Precio Proveedor`, quedan desincronizados sin que nadie lo note hasta que un proveedor reclame.

**Opción B — Descuento de proveedor en % (recomendada)** (columna `Descuento Proveedor %`)
- El cliente captura un solo número (ej. `20`) y el sistema calcula `price_proveedor = price_publico * (1 - 0.20)` automáticamente en cada sync.
- Si sube el precio público, el precio de proveedor se ajusta solo — cero mantenimiento doble.
- Permite además tener distintos % por marca o por línea si en el futuro el cliente lo quiere variar, sin tocar precios absolutos uno por uno.

Mi sugerencia es la **Opción B**, agregando una sola columna `Descuento Proveedor %` a la plantilla actual (vacía = sin precio especial, ese producto no aplica a mayoreo). Si el cliente de todos modos prefiere controlar el número exacto que ve cada proveedor, la Opción A también es perfectamente soportada por el modelo de datos — es una decisión de captura, no de arquitectura.

---

## 7. Reglas de negocio críticas

| Regla | Origen |
|---|---|
| Máximo 3 clics para llegar a un producto | Cliente, explícito en reunión |
| Máximo 2 tipografías (ideal), 3 máximo | Cliente, explícito |
| "Más vendidos" y "Nuevo" son manuales, no automáticos por ventas | Cliente, explícito |
| Un tinte = 1 producto con variantes de tono, no 1 producto por tono | Cliente, explícito (evitar 143 imágenes por línea) |
| Todo el contenido visual (banners/carrusel) debe ser editable sin deploy | Cliente, explícito |
| Categorías/subcategorías deben poder cambiar sin tocar código | Cliente, explícito |
| Frontend nunca llama APIs externas directo (Sheets, envía.com, pagos) | Metodología Innomind |
| Sync de catálogo no borra físicamente registros, solo desactiva | Diseño (integridad de historial de pedidos) |
| Ningún módulo se entrega con placeholders tipo "próximamente" | Estándar de calidad Innomind |

---

## 8. Fases de desarrollo

| Fase | Nombre | Depende de |
|---|---|---|
| 1 | Setup base: proyecto Supabase, schema completo, Auth, roles, layout | — |
| 2 | Design System: paleta, tipografía, componentes base (Button, Badge, Card) | 1 |
| 3 | Categorías y navegación: mega-menú dinámico, buscador, filtros | 1, 2 |
| 4 | Productos y variantes: modelo producto+variante, ficha de producto, galería | 3 |
| 5 | Sincronización Google Sheets: botón, diff preview, aplicar, logs | 4 |
| 6 | Carrito y checkout: carrito real, dirección, integración de pago | 4 |
| 7 | Envíos: integración envía.com, generación de guía, tracking | 6 |
| 8 | Panel Admin: pedidos, CRM, contenido visual, destacados manuales | 4, 6 |
| 9 | Portal de Proveedores: formulario, aprobación, precio proveedor, pedidos mayoreo | 4, 8 |
| 10 | Responsive y Polish: mobile, loading states, animaciones | 3–9 |
| 11 | QA y Deploy: checklist de entrega, producción | 1–10 |

---

## 9. Preguntas pendientes para el cliente

Estado actualizado:

| # | Pregunta | Estado | Bloquea |
|---|---|---|---|
| 1 | Pasarela de pago | ✅ **Resuelto — Stripe** | — |
| 2 | Google Sheet: ¿quién la crea y mantiene? | ✅ **Resuelto** — ya existe ("PLANTILLA BELIA"), el cliente la mantiene | — |
| 3 | Estrategia de precio de proveedor | ⚠️ Propuesta en 6.3 (recomiendo Opción B, % de descuento) — falta que el cliente confirme cuál prefiere | Fase 9 |
| 4 | Proveedores: ¿mismo storefront o flujo separado? (6.2) | 🔲 Abierta | Fase 9 |
| 5 | Estructura de categorías/subcategorías | 🔲 **Aún no existe** — columna `Categoria` en la hoja está vacía | Fase 3 (bloquea navegación y filtros) |
| 6 | Cuenta envía.com | 🔲 **Aún no está activa** | Fase 7 |

**Nada de esto detiene el arranque.** Fases 1 y 2 (setup de Supabase + Design System) no dependen de ninguna de estas respuestas — se puede empezar a construir ya mientras el cliente resuelve categorías y cuenta de envía.com en paralelo.

---

## 10. Prompt inicial para Antigravity (Fase 1)

```
Continúa con la Fase 1: Setup base del proyecto Belia.

Recordatorios del DESIGN.md:
- Supabase reemplaza a Zustand como fuente de datos (Zustand solo para estado de UI efímero)
- Schema completo: brands, categories (self-referencial para subcategorías),
  color_families, products, product_variants, product_images, customers,
  orders, order_items, suppliers, sync_logs, site_content
- Roles de Auth: cliente, proveedor, admin — con RLS desde el inicio
- price_proveedor NUNCA expuesto en el select público de product_variants
- Layout base + rutas /admin protegidas por rol admin (ya NO sin contraseña como en la demo)

Ponytail activo: mínimo necesario, sin librerías extra.

Detente al terminar y espera mi confirmación.
```

---

## 11. Checklist de verificación (heredado de tu metodología, adaptado)

```
□ Build de Vite sin errores
□ RLS activo y probado en TODAS las tablas (especialmente price_proveedor)
□ Mega-menú refleja cambios de categorías sin redeploy
□ Sync de Sheets: probado con altas, cambios de precio/stock, y bajas
□ Sync no toca productos con source = 'manual'
□ Checkout completo end-to-end incluyendo envía.com en sandbox
□ Rol proveedor ve price_proveedor; rol cliente NO lo ve bajo ninguna vista
□ Máximo 3 clics validado manualmente en el árbol de navegación real
□ Cero placeholders "próximamente" en producción
```
