# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Implementación de la plataforma E-commerce Belia y su Sistema de Gestión (Admin Panel). Construida sobre una arquitectura JAMstack (React/Vite en frontend, Supabase en backend). El foco principal está en la seguridad de datos (RLS) para proteger el precio de proveedor, reglas estrictas de navegación (máximo 3 clics) e integraciones backend-only para Stripe, envía.com y sincronización con Google Sheets.

## Technical Context

**Language/Version**: TypeScript (estricto)

**Primary Dependencies**: React 18, Vite, Tailwind CSS, Framer Motion, Zustand

**Storage**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)

**Testing**: Browser end-to-end (manual verification per Phase). Unit/e2e testing frameworks deferred until requested.

**Target Platform**: Web (Vercel deployment) con validación mobile-first (≤ 375 px)

**Project Type**: Plataforma Web (E-commerce + Panel de Administración)

**Performance Goals**: Navegación de 3 clics máximo; carga de scroll infinito rápida; sync reflejado en < 2 minutos.

**Constraints**: RLS estricto; sin llamadas a API externas desde el cliente; cero placeholders.

**Scale/Scope**: Catálogo sincronizado desde Google Sheets, 3 roles de usuario, checkout completo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Validate each item against [`constitution.md`](../../.specify/memory/constitution.md) before proceeding:

| Gate | Status | Notes |
|---|---|---|
| **RLS Gate**: Every Supabase table in this feature has RLS enabled from migration 0001 | ✅ | Plan includes explicit RLS policies for all tables |
| **price_proveedor Gate**: No public query or unauthenticated RPC exposes `price_proveedor` | ✅ | `products` RLS restricts column, exposed via secure RPC |
| **External API Gate**: All calls to Google Sheets / Stripe / envía.com route via Edge Functions | ✅ | Edge Functions defined in plan |
| **Mobile Gate**: All navigation/layout components validated at ≤ 375 px before marked done | ✅ | Required for all UI components |
| **Zero-Placeholder Gate**: No hardcoded data, stub UI, or non-functional elements shipped | ✅ | Required for PR acceptance |

> Constitution check passed. Ready for implementation.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
### Source Code (repository root)

```text
supabase/
├── functions/           # Edge Functions (Stripe, envia.com, Sync)
└── migrations/          # Schema & RLS policies

src/
├── components/          # Reusable UI (Tailwind, Framer Motion)
├── hooks/               # React Query / Supabase data fetching
├── pages/               # Route components (Storefront, Admin)
├── store/               # Zustand (UI state only)
└── types/               # Shared TypeScript definitions
```

**Structure Decision**: El proyecto es una SPA React desplegada en Vercel, por lo que todo el código frontend vive en `src/`. El backend es gestionado enteramente mediante el CLI de Supabase en `supabase/`. Esta es la estructura estándar más limpia para este stack.

## Complexity Tracking

N/A - Todas las decisiones están alineadas con la Constitución y el stack seleccionado.
