---
purpose: "Unit Tests for English - Platform Comprehensive (Focus: Payment & Stock)"
created_for: "Developer validation during remaining tasks"
focus_areas: ["Payment & Stock Race Conditions", "Comprehensive Platform Review"]
---

# Developer Validation Checklist: Platform Comprehensive

Este checklist actúa como "Unit Tests para Inglés" (o Español en este caso). Su propósito es validar si los **requisitos documentados** en `spec.md` son completos, claros, consistentes y no presentan lagunas para los flujos más críticos (como los pagos y la concurrencia de inventario), permitiendo al desarrollador asegurar que el diseño técnico es robusto antes de escribir el código final.

## 1. Requirement Completeness (Completitud)
- [ ] CHK001 - ¿Están definidos los requisitos para el manejo del estado del pedido cuando falla la confirmación de pago de Stripe por timeout de red? [Completeness, Spec §FR-010]
- [ ] CHK002 - ¿Se especifica el comportamiento esperado si el inventario se agota en el milisegundo exacto entre la validación del carrito y el cobro de Stripe? [Gap, Race Condition]
- [ ] CHK003 - ¿Están documentados todos los posibles estados de error que la API de Stripe puede devolver (ej. fondos insuficientes, tarjeta expirada) y cómo mapearlos a mensajes para el usuario? [Completeness]
- [ ] CHK004 - ¿Se han definido explícitamente los requisitos de rollback (reversión o reembolso) en caso de que la inserción en la tabla `orders` falle después de un cobro exitoso en Stripe? [Gap, Exception Flow]
- [ ] CHK005 - ¿Están especificados los requisitos para manejar montos de envío dinámicos si cambia la dirección mientras el componente de pago de Stripe ya está inicializado? [Completeness, Spec §FR-009]

## 2. Requirement Clarity (Claridad)
- [ ] CHK006 - ¿El término "notificar al usuario antes de cobrar" (Edge Cases) cuantifica el momento exacto en el ciclo de vida del checkout donde se debe hacer la verificación de stock? [Clarity]
- [ ] CHK007 - ¿Está clara en los requisitos la decisión técnica sobre si la reserva temporal de inventario (soft allocation) está permitida o prohibida durante el flujo de pago? [Clarity, Assumption]
- [ ] CHK008 - ¿Es clara la definición de "carrito intacto" tras un error de pago? ¿Incluye la preservación del `client_secret` de Stripe para reintentos sin crear múltiples intents inútiles? [Clarity, Spec §FR-010b]

## 3. Requirement Consistency (Consistencia)
- [ ] CHK009 - ¿Existe consistencia explícita entre la "persistencia de carrito" (FR-008) y la orden de vaciado del carrito tras el pago exitoso (comportamiento implícito)? [Consistency]
- [ ] CHK010 - ¿Los requisitos del estado de pedido "Cancelado" (FR-013) entran en conflicto con la lógica de devoluciones o reembolsos en Stripe que no ha sido especificada? [Conflict, Gap]

## 4. Scenario Coverage (Cobertura de Casos Extremos)
- [ ] CHK011 - ¿Se abordan los requisitos de concurrencia pura: dos usuarios intentan pagar simultáneamente el último ítem disponible con el mismo SKU? [Coverage, Race Condition]
- [ ] CHK012 - ¿Se especifica qué debe pasar si un webhook asíncrono de Stripe confirma un pago exitoso, pero la conexión web del cliente falla antes de que su navegador inserte la orden a través de la Edge Function? [Coverage, Edge Case]
- [ ] CHK013 - ¿Están definidos los requisitos de tolerancia a fallos si la API de envía.com (integración externa) no responde al momento de calcular el costo de envío en tiempo real antes del cobro? [Coverage, Spec §FR-009]
- [ ] CHK014 - ¿Se especifican las reglas para usuarios B2B (Rol Proveedor) que intentan procesar pagos si su estado cambia a 'rechazado' en medio de una sesión de checkout? [Coverage, Edge Case]

## 5. Non-Functional Requirements (Resiliencia y Transaccionalidad)
- [ ] CHK015 - ¿Están definidos los requisitos de atomicidad transaccional a nivel de base de datos para la creación de un registro en `orders` junto con sus N `order_items`? [Gap, Database]
- [ ] CHK016 - ¿Se especifica en los requisitos funcionales si es necesario utilizar bloqueos a nivel de fila (Row Level Locks) de PostgreSQL durante la verificación final del inventario? [Gap, Architecture]
- [ ] CHK017 - ¿Están documentados los límites de latencia aceptables (timeout) para las llamadas HTTP externas (Stripe, envía.com) dentro de la Edge Function? [Gap, NFR]
