# Phase 0: Outline & Research

## Decisiones Técnicas (Basadas en especificaciones del cliente)

- **Frontend Stack**: React 18 + Vite + TypeScript.
  - **Rationale**: Requerido por el cliente. Ecosistema moderno y rápido para SPA.
- **Styling & Animation**: Tailwind CSS + Framer Motion.
  - **Rationale**: Requerido por el cliente. Tailwind para estilos atómicos basados en el Design System, Framer Motion para animaciones fluidas.
- **State Management**: Zustand (solo estado efímero UI).
  - **Rationale**: Requerido por el cliente. Zustand mantendrá el estado del carrito (abierto/cerrado) y modales. El estado del servidor se manejará con Supabase SDK.
- **Backend & Database**: Supabase (Postgres, Auth, Storage, Edge Functions).
  - **Rationale**: Requerido por el cliente. Plataforma BaaS completa que permite implementar RLS estricto desde el día 1.
- **Integraciones de Terceros**: Stripe, envía.com, Google Sheets API v4.
  - **Rationale**: Ejecución exclusiva en Supabase Edge Functions para cumplir con la Constitución (sin llamadas desde el cliente).
- **Modelo de Productos**: Sin variantes por ahora.
  - **Rationale**: La fuente de verdad (Google Sheets) no separa variantes actualmente. Queda como mejora futura.

**Conclusión**: No quedan `NEEDS CLARIFICATION`. La arquitectura está completamente definida y alineada con la Constitución del proyecto.
