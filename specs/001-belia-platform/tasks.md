---
description: "Task list template for feature implementation"
---

# Tasks: 001-belia-platform

**Input**: Design documents from `/specs/001-belia-platform/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Testing will be manual browser validation per phase, as defined in `plan.md`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize React 18 + Vite project with TypeScript in `src/` (si no existe)
- [ ] T002 Instalar dependencias base: Tailwind CSS, Framer Motion, Zustand, React Router DOM
- [ ] T003 Configurar Tailwind CSS con los tokens del Design System de Belia en `tailwind.config.js`
- [ ] T004 Inicializar proyecto Supabase local con `supabase init`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**🔒 BELIA RLS GATE (blocking)**: Before marking any task in this phase complete, confirm that
every Supabase table created or modified by this feature has Row Level Security enabled.

- [ ] T005 Setup database schema migration para todas las entidades (`categories`, `products`, `suppliers`, `orders`, `order_items`, `sync_logs`, `site_content`) en `supabase/migrations/0001_initial_schema.sql`
- [ ] T005-RLS **[BELIA GATE]** Habilitar RLS en todas las tablas y crear políticas iniciales (ej. acceso público lectura a `categories` y `products` activos) en el mismo archivo de migración.
- [ ] T006 [P] Implementar Auth provider de frontend en `src/hooks/useAuth.ts` para conectar con Supabase Auth.
- [ ] T007 [P] Configurar el enrutador principal en `src/App.tsx` y layouts base (StorefrontLayout, AdminLayout).
- [ ] T008 Crear cliente centralizado de Supabase en `src/lib/supabase.ts` usando variables de entorno.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Navegación y Descubrimiento (Priority: P1) 🎯 MVP

**Goal**: Mega-menú dinámico, 3 clics máximo, mobile-first.

**Independent Test**: Abrir la tienda en móvil (375px) y desktop, navegar desde home a producto en ≤ 3 clics.

### Implementation for User Story 1

- [x] T009 [US1] Crear hook `useCategories` en `src/hooks/useCategories.ts` para obtener árbol de navegación.
- [x] T010 [US1] Implementar componente `Header` con buscador y mega-menú (Desktop) en `src/components/layout/Header.tsx`
- [x] T011 [US1] Implementar Menú Hamburguesa (Mobile) con Framer Motion en `src/components/layout/MobileMenu.tsx`
- [x] T012 [US1] Implementar layout de Home en `src/pages/storefront/HomePage.tsx`
- [x] T013 [US1] Implementar vista de listado de categoría vacía (UI) en `src/pages/storefront/CategoryPage.tsx`
- [x] T014 [US1] Validar explícitamente la UX móvil en vista previa.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Catálogo y Filtros (Priority: P2)

**Goal**: Listado con filtros, scroll infinito, protección estricta de `price_proveedor`.

**Independent Test**: Filtrar por marca/precio, hacer scroll infinito. Verificar que `price_proveedor` no existe en las respuestas de red.

### Implementation for User Story 2

- [ ] T015 [US2] Crear RPC `get_supplier_products()` en migración de DB para acceso seguro a precios de proveedor.
- [x] T016 [US2] Crear hook `useProducts` en `src/hooks/useProducts.ts` implementando lógica de scroll infinito y filtros.
- [x] T017 [US2] Implementar componente `ProductCard` (solo precio público/promo) en `src/components/catalog/ProductCard.tsx`
- [x] T018 [US2] Implementar barra lateral de filtros en `src/components/catalog/FiltersSidebar.tsx`
- [x] T019 [US2] Actualizar `CategoryPage.tsx` para integrar `FiltersSidebar` y listado de productos con scroll infinito.
- [x] T020 [US2] Implementar `ProductDetailPage.tsx` (Ficha de Producto) respetando 3-clicks rule.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Carrito y Checkout (Priority: P3)

**Goal**: Agregar al carrito, carrito persistente en DB, integración Edge Function para Stripe y envía.com.

**Independent Test**: Agregar al carrito, cerrar navegador, reabrir y confirmar persistencia. Fallar intencionalmente un pago para validar FR-010.

### Implementation for User Story 3

- [ ] T021 [US3] Crear esquema de tabla de carrito persistente en DB (obligatorio por FR-008), agregándolo a migración `0002_cart_schema.sql` (RLS protegido).
- [x] T022 [US3] Crear hook/Zustand store híbrido para carrito en `src/store/cartStore.ts` (sync con DB).
- [x] T023 [US3] Implementar componente `CartSidebar` deslizante en `src/components/cart/CartSidebar.tsx`
- [x] T024 [US3] Crear Supabase Edge Function `create-payment-intent` en `supabase/functions/create-payment-intent/index.ts` (debe incluir validación estricta de stock antes de cobrar y llamar a envía.com).
- [x] T025 [US3] Implementar vista de Checkout en `src/pages/storefront/CheckoutPage.tsx` integrando Stripe Elements y manejo de error visual si el stock se agota.
- [x] T026 [US3] Implementar creación de la orden (`orders` y `order_items`) post-pago exitoso y lógica de fallo de pago (US2 edge case).

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: User Story 4 - Panel de Admin (Priority: P4)

**Goal**: Autenticación de admin, gestión de órdenes, catálogo y contenido.

**Independent Test**: Editar un banner, modificar estado de orden a Enviado, ver LTV del cliente.

### Implementation for User Story 4

- [x] T027 [US4] Implementar `AdminRoute` guard en `src/components/auth/AdminRoute.tsx`
- [x] T028 [US4] Crear vista de listado y detalle de Órdenes en `src/pages/admin/OrdersAdminPage.tsx` (con lógica progresiva de estados).
- [x] T029 [US4] Crear vista CRM en `src/pages/admin/CustomersAdminPage.tsx` con cálculo de LTV dinámico.
- [x] T030 [US4] Crear gestor de Catálogo en `src/pages/admin/ProductsAdminPage.tsx` permitiendo crear productos con origen 'manual'.
- [x] T031 [US4] Crear gestor de contenido (`site_content`) en `src/pages/admin/ContentAdminPage.tsx`.
- [x] T031b [US4] Crear gestor de Categorías en `src/pages/admin/CategoriesAdminPage.tsx` para crear/editar/desactivar taxonomía.

---

## Phase 7: User Story 5 - Sync Sheets (Priority: P5)

**Goal**: Edge function de sincronización de catálogo con diff preview.

**Independent Test**: Mostrar diff preview, confirmar, comprobar soft delete y respeto a `source='manual'`.

### Implementation for User Story 5

- [x] T032 [US5] Crear Supabase Edge Function `sync-catalog` en `supabase/functions/sync-catalog/index.ts` integrando API v4 de Sheets.
- [x] T033 [US5] Implementar UI de Sincronización (Botón + Modal de Diff Preview) en `src/pages/admin/SyncAdminPage.tsx`.
- [x] T034 [US5] Implementar lógica de Soft Delete y protección 'manual' en la función de sync.
- [ ] T035 [US5] Implementar vista de Logs de Sincronización en `src/components/admin/SyncLogsTable.tsx`.

---

## Phase 8: User Story 6 - Proveedores B2B (Priority: P6)

**Goal**: Formulario público B2B, aprobación con email SMTP, visibilidad de precio especial.

**Independent Test**: Enviar formulario, aprobar desde Admin (recibe email), login, ver precio proveedor.

### Implementation for User Story 6

- [x] T036 [US6] Crear formulario público en `src/pages/storefront/SupplierFormPage.tsx` y guardar en `suppliers` con estado 'pendiente'.
- [x] T037 [US6] Crear Supabase Edge Function `approve-supplier` en `supabase/functions/approve-supplier/index.ts` con SMTP de Gmail.
- [x] T038 [US6] Crear gestor de Solicitudes en `src/pages/admin/SuppliersAdminPage.tsx` (aprobar/rechazar llamando a Edge Function).
- [x] T039 [US6] Modificar `ProductCard` y Ficha de Producto para utilizar `get_supplier_products()` si el usuario tiene rol `proveedor`.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T040 Validar política de "Zero Placeholders".
- [ ] T041 Revisión cruzada de variables de entorno (ningún VITE_ expone credenciales).

---

## Dependencies & Execution Order

- **Foundational (Phase 2)** BLOCKS all user stories. Debe completarse para configurar el RLS.
- Las **User Stories (Phase 3 - 8)** pueden desarrollarse secuencialmente, aunque US3 (Checkout) requiere US2 (Catálogo) visualmente disponible.
- US5 (Sync) y US6 (Proveedores) asumen que las tablas base de US4 (Admin) ya están funcionales.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently en Desktop y Móvil.
