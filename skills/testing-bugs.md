# Skill: Testing y bugs - simulador inversiones

## Objetivo
Detectar regresiones en recupero, ROI, salida estimada, sensibilidad, cuotas y flujo proyectado.

## Cuando usarla
Usala ante bug, cambio de formula, escenarios o UI de resultados.

## Pasos obligatorios
- Reproducir con numeros concretos.
- Probar inversion contado, financiada y mixta.
- Verificar salida dentro y fuera del periodo inicial.
- Comparar escenarios base, dificil, favorable y custom.

## Checklist antes de modificar
- Caso esperado calculado.
- Tests relevantes ubicados.
- Se sabe si falla motor o UI.

## Checklist antes de finalizar
- `npm test` pasa.
- `npm run build` pasa.
- Casos extremos siguen finitos.

## Errores que debe evitar
- Forzar tests sin validar negocio.
- Ignorar recupero nulo por flujo negativo.
- Romper extension automatica del periodo por salida/cuotas.

## Comandos de verificacion
- `npm test`
- `npm run build`

## Formato de reporte final
- Caso probado.
- Causa.
- Fix.
- Tests y escenarios.

