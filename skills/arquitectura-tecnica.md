# Skill: Arquitectura tecnica - simulador inversiones

## Objetivo
Separar gradualmente el producto de inversiones sin romper calculos heredados ni rutas Next.

## Cuando usarla
Usala al tocar rutas, `Simulator.tsx`, tipos de inputs, estructura o codigo heredado de compras.

## Pasos obligatorios
- Revisar `src/app/page.tsx` y `src/app/simulador-inversion/page.tsx`.
- Identificar dependencias con ramas de compra.
- Mantener cambios pequenos.
- No redisenar `finance.ts` sin tests y plan.

## Checklist antes de modificar
- Dependencias cruzadas entendidas.
- Build base conocido.
- No se modifica `package.json`.

## Checklist antes de finalizar
- `npm test` y `npm run build` pasan.
- No quedan rutas de compra publicas.
- Imports y tipos quedan coherentes.

## Errores que debe evitar
- Eliminar campos usados por salida o recupero.
- Cambiar `calculate(..., true)` sin actualizar pruebas.
- Mezclar refactor con cambio de formula.

## Comandos de verificacion
- `npm test`
- `npm run build`
- `npm run lint`

## Formato de reporte final
- Estructura afectada.
- Codigo heredado removido o pendiente.
- Validaciones.
- Riesgos.

