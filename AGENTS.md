# AGENTS.md - cocoo-simulador-inversiones

## Objetivo del proyecto

Web app simple de Cocoo para estimar el impacto de una inversion en la caja personal, incluyendo capital inicial, flujo mensual, costos, financiamiento, salida estimada y escenarios.

## Stack tecnico detectado

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4 via `@tailwindcss/postcss`
- Vitest para pruebas de librerias
- Calculos 100% frontend, sin login ni base de datos

## Comandos

- Instalacion: `npm install`
- Desarrollo: `npm run dev`
- Test: `npm test`
- Build: `npm run build`
- Start produccion: `npm start`
- Lint: `npm run lint` (script existe; verificar compatibilidad de Next 16 si falla)

## Estructura y archivos criticos

- `src/app/page.tsx`: redirect a `/simulador-inversion`.
- `src/app/simulador-inversion/page.tsx`: ruta principal del producto.
- `src/components/Simulator.tsx`: UI y flujo del simulador; todavia conserva ramas compartidas heredadas.
- `src/lib/finance.ts`: motor de calculo financiero compartido heredado.
- `src/lib/finance.test.ts`: tests de calculos, actualmente cubren compras e inversiones.
- `src/lib/format.ts`: parseo y formato de importes.
- `src/app/globals.css`: variables y estilos globales.

## Reglas de trabajo

- No tocar `node_modules`, `.next`, `dist` ni `build`.
- No cambiar `package.json` o lockfile sin avisar antes.
- No reescribir formulas de recupero, salida o financiamiento sin tests.
- Mantener la ruta publica principal en `/simulador-inversion`.
- Si se elimina codigo heredado de compras, hacerlo en pasos chicos y con `npm test` + `npm run build`.
- Mantener la app como simulador informativo, no como recomendacion de inversion.

## No tocar sin autorizacion

- Semantica de `calculate(..., true)`, salida estimada, recupero y estados.
- Casos de inversion en `finance.test.ts`.
- Redirect de `src/app/page.tsx`.
- Cualquier disclaimer o texto de riesgo financiero.

## Estrategia de commits

- Separar limpieza de UI heredada de cambios en formulas.
- Commits especificos para escenarios, calculos, copy o estilos.
- Todo ajuste de recupero/salida debe venir con tests.

## Criterios de finalizacion

- `npm test` pasa.
- `npm run build` pasa.
- Build solo expone `/` y `/simulador-inversion` como rutas funcionales del producto.
- Flujo de inversion contado, financiado, mixto y con salida estimada funciona manualmente.

## Subagentes recomendados

Antes de activar un rol, revisar el indice operativo en `skills/README.md`.

- Roadmap y negocio: usar `skills/roadmap-negocio.md`.
- Arquitectura tecnica: usar `skills/arquitectura-tecnica.md`.
- Motor matematico / logica de negocio: usar `skills/motor-matematico-logica.md`.
- Frontend UI: usar `skills/frontend-ui.md`.
- UX y flujo: usar `skills/ux-flujo.md`.
- Testing y bugs: usar `skills/testing-bugs.md`.
