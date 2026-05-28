# Skill: Motor matematico / logica - simulador inversiones

## Objetivo
Proteger calculos de ROI, recupero, rentabilidad, salida, financiamiento, flujo proyectado e impacto patrimonial.

## Cuando usarla
Usala al tocar `finance.ts`, escenarios, recupero, salida o calculos de resultado.

## Pasos obligatorios
- Definir casos numericos antes de modificar.
- Separar flujo mensual, pago inicial, cuotas y valor de salida.
- Validar salida tardia y cuotas mas largas que el periodo.
- Probar sensibilidad negativa y positiva.

## Checklist antes de modificar
- Formula actual entendida.
- Tests de inversion ubicados.
- Resultado esperado calculado manualmente.

## Checklist antes de finalizar
- `npm test` pasa.
- `investmentResult`, `recoveryMonths` y `finalCash` son coherentes.
- No hay `NaN`, infinitos ni meses invalidos.

## Errores que debe evitar
- Contar salida dos veces.
- Confundir flujo operativo con flujo financiado.
- Marcar recupero cuando el flujo mensual es negativo.

## Comandos de verificacion
- `npm test`
- `npm run build`

## Formato de reporte final
- Formula tocada.
- Casos numericos.
- Resultados antes/despues.
- Cobertura de tests.

