# Feature Specification: Belia — Plataforma E-commerce + Sistema de Gestión Integral

**Feature Branch**: `001-belia-platform`

**Created**: 2026-07-11

**Status**: Draft

**Input**: DESIGN_BELIA.md v2.0 (fuente de verdad del proyecto — post-retroalimentación de cliente)

**Constitution Compliance** (required for every Belia spec):
- [x] RLS enabled on all tables touched by this feature
- [x] `price_proveedor` not exposed to unauthenticated roles
- [x] External API calls route via Edge Functions only
- [x] Belia Design System tokens used (no ad-hoc hex values)
- [x] Product detail reachable in ≤ 3 clicks from home
- [x] All navigation/layout components mobile-validated (≤ 375 px)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Navegación y Descubrimiento de Productos (Priority: P1)

Un comprador llega al storefront de Belia, ve el mega-menú de categorías, explora subcategorías y llega a la ficha completa de un producto en no más de 3 clics desde la página de inicio. En móvil, la misma navegación funciona con menú hamburguesa colapsable.

**Why this priority**: Sin navegación funcional el resto de la tienda no tiene valor. Es el esqueleto que hace visible el catálogo. El cliente fue explícito en la regla de 3 clics máximo como condición de calidad.

**Independent Test**: Abrir la tienda en navegador de escritorio y en móvil (375 px), navegar categoría → subcategoría → ficha de producto contando los clics. Verificar que el mega-menú refleja los datos de la base de datos, no valores hardcodeados.

**Acceptance Scenarios**:

1. **Given** el visitante está en la página de inicio, **When** pasa el cursor sobre una categoría del header, **Then** se despliega el mega-menú con todas las subcategorías activas de esa categoría, leídas dinámicamente.
2. **Given** el mega-menú está abierto, **When** el visitante da clic en una subcategoría, **Then** llega a la página de listado filtrada por esa subcategoría (2 clics desde home).
3. **Given** el visitante está en el listado de productos, **When** da clic en un producto, **Then** llega a la ficha de producto completa (3 clics desde home, cumpliendo la regla de negocio).
4. **Given** el visitante está en móvil (≤ 375 px), **When** abre el menú hamburguesa, **Then** ve las mismas categorías y subcategorías que en escritorio, con acceso completo a la navegación.
5. **Given** el admin agrega una nueva categoría desde el panel, **When** el visitante recarga la tienda, **Then** la nueva categoría aparece en el mega-menú sin ningún redeploy.
6. **Given** el buscador está disponible en el header, **When** el visitante escribe un nombre, marca, tono, código de tono o SKU, **Then** obtiene resultados relevantes en tiempo real.

---

### User Story 2 — Catálogo de Productos con Filtros (Priority: P2)

Un comprador puede filtrar el catálogo por categoría, subcategoría, marca y rango de precio. Ve cards de producto con imagen, nombre, precio público (nunca precio de proveedor) y, si aplica, precio promocional. Puede ordenar resultados. El catálogo refleja el inventario real de Supabase, no datos hardcodeados.

**Why this priority**: El catálogo es el núcleo del e-commerce. Sin productos visibles con filtros funcionales, el resto del flujo de compra no puede iniciarse.

**Independent Test**: Con al menos 10 productos activos en la base de datos, aplicar filtros y verificar que los resultados cambien correctamente. Verificar que `price_proveedor` nunca aparece en las cards ni en la ficha de producto para un usuario no autenticado o con rol `cliente`.

**Acceptance Scenarios**:

1. **Given** el catálogo tiene productos activos, **When** el visitante accede al listado, **Then** ve únicamente productos con `active = true`, ordenados por relevancia por defecto.
2. **Given** el visitante aplica el filtro de marca "KUUL", **When** el catálogo se actualiza, **Then** solo aparecen productos cuya marca sea KUUL.
3. **Given** el visitante aplica un rango de precio de $100–$300, **When** el catálogo se actualiza, **Then** solo aparecen productos con `price_publico` (o `price_promo` si existe) dentro del rango.
4. **Given** un producto tiene `price_promo`, **When** aparece en el catálogo, **Then** se muestra el precio promocional con tachado del precio original.
5. **Given** un usuario tiene rol `cliente` o no está autenticado, **When** visualiza cualquier producto, **Then** el campo `price_proveedor` no aparece en ninguna vista, tarjeta ni respuesta de datos.
6. **Given** un producto tiene `active = false`, **When** el visitante navega, **Then** ese producto no aparece en ningún listado ni buscador del storefront.

---

### User Story 3 — Carrito y Checkout Completo (Priority: P3)

Un usuario registrado agrega productos al carrito (sidebar deslizante), procede al checkout, ingresa su dirección de envío, se genera la cotización de guía vía envía.com, paga con Stripe y se crea el pedido en la base de datos. El carrito persiste entre sesiones, no en memoria.

**Why this priority**: El checkout es donde se genera el ingreso. Depende de que el catálogo (US2) ya esté funcional, pero es el objetivo de negocio central.

**Independent Test**: Con un usuario autenticado, agregar un producto al carrito, cerrar y reabrir el navegador, verificar que el carrito persiste, completar el checkout hasta la pantalla de confirmación de pedido.

**Acceptance Scenarios**:

1. **Given** el usuario está en la ficha de un producto, **When** da clic en "Agregar al carrito", **Then** el producto aparece en el `CartSidebar` con su cantidad y precio actual.
2. **Given** el usuario tiene productos en el carrito y cierra la sesión del navegador, **When** vuelve a iniciar sesión, **Then** su carrito mantiene los mismos productos (persistencia real, no en memoria).
3. **Given** el usuario procede al checkout, **When** ingresa su dirección de envío completa, **Then** el sistema consulta el costo de envío vía la integración de envíos (backend, nunca desde el frontend) y muestra el monto antes de cobrar.
4. **Given** el usuario confirma el pedido, **When** completa el pago con Stripe, **Then** se crea un registro en `orders` con `status = 'Procesando'` y sus `order_items` correspondientes, y el usuario ve la pantalla de confirmación con número de pedido.
5. **Given** un pedido de un proveedor autenticado con rol `proveedor`, **When** completa la compra, **Then** el pedido se registra con `tipo = 'mayoreo'` y aparece distinguido visualmente en el panel admin.
6. **Given** el stock de un producto llega a 0 durante el checkout, **When** el usuario intenta confirmar, **Then** recibe un mensaje claro de producto sin stock y el botón de pago está deshabilitado.

---

### User Story 4 — Panel de Administración (Priority: P4)

El administrador accede al panel en `/admin` con autenticación real (rol `admin`), gestiona pedidos con cambios de estado, visualiza el CRM de clientes con LTV automático, administra el catálogo de productos y controla el contenido visual del sitio (banners, carrusel) sin necesidad de un redeploy.

**Why this priority**: El admin permite operar el negocio en curso. Sin él no hay gestión de pedidos, ni catálogo, ni contenido visual. Depende del catálogo base (US2) pero se puede construir en paralelo con el checkout (US3).

**Independent Test**: Iniciar sesión como admin, cambiar el estado de un pedido de "Procesando" a "Enviado", agregar un producto manualmente, cambiar el banner del home — verificar que todos los cambios se reflejan en la tienda en tiempo real.

**Acceptance Scenarios**:

1. **Given** un usuario sin rol `admin` intenta acceder a `/admin`, **When** la URL es solicitada, **Then** es redirigido al login y no puede ver ninguna vista del panel.
2. **Given** el admin está en `/admin/orders`, **When** cambia el estado de un pedido a "Enviado", **Then** el estado se actualiza en la base de datos, el badge de color cambia (Amarillo→Azul) y el cliente puede ver el cambio en su cuenta.
3. **Given** el admin está en `/admin/customers`, **When** visualiza la lista, **Then** ve el LTV calculado automáticamente (suma de todos sus pedidos) y la etiqueta VIP para clientes que superan el umbral definido.
4. **Given** el admin crea un producto manualmente en `/admin/products` con `source = 'manual'`, **When** se ejecuta después una sincronización de catálogo, **Then** ese producto no es modificado ni desactivado por el sync.
5. **Given** el admin activa el toggle `is_featured_bestseller` de un producto, **When** el visitante accede al home, **Then** ese producto aparece en la sección de "Más vendidos" (selección manual, no por volumen de ventas).
6. **Given** el admin sube una nueva imagen de banner en `/admin/content`, **When** el visitante recarga el home, **Then** el nuevo banner aparece sin ningún redeploy del frontend.
7. **Given** el admin gestiona categorías en `/admin/categories`, **When** agrega, renombra o desactiva una categoría, **Then** el mega-menú del storefront refleja el cambio de forma inmediata.

---

### User Story 5 — Sincronización de Catálogo desde Google Sheets (Priority: P5)

El admin puede sincronizar el catálogo con la hoja "PLANTILLA BELIA" de Google Sheets. Antes de aplicar los cambios, el sistema muestra un preview del diff (X nuevos, Y actualizados, Z desactivados) que el admin debe confirmar. La sincronización nunca borra físicamente un producto ni toca los de `source = 'manual'`. Cada ejecución genera un registro en `sync_logs`.

**Why this priority**: La sincronización es la fuente de datos del catálogo real del cliente. Depende de que el modelo de productos (US2 y US4) ya esté en lugar.

**Independent Test**: Con la hoja real "PLANTILLA BELIA" conectada, ejecutar el sync, verificar el diff preview, confirmar, y comprobar que los productos nuevos aparecen, los modificados tienen sus nuevos valores, los eliminados de la hoja quedan con `active = false` (no borrados), y los productos `source = 'manual'` permanecen intactos.

**Acceptance Scenarios**:

1. **Given** el admin da clic en "Sincronizar catálogo", **When** el sistema lee la hoja, **Then** muestra el diff antes de aplicar: cantidad de productos nuevos, actualizados y desactivados, con detalle expandible por producto.
2. **Given** el diff preview está visible, **When** el admin confirma, **Then** se aplican los cambios (inserts/updates/deactivations) y se guarda el resultado en `sync_logs` con `started_at`, `finished_at`, conteos y `status`.
3. **Given** un producto existe en la DB con `source = 'sheet'` pero ya no está en la hoja, **When** el sync se confirma, **Then** el producto queda con `active = false` — nunca se elimina físicamente de la base de datos.
4. **Given** un producto tiene `source = 'manual'`, **When** el sync lee la hoja (aunque tenga el mismo SKU), **Then** ese producto no es modificado en ningún campo — el sync lo ignora completamente.
5. **Given** la hoja tiene una columna `Descuento Proveedor %` con un valor para un producto, **When** el sync se aplica, **Then** el sistema calcula `price_proveedor = price_publico * (1 - descuento/100)` y lo guarda en la DB; el campo no se expone en consultas públicas.
6. **Given** el sync falla por error de conexión o credenciales, **When** ocurre el error, **Then** se guarda el registro en `sync_logs` con `status = 'error'` y `error_message` descriptivo; no se aplica ningún cambio parcial al catálogo.

---

### User Story 6 — Portal de Proveedores (Priority: P6)

Un interesado en ser proveedor mayorista llena el formulario público en `/proveedores`. El admin recibe la solicitud en el panel, puede aprobarla o rechazarla con nota. Al aprobar, el proveedor recibe acceso con su cuenta y, al navegar el storefront, ve `price_proveedor` en lugar de `price_publico`. Sus pedidos se etiquetan como `tipo = 'mayoreo'`.

**Why this priority**: Es el módulo de mayor complejidad de autenticación/roles y depende del catálogo, el checkout y el admin ya funcionales. Aporta el modelo de negocio mayorista diferenciador de Belia.

**Independent Test**: Llenar el formulario público como proveedor, revisar en el admin la solicitud recibida con estado "Pendiente", aprobarla, iniciar sesión como proveedor, navegar el storefront y verificar que se ven precios de proveedor (distintos a los públicos), completar un pedido y comprobar que aparece con `tipo = 'mayoreo'` en `/admin/orders`.

**Acceptance Scenarios**:

1. **Given** un visitante sin cuenta llena el formulario en `/proveedores` con empresa, nombre, email, teléfono, RFC y categoría de interés, **When** envía el formulario, **Then** se crea un registro en `suppliers` con `status = 'pendiente'` y ningún acceso especial es otorgado todavía.
2. **Given** el admin está en `/admin/suppliers` y ve una solicitud pendiente, **When** la aprueba (con nota opcional), **Then** el proveedor recibe acceso con rol `proveedor` en Supabase Auth y su registro cambia a `status = 'aprobado'`.
3. **Given** el admin rechaza una solicitud, **When** registra el rechazo, **Then** el registro queda con `status = 'rechazado'` y el badge de color rojo es visible en el panel; el solicitante no recibe acceso.
4. **Given** un usuario autenticado con rol `proveedor` y `status = 'aprobado'` navega el catálogo, **When** visualiza un producto que tiene `price_proveedor` definido, **Then** ve el precio de proveedor en lugar del precio público, obtenido vía la vista/RPC segura (nunca vía select directo a la columna).
5. **Given** un usuario con rol `proveedor` aprobado completa un pedido, **When** el pedido se crea, **Then** `orders.tipo = 'mayoreo'` y aparece con distinción visual clara (badge o etiqueta) en `/admin/orders`.
6. **Given** un intento de consulta pública o con rol `cliente` que intenta acceder a `price_proveedor`, **When** se ejecuta la consulta, **Then** el campo devuelve `null` o el acceso es denegado por RLS — nunca se expone el precio de proveedor a roles no autorizados.

---

### Edge Cases

- ¿Qué ocurre si la hoja de Google Sheets está inaccesible durante el sync? → El sistema muestra error descriptivo y no aplica ningún cambio parcial; guarda el error en `sync_logs`.
- ¿Qué ocurre si un producto se agota durante el checkout de otro usuario? → El sistema detecta stock insuficiente al intentar confirmar y notifica al usuario antes de cobrar.
- ¿Qué ocurre si el admin desactiva una categoría que tiene productos activos? → Los productos permanecen en DB pero no son alcanzables vía esa categoría en el storefront; se debe advertir al admin antes de desactivar.
- ¿Qué ocurre si un proveedor aprobado intenta ver `price_proveedor` de un producto que no tiene ese campo definido? → Ve el precio público estándar; no recibe un error ni un valor nulo expuesto.
- ¿Qué ocurre si un visitante intenta llegar a `/admin` sin autenticar? → Redirección inmediata al login; no se carga ningún contenido del panel.
- ¿Qué ocurre si el sync detecta un SKU duplicado en la hoja (dos filas con el mismo código)? → El sistema toma la primera ocurrencia, registra el conflicto en el diff preview y advierte al admin.
- ¿Qué ocurre si se cambia el precio público de un producto y hay un `Descuento Proveedor %` definido? → El próximo sync recalcula `price_proveedor` automáticamente; no requiere intervención manual.

---

## Requirements *(mandatory)*

### Functional Requirements

**Storefront / Navegación**
- **FR-001**: El sistema DEBE mostrar el mega-menú de categorías y subcategorías generado dinámicamente desde la base de datos, sin valores hardcodeados. *(RLS: lectura pública permitida para `categories` activas)*
- **FR-002**: Cualquier ficha de producto DEBE ser alcanzable en no más de 3 clics desde la página de inicio. *(Mobile-first: validar en ≤ 375 px)*
- **FR-003**: El buscador DEBE encontrar productos por nombre, marca, tono, código de tono y SKU.
- **FR-004**: Los filtros de catálogo DEBEN permitir filtrar por categoría, subcategoría, marca y rango de precio.
- **FR-005**: El storefront DEBE mostrar únicamente productos con `active = true`; los desactivados no deben aparecer en ningún listado ni buscador.

**Seguridad de datos de producto**
- **FR-006**: El campo `price_proveedor` NUNCA debe aparecer en consultas públicas ni en respuestas accesibles a usuarios con rol `cliente` o sin autenticar. El acceso se otorga exclusivamente vía una vista o RPC que verifica rol `proveedor` autenticado y aprobado. *(RLS gate — deployment blocker)*
- **FR-007**: Ninguna llamada a APIs externas (Google Sheets, Stripe, envía.com) DEBE originarse desde el frontend. Todas DEBEN pasar por servicios backend. *(Constitution gate)*

**Carrito y Checkout**
- **FR-008**: El carrito DEBE persistir entre sesiones del mismo usuario en la base de datos (no en memoria del navegador).
- **FR-009**: El sistema DEBE consultar el costo de envío vía la integración de envíos (backend) antes de presentar el total al usuario.
- **FR-010**: Al confirmar el pago, el sistema DEBE crear registros en `orders` y `order_items` con los datos del pedido, customer, items, precios unitarios y estado inicial `'Procesando'`.
- **FR-011**: Los pedidos realizados por un usuario con rol `proveedor` aprobado DEBEN registrarse con `tipo = 'mayoreo'`.

**Panel de Administración**
- **FR-012**: El acceso a `/admin` DEBE requerir autenticación con rol `admin`; cualquier otro rol o visitante sin sesión DEBE ser redirigido al login.
- **FR-013**: El admin DEBE poder cambiar el estado de un pedido entre: Procesando, Enviado, Entregado, Cancelado. El cambio DEBE reflejarse inmediatamente.
- **FR-014**: El admin DEBE poder marcar manualmente un producto como destacado (`is_featured_bestseller`, `is_featured_new`). Los destacados NO son calculados automáticamente por volumen de ventas.
- **FR-015**: El admin DEBE poder gestionar banners y carrusel del home (`site_content`) sin redeploy.
- **FR-016**: El admin DEBE poder crear, editar y desactivar categorías/subcategorías desde `/admin/categories`; los cambios DEBEN reflejarse en el mega-menú sin redeploy.

**Sincronización de Catálogo**
- **FR-017**: La sincronización DEBE mostrar un diff preview (nuevos, actualizados, desactivados) antes de aplicar ningún cambio.
- **FR-018**: La sincronización NUNCA DEBE eliminar físicamente un registro de producto; solo DEBE marcar `active = false` los que ya no aparecen en la hoja.
- **FR-019**: La sincronización DEBE ignorar completamente los productos con `source = 'manual'`, sin modificar ningún campo.
- **FR-020**: Cada ejecución de sincronización DEBE generar un registro en `sync_logs` con `started_at`, `finished_at`, conteos y `status` (incluso en caso de error).

**Portal de Proveedores**
- **FR-021**: El formulario público en `/proveedores` DEBE guardar la solicitud con `status = 'pendiente'` sin otorgar ningún acceso al sistema.
- **FR-022**: Al aprobar una solicitud, el sistema DEBE asignar rol `proveedor` al usuario en el sistema de autenticación.
- **FR-023**: Un proveedor aprobado y autenticado DEBE ver `price_proveedor` en la ficha de producto (cuando esté definido), obtenido vía la vista/RPC segura.

**CRM**
- **FR-024**: El LTV de cada cliente DEBE calcularse automáticamente como la suma de todos sus pedidos completados; la etiqueta VIP DEBE asignarse automáticamente al superar el umbral definido.

### Key Entities

- **Product**: Producto del catálogo. Tiene SKU único, nombre, descripción, marca, categoría, precio público, precio promocional (opcional), precio de proveedor (solo visible por rol autorizado), stock, imagen base, etiqueta de destacado, origen (`'manual'` o `'sheet'`) y estado activo.
- **Category**: Nodo del árbol de navegación. Puede tener un padre (subcategoría) o ser raíz. Tiene nombre, slug, orden y estado activo. Alimenta el mega-menú dinámicamente.
- **Order**: Pedido de compra. Pertenece a un cliente, tiene tipo (`'publico'` o `'mayoreo'`), estado, dirección de envío, información de guía/tracking y lista de ítems comprados.
- **Customer**: Perfil del usuario comprador, vinculado a la cuenta de autenticación. Tiene LTV calculado y etiqueta VIP.
- **Supplier**: Solicitud de cuenta mayorista. Pasa por estados: pendiente → aprobado/rechazado. Al aprobarse, se vincula a una cuenta de usuario con rol `proveedor`.
- **SyncLog**: Registro de cada ejecución de sincronización de catálogo. Contiene tiempos, conteos de cambios, estado y errores si ocurrieron.
- **SiteContent**: Contenido visual configurable del sitio (banners, carrusel), editable desde el admin sin redeploy.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cualquier producto del catálogo activo es alcanzable en exactamente 3 clics o menos desde la página de inicio, verificado manualmente en escritorio y en móvil (≤ 375 px de ancho).
- **SC-002**: Un comprador puede completar el flujo completo de agregar al carrito → checkout → confirmación de pedido sin encontrar mensajes de "próximamente" ni datos de ejemplo; el pedido queda registrado en la base de datos.
- **SC-003**: El campo de precio de proveedor no aparece en ninguna respuesta de datos para usuarios no autenticados ni con rol `cliente`, verificable inspeccionando las respuestas de la base de datos directamente.
- **SC-004**: Tras ejecutar una sincronización con la hoja "PLANTILLA BELIA", los productos modificados reflejan los nuevos datos en el storefront en menos de 2 minutos, sin ningún redeploy.
- **SC-005**: Un producto marcado con `source = 'manual'` permanece idéntico después de ejecutar una sincronización de catálogo, incluso si el mismo SKU existe en la hoja con valores distintos.
- **SC-006**: El panel de administración rechaza el acceso a cualquier usuario sin rol `admin`, redirigiendo al login inmediatamente, sin cargar ningún contenido del panel.
- **SC-007**: Un proveedor aprobado ve en el catálogo el precio de proveedor correspondiente; un cliente con el mismo navegador (diferente sesión) ve únicamente el precio público.
- **SC-008**: El administrador puede cambiar el banner del home y el mega-menú refleja una nueva categoría sin necesidad de redesplegar la aplicación.

---

## Assumptions

- El cliente mantiene la hoja "PLANTILLA BELIA" actualizada. El sistema se adapta a su estructura (columnas A–I confirmadas), no al revés.
- La taxonomía de categorías y subcategorías será definida por el cliente antes de iniciar la Fase 3 (navegación); la columna `Categoria` de la hoja actualmente está vacía.
- Para la primera fase de catálogo (Fase 4), cada fila de la hoja es un producto independiente (sin agrupación de variantes por tono). La activación del modelo de variantes se difiere a una fase posterior cuando el cliente defina su estrategia.
- La familia de color (`color_family`) no se infiere automáticamente del código de tono; se activa como filtro en una fase posterior cuando el cliente decida clasificar explícitamente.
- Stripe es el proveedor de pagos (confirmado por el cliente). Los métodos locales de México (OXXO, SPEI) son opcionales y se definen en Fase 6.
- La cuenta de envía.com aún no está activa al momento de escribir este spec; la integración se implementa pero se prueba en sandbox hasta que el cliente la active.
- Los proveedores compran desde el mismo storefront con precio especial (opción más simple). Si el cliente decide implementar un flujo de mayoreo separado, es una fase adicional independiente.
- La estrategia de precio de proveedor recomendada es la Opción B (porcentaje de descuento en la hoja), sujeta a confirmación del cliente antes de Fase 9. El modelo de datos soporta ambas opciones (A y B) sin cambios de arquitectura.
- El sistema de autenticación es Supabase Auth con email/password y tres roles: `cliente`, `proveedor`, `admin`.
- Los datos de `featured_label` de la hoja (columna I, valores tipo "TOP 1", "TOP 2", "TOP 3") mapean directamente al campo `featured_label` del producto; el admin también puede ajustar esto manualmente en el panel.
