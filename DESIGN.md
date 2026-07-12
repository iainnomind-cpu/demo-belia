# DESIGN.md - Belia Premium Beauty Storefront

## Visión General
Belia es una Single Page Application (SPA) construida para proporcionar una experiencia de comercio electrónico rápida y moderna. 
Actualmente, el proyecto opera como una aplicación Frontend independiente (simulando un backend mediante el estado global).

## Tecnologías Principales
- **Framework**: React 18
- **Construcción**: Vite
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Animaciones**: Framer Motion
- **Gestión de Estado**: Zustand
- **Enrutamiento**: React Router DOM

## Arquitectura de Carpetas
- `.agent/skills/` y `.agent/workflows/`: Herramientas de desarrollo de Spec Kit para Antigravity.
- `.agents/rules/ponytail.md`: Reglas de prevención de sobre-ingeniería.
- `src/`: Lógica de Frontend de la aplicación SPA (Páginas, Componentes, Store, Data).

## Módulos del Sistema
1. **Storefront (`/`)**: Tienda pública para usuarios, catálogo animado y un flujo de compra integrado en el sidebar (sin recargar página).
2. **Admin Dashboard (`/admin`)**: Panel de gestión para ver pedidos, administrar inventario de prueba, y calcular automáticamente el LTV (Life Time Value) de los clientes como CRM.

## Flujo de Datos
Toda la información persiste en memoria durante la sesión del usuario a través de `Zustand`. El archivo `vercel.json` asegura el enrutamiento correcto hacia `index.html` al desplegar la plataforma.
