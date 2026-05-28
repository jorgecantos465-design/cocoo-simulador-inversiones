# Skills - cocoo-simulador-inversiones

## Indice

- `roadmap-negocio.md`: alcance, disclaimers y lectura de inversion.
- `arquitectura-tecnica.md`: rutas, estructura Next y separacion del codigo heredado.
- `motor-matematico-logica.md`: ROI, recupero, salida, sensibilidad, financiacion y flujo proyectado.
- `frontend-ui.md`: UI de resultados, escenarios y graficos.
- `ux-flujo.md`: pasos, textos, ayudas y lectura de riesgo.
- `testing-bugs.md`: escenarios extremos, regresiones y validacion numerica.

## Cuando activar cada skill

- Cambios visuales: `frontend-ui.md`.
- Cambios de textos, labels o flujo: `ux-flujo.md`.
- Cambios de calculo: `motor-matematico-logica.md` + `testing-bugs.md`.
- Cambios en rutas/estructura: `arquitectura-tecnica.md`.
- Cambios de alcance o disclaimers: `roadmap-negocio.md`.
- Bugs: `testing-bugs.md`.

## Orden recomendado si hay varias capas

1. `roadmap-negocio.md` si cambia alcance o disclaimer.
2. `arquitectura-tecnica.md` si cambia estructura.
3. `motor-matematico-logica.md` si hay calculos.
4. `ux-flujo.md` para textos/orden.
5. `frontend-ui.md` para visual.
6. `testing-bugs.md` siempre que haya calculo o bug.

## Matriz de riesgo

- Bajo: copy menor, estilos menores, README.
- Medio: `Simulator.tsx` visual/flujo, `globals.css`, rutas.
- Alto: `src/lib/finance.ts`, `src/lib/finance.test.ts`, recupero, ROI, salida, escenarios y estados.

## Comandos seguros

- `npm test`
- `npm run build`
- `npm run dev`

## Comandos condicionales

- `npm run lint`: solo si el tooling local de Next lo soporta.
- `npm install`: solo si faltan dependencias.

## Comandos prohibidos o que requieren confirmacion

- `npm audit fix`: requiere confirmacion.
- Cambios en `package.json` o lockfile: requieren confirmacion.
- Reescritura de `finance.ts`: requiere plan y confirmacion.

## Ownership por archivos criticos

- `src/lib/finance.ts`: Motor matematico, ownership principal.
- `src/lib/finance.test.ts`: Testing y bugs, con Motor matematico cuando cambian formulas.
- `src/components/Simulator.tsx`: Frontend UI, UX, Arquitectura; Motor solo para calculos derivados.
- `src/app/page.tsx`, `src/app/simulador-inversion/page.tsx`: Arquitectura tecnica.
- `src/app/globals.css`: Frontend UI.

## Proximo desarrollo recomendado

Separar tests por dominio antes de refactorizar logica financiera.

