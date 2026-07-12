<!--
SYNC IMPACT REPORT
==================
Version change:    0.0.0 (blank template) → 1.0.0
Bump rationale:    Initial adoption — all principles defined from scratch (MAJOR).

Added sections:
  - I.  Code Quality
  - II. Security (maximum priority)
  - III. UX Consistency
  - IV. Data Integrity
  - V.  Development Process
  - VI. Git Identity
  - Additional Constraints (technology stack)
  - Governance (amendment procedure, versioning policy, compliance)

Modified principles:    N/A (first constitution)
Removed sections:       N/A

Templates updated:
  ✅ .specify/templates/plan-template.md   — Constitution Check gates aligned
  ✅ .specify/templates/spec-template.md   — Security & UX constraints referenced
  ✅ .specify/templates/tasks-template.md  — Foundational phase now requires RLS gate

Follow-up TODOs:
  TODO(RATIFICATION_DATE): Confirm the exact date the team formally adopted this
  constitution. Placeholder set to 2026-07-11 (date of first authoring).
-->

# Belia Constitution

## Core Principles

### I. Code Quality

All TypeScript code MUST use strict mode (`"strict": true` in tsconfig). The use of
`any` is PROHIBITED without a documented exception and explicit `// eslint-disable`
comment explaining why no narrower type exists.

Business logic MUST NOT be duplicated between the frontend and backend. Shared
validation rules, calculation logic, and data-shape contracts belong in a shared
types/utilities layer or in Supabase Edge Functions — never independently re-implemented
in both places.

Components MUST be typed end-to-end: props, state, API responses, and event handlers
all carry explicit TypeScript types.

**Rationale**: Type safety eliminates entire categories of runtime bugs that are
especially costly in an e-commerce context (wrong prices, wrong product IDs, etc.).
Deduplication keeps business rules authoritative and auditable.

### II. Security (MAXIMUM PRIORITY)

**RLS is non-negotiable and unconditional.**

- Row Level Security (RLS) MUST be enabled on every Supabase table from the very first
  migration. There is no "we will add it later" — a table without RLS is a deployment
  blocker.
- No API call to an external service (Google Sheets, Stripe, envía.com, or any future
  integration) MAY originate from the frontend. All such calls MUST be routed through
  Supabase Edge Functions running server-side.
- The `price_proveedor` field (supplier cost price) MUST NEVER be exposed in any public
  or unauthenticated query. Access is permitted only via a Supabase view or RPC that
  validates the calling user is authenticated AND has the `approved_admin` role.
- Environment secrets (API keys, webhooks, tokens) for external services MUST reside
  exclusively in backend environment variables. Variables with the `VITE_` prefix are
  considered client-side and are PROHIBITED from holding any secret.

**Rationale**: A breach of supplier pricing data would directly expose the business
margin structure. Credential leaks via `VITE_` variables are a well-known attack vector
in Vite/React applications. These rules exist because the cost of retrofitting security
is always higher than building it in.

### III. UX Consistency

The Belia Design System is the single source of truth for all user-facing components.

- **Color palette**: `belia-red`, `belia-coral`, `belia-charcoal` (as defined in
  `tailwind.config.js`). No ad-hoc hex or RGB values are permitted outside the design
  token definitions.
- **Typography**: The defined font stack from the design system applies everywhere.
  Browser-default fonts are not acceptable in shipped components.
- **Component reuse**: Any UI pattern that appears in more than one place MUST be
  extracted into a shared component under `src/components/`.
- **Navigation rule**: Any product detail page (ficha de producto) MUST be reachable in
  at most 3 clicks from the homepage. Architectures that violate this MUST be rejected.
- **Mobile-first**: Every navigation component and layout MUST be validated on a mobile
  viewport (≤ 375 px width) before it is considered done. Desktop polish is secondary.

**Rationale**: Brand coherence directly drives perceived trustworthiness in beauty
e-commerce. The 3-click rule prevents catalog bloat that buries products. Mobile-first
reflects that the primary customer segment browses on phone.

### IV. Data Integrity

Catalog synchronization from Google Sheets operates under a soft-delete policy:

- Synchronization jobs MUST NEVER perform a hard `DELETE` on any product row. Products
  removed from the source sheet MUST be marked `active = false` (deactivated).
- Products with `origin = 'manual'` (created directly in the admin panel) are owned by
  the admin team. The sync job MUST skip (leave unmodified) any row where
  `origin = 'manual'`, regardless of whether that SKU exists in the source sheet.

**Rationale**: Orders already invoiced reference product IDs. Physical deletion would
break the historical order record and make financial reconciliation impossible. Manual
products represent curated exceptions that the sync source does not know about.

### V. Development Process

- **One story at a time**: Development MUST proceed one user story at a time. The next
  story MUST NOT begin until the current story has been manually verified end-to-end in
  a real browser.
- **Zero placeholders**: No module, page, or component is considered shippable while it
  contains hardcoded mock data, `TODO` UI elements, "coming soon" banners, or buttons
  with no wired functionality.
- **Browser verification gate**: Each phase ends with a manual browser check. Automated
  testing (TDD/Jest/Playwright) is welcome but NOT assumed; it MUST be explicitly
  requested per feature to be included in tasks.

**Rationale**: End-to-end browser verification catches integration issues that unit
tests miss. Enforcing story-by-story discipline prevents partially-built features from
accumulating technical debt that blocks later stories.

### VI. Git Identity

All commits to this repository MUST use the following identity:

```
Author: iainnomind-cpu <ia.innomind@gmail.com>
```

This MUST be configured in the local git config or per-commit via `--author` before any
commit that is intended for deployment. Commits with a different author identity will
cause Vercel deployment verification to fail.

**Rationale**: Vercel's deployment pipeline is linked to this identity. Mismatched
commit authors have caused deployment blocks in previous sessions.

## Additional Constraints

**Technology Stack (non-negotiable for this project)**

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS (design tokens in `tailwind.config.js`) |
| Animation | Framer Motion |
| State management | Zustand |
| Routing | React Router DOM |
| Backend / BaaS | Supabase (Auth, Database, Storage, Edge Functions) |
| Payments | Stripe (via Edge Function only) |
| Shipping | envía.com (via Edge Function only) |
| Catalog source | Google Sheets (via Edge Function sync only) |
| Deployment | Vercel |

No new runtime dependency MUST be added without a documented justification that explains
why the existing stack cannot fulfill the requirement.

## Development Workflow Gates

The following automated gates apply at task boundaries:

1. **RLS Gate** (Phase 2 / Foundational): Before any user-story task begins, a reviewer
   MUST confirm that every table touched by the feature has RLS enabled. Blocking gate.
2. **price_proveedor Gate**: Any query, view, or RPC that returns product data MUST be
   reviewed to confirm `price_proveedor` is excluded or filtered by role. Deployment blocker.
3. **Mobile Gate** (UX stories): Navigation and layout tasks are not `[x]` until tested
   on a ≤ 375 px viewport.
4. **Browser Verification Gate**: Each user story phase ends with a manual, recorded
   browser test. No story is marked complete without this step.
5. **Zero-Placeholder Gate**: Final review of each story confirms no hardcoded data,
   stub UI, or non-functional interactive element remains.

## Governance

This constitution supersedes all prior verbal agreements, README sections, and ad-hoc
coding conventions for the Belia project. In cases of conflict, this document is the
authority.

**Amendment procedure**:
1. Propose the amendment in writing (PR, issue, or chat) with a rationale.
2. The project owner reviews and approves or rejects within one working session.
3. Upon approval, update this file, increment the version, and record
   `LAST_AMENDED_DATE`.
4. Update any dependent templates affected by the change (see checklist in Step 4 of
   the constitution skill).

**Versioning policy** (Semantic Versioning):
- `MAJOR`: Removal or redefinition of a non-negotiable principle.
- `MINOR`: Addition of a new principle or materially expanded guidance.
- `PATCH`: Wording clarification, typo fix, or non-semantic refinement.

**Compliance review**: Every feature spec and implementation plan MUST include a
"Constitution Check" section that validates each gate above is either satisfied or
documented as deferred with justification.

**Version**: 1.0.0 | **Ratified**: 2026-07-11 | **Last Amended**: 2026-07-11
