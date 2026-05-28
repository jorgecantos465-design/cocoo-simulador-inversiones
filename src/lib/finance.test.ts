import { describe, expect, it } from "vitest";
import { affordabilityStatus, calculate, type Inputs } from "./finance";

const baseInputs: Inputs = {
  income: 0,
  expenses: 0,
  cash: 0,
  currency: "ARS",
  analysisMonths: 12,
  investment: 0,
  hasNewExpense: false,
  newExpense: 0,
  hasNewIncome: false,
  newIncome: 0,
  exitValue: 0,
  exitMonth: 12,
  paymentType: "100% contado",
  downPayment: 0,
  financedAmount: 0,
  installments: 12,
  offeredInstallment: 0
};

function purchase(overrides: Partial<Inputs>) {
  return calculate(
    {
      ...baseInputs,
      hasNewIncome: true,
      hasNewExpense: true,
      ...overrides
    },
    {},
    false
  );
}

function investment(overrides: Partial<Inputs>) {
  return calculate(
    {
      ...baseInputs,
      hasNewIncome: true,
      hasNewExpense: true,
      ...overrides
    },
    {},
    true
  );
}

function expectFiniteCalculation(result: ReturnType<typeof calculate>) {
  const values = [
    result.finalCash,
    result.totalResult,
    result.incrementalResult,
    result.minCash,
    result.currentFlow,
    result.monthlyFlow,
    result.cashFlow,
    result.mostDemandingMonth,
    result.upfrontPaid,
    result.totalFinanced,
    result.totalPaid,
    result.financeCost,
    result.financeCostPct,
    result.exitValue,
    result.investmentResult
  ];

  for (const value of values) {
    expect(Number.isFinite(value)).toBe(true);
  }
  for (const row of result.rows) {
    expect(Object.values(row).every((value) => Number.isFinite(value))).toBe(true);
  }
}

describe("financial calculations", () => {
  it("calculates cash purchase without current income", () => {
    const result = purchase({
      cash: 14000,
      investment: 6000,
      newIncome: 400,
      newExpense: 100
    });

    expect(result.monthlyFlow).toBe(300);
    expect(result.currentFlow).toBe(0);
    expect(result.incrementalResult).toBe(-2400);
    expect(result.finalCash).toBe(11600);
    expect(result.recoveryMonths).toBe(20);
    expect(result.recoveryMonths).toBeGreaterThan(result.rows.length);
    expect(result.minCash).toBe(8300);
    expect(result.mostDemandingMonth).toBe(1);
  });

  it("keeps current flow separate from decision incremental result", () => {
    const result = purchase({
      cash: 14000,
      income: 2700,
      expenses: 2500,
      investment: 6000,
      newIncome: 400,
      newExpense: 100
    });

    expect(result.currentFlow).toBe(200);
    expect(result.cashFlow).toBe(500);
    expect(result.monthlyFlow).toBe(300);
    expect(result.incrementalResult).toBe(-2400);
    expect(result.finalCash).toBe(14000);
    expect(result.recoveryMonths).toBe(20);
    expect(result.minCash).toBe(8500);
  });

  it("calculates current monthly flow only from current income minus current expenses", () => {
    const result = calculate(
      {
        ...baseInputs,
        income: 2000000,
        expenses: 1800000,
        hasNewIncome: true,
        newIncome: 500000,
        hasNewExpense: true,
        newExpense: 100000,
        paymentType: "100% financiado",
        financedAmount: 1200000,
        installments: 12,
        offeredInstallment: 150000
      },
      { incomePct: -0.5, expensePct: 0.5, incomeChange: 300000, expenseChange: 200000 },
      false
    );

    expect(result.currentFlow).toBe(200000);
  });

  it("calculates fully financed purchase", () => {
    const result = purchase({
      cash: 10000,
      income: 2000,
      expenses: 1500,
      investment: 6000,
      newIncome: 0,
      newExpense: 200,
      paymentType: "100% financiado",
      financedAmount: 6000,
      installments: 12,
      offeredInstallment: 700
    });

    expect(result.upfrontPaid).toBe(0);
    expect(result.monthlyFlow).toBe(-900);
    expect(result.cashFlow).toBe(-400);
    expect(result.totalPaid).toBe(8400);
    expect(result.financeCost).toBe(2400);
    expect(result.finalCash).toBe(5200);
    expect(result.minCash).toBe(5200);
  });

  it("calculates mixed upfront and financed purchase", () => {
    const result = purchase({
      cash: 15000,
      income: 3000,
      expenses: 2200,
      investment: 10000,
      newIncome: 0,
      newExpense: 300,
      paymentType: "Parte contado + parte financiado",
      downPayment: 4000,
      financedAmount: 6000,
      installments: 12,
      offeredInstallment: 650
    });

    expect(result.upfrontPaid).toBe(4000);
    expect(result.rows[0].upfrontPayment).toBe(4000);
    expect(result.rows.every((row) => row.financingPayment === 650)).toBe(true);
    expect(result.totalPaid).toBe(7800);
    expect(result.financeCost).toBe(1800);
    expect(result.cashFlow).toBe(-150);
    expect(result.finalCash).toBe(9200);
    expect(result.minCash).toBe(9200);
  });

  it("does not subtract financed principal again in mixed financing", () => {
    const result = purchase({
      cash: 36000000,
      income: 3000000,
      expenses: 2500000,
      investment: 46000000,
      hasNewIncome: false,
      newIncome: 0,
      hasNewExpense: true,
      newExpense: 100000,
      paymentType: "Parte contado + parte financiado",
      downPayment: 34000000,
      financedAmount: 12000000,
      installments: 12,
      offeredInstallment: 1460000
    });

    expect(result.cashFlow).toBe(-1060000);
    expect(result.upfrontPaid).toBe(34000000);
    expect(result.rows[0].upfrontPayment).toBe(34000000);
    expect(result.rows.every((row) => row.financingPayment === 1460000)).toBe(true);
    expect(result.finalCash).toBe(-10720000);
    expect(result.minCash).toBe(-10720000);
  });

  it("accumulates 36 installments and lower monthly expenses in mixed purchase financing", () => {
    const result = purchase({
      cash: 0,
      income: 2000000,
      expenses: 1800000,
      investment: 47500000,
      hasNewIncome: false,
      newIncome: 0,
      hasNewExpense: true,
      newExpense: -200000,
      paymentType: "Parte contado + parte financiado",
      downPayment: 30000000,
      financedAmount: 17500000,
      installments: 36,
      offeredInstallment: 650000,
      analysisMonths: 12
    });

    expect(result.rows).toHaveLength(36);
    expect(result.currentFlow).toBe(200000);
    expect(result.cashFlow).toBe(-250000);
    expect(result.upfrontPaid).toBe(30000000);
    expect(result.rows[0].upfrontPayment).toBe(30000000);
    expect(result.rows.every((row) => row.financingPayment === 650000)).toBe(true);
    expect(result.rows.reduce((acc, row) => acc + row.financingPayment, 0)).toBe(23400000);
    expect(result.rows[0].accumulatedCash).toBe(-30250000);
    expect(result.finalCash).toBe(-39000000);
    expect(result.minCash).toBe(-39000000);
    expect(result.status).toBe("Riesgo alto");
  });

  it("keeps analysis months affecting purchase results", () => {
    const sixMonths = purchase({
      cash: 1000000,
      income: 1000000,
      expenses: 800000,
      investment: 300000,
      newIncome: 0,
      newExpense: 50000,
      analysisMonths: 6
    });
    const twelveMonths = purchase({
      cash: 1000000,
      income: 1000000,
      expenses: 800000,
      investment: 300000,
      newIncome: 0,
      newExpense: 50000,
      analysisMonths: 12
    });

    expect(sixMonths.rows).toHaveLength(6);
    expect(twelveMonths.rows).toHaveLength(12);
    expect(twelveMonths.finalCash).toBe(sixMonths.finalCash + 900000);
  });

  it("applies positive and negative monthly expense changes", () => {
    const higherExpense = purchase({
      cash: 1000000,
      income: 1000000,
      expenses: 800000,
      investment: 0,
      newIncome: 0,
      newExpense: 100000,
      analysisMonths: 12
    });
    const lowerExpense = purchase({
      cash: 1000000,
      income: 1000000,
      expenses: 800000,
      investment: 0,
      newIncome: 0,
      newExpense: -80000,
      analysisMonths: 12
    });

    expect(higherExpense.cashFlow).toBe(100000);
    expect(lowerExpense.cashFlow).toBe(280000);
    expect(lowerExpense.finalCash).toBeGreaterThan(higherExpense.finalCash);
  });

  it("calculates investment with exit inside selected period", () => {
    const result = investment({
      cash: 14000,
      income: 2700,
      expenses: 2500,
      investment: 6000,
      newIncome: 400,
      newExpense: 100,
      exitValue: 2000,
      exitMonth: 12
    });

    expect(result.rows).toHaveLength(12);
    expect(result.currentFlow).toBe(200);
    expect(result.monthlyFlow).toBe(300);
    expect(result.investmentResult).toBe(-400);
    expect(result.finalCash).toBe(16000);
    expect(result.recoveryMonths).toBe(20);
    expect(result.rows[10].exitIncome).toBe(0);
    expect(result.rows[11].exitIncome).toBe(2000);
  });

  it("extends investment period when exit is outside selected period", () => {
    const result = investment({
      cash: 14000,
      income: 2700,
      expenses: 2500,
      investment: 6000,
      newIncome: 400,
      newExpense: 100,
      exitValue: 2000,
      exitMonth: 24,
      analysisMonths: 12
    });

    expect(result.rows).toHaveLength(24);
    expect(result.currentFlow).toBe(200);
    expect(result.monthlyFlow).toBe(300);
    expect(result.recoveryMonths).toBe(20);
    expect(result.exitMonth).toBe(24);
    expect(result.rows[11].exitIncome).toBe(0);
    expect(result.rows[23].exitIncome).toBe(2000);
    expect(result.investmentResult).toBe(3200);
    expect(result.finalCash).toBe(22000);
  });

  it("validates financed investment with negative investment flow", () => {
    const result = investment({
      cash: 10000,
      income: 5000,
      expenses: 3800,
      investment: 12000,
      newIncome: 300,
      newExpense: 500,
      exitValue: 15000,
      exitMonth: 18,
      analysisMonths: 12,
      paymentType: "100% financiado",
      financedAmount: 12000,
      installments: 18,
      offeredInstallment: 900
    });

    expect(result.rows).toHaveLength(18);
    expect(result.currentFlow).toBe(1200);
    expect(result.monthlyFlow).toBe(-1100);
    expect(result.investmentResult).toBe(-4800);
    expect(result.finalCash).toBe(26800);
    expect(result.totalPaid).toBe(16200);
    expect(result.financeCost).toBe(4200);
    expect(result.recoveryMonths).toBeNull();
  });

  it("validates investment without exit value and positive flow", () => {
    const result = investment({
      cash: 5000,
      income: 3000,
      expenses: 2200,
      investment: 4000,
      newIncome: 700,
      newExpense: 200,
      exitValue: 0,
      exitMonth: 0,
      analysisMonths: 12
    });

    expect(result.rows).toHaveLength(12);
    expect(result.currentFlow).toBe(800);
    expect(result.monthlyFlow).toBe(500);
    expect(result.investmentResult).toBe(2000);
    expect(result.finalCash).toBe(16600);
    expect(result.recoveryMonths).toBe(8);
  });

  it("validates investment with operating loss and profitable sale", () => {
    const result = investment({
      cash: 20000,
      income: 4000,
      expenses: 3000,
      investment: 10000,
      newIncome: 0,
      newExpense: 300,
      exitValue: 15000,
      exitMonth: 12,
      analysisMonths: 12
    });

    expect(result.rows).toHaveLength(12);
    expect(result.currentFlow).toBe(1000);
    expect(result.monthlyFlow).toBe(-300);
    expect(result.investmentResult).toBe(1400);
    expect(result.finalCash).toBe(33400);
    expect(result.recoveryMonths).toBeNull();
  });

  it("validates partially financed investment recovery by upfront payment and financed flow", () => {
    const result = investment({
      cash: 12000,
      income: 6000,
      expenses: 4200,
      investment: 20000,
      newIncome: 1200,
      newExpense: 300,
      exitValue: 25000,
      exitMonth: 24,
      analysisMonths: 12,
      paymentType: "Parte contado + parte financiado",
      downPayment: 8000,
      financedAmount: 12000,
      installments: 24,
      offeredInstallment: 700
    });

    expect(result.rows).toHaveLength(24);
    expect(result.currentFlow).toBe(1800);
    expect(result.monthlyFlow).toBe(200);
    expect(result.investmentResult).toBe(21800);
    expect(result.finalCash).toBe(77000);
    expect(result.totalPaid).toBe(16800);
    expect(result.financeCost).toBe(4800);
    expect(result.recoveryMonths).toBe(40);
  });

  it("stress-tests complex investment cases", () => {
    const cases = [
      {
        name: "Caso extremo 1 - terreno mixto con salida tardía",
        input: {
          income: 4500,
          expenses: 3200,
          cash: 25000,
          investment: 50000,
          newIncome: 0,
          newExpense: 250,
          exitValue: 68000,
          exitMonth: 30,
          analysisMonths: 18,
          paymentType: "Parte contado + parte financiado" as PaymentType,
          downPayment: 20000,
          financedAmount: 30000,
          installments: 24,
          offeredInstallment: 1600
        },
        expected: {
          effectiveMonths: 30,
          currentFlow: 1300,
          operatingFlow: -250,
          monthlyFlow: -1850,
          totalPaid: 38400,
          financeCost: 8400,
          investmentResult: 2100,
          finalCash: 66100,
          minCash: -8200,
          mostDemandingMonth: 24,
          recoveryMonths: null
        }
      },
      {
        name: "Caso extremo 2 - auto para reventa financiado",
        input: {
          income: 6000,
          expenses: 4200,
          cash: 12000,
          investment: 18000,
          newIncome: 500,
          newExpense: 350,
          exitValue: 26000,
          exitMonth: 14,
          analysisMonths: 12,
          paymentType: "100% financiado" as PaymentType,
          financedAmount: 18000,
          installments: 18,
          offeredInstallment: 1250
        },
        expected: {
          effectiveMonths: 18,
          currentFlow: 1800,
          operatingFlow: 150,
          monthlyFlow: -1100,
          totalPaid: 22500,
          financeCost: 4500,
          investmentResult: 6200,
          finalCash: 50600,
          minCash: 12700,
          mostDemandingMonth: 1,
          recoveryMonths: null
        }
      },
      {
        name: "Caso extremo 3 - networking caro con retorno mensual",
        input: {
          income: 3500000,
          expenses: 2900000,
          cash: 2500000,
          investment: 4200000,
          newIncome: 650000,
          newExpense: 120000,
          exitValue: 0,
          exitMonth: 0,
          analysisMonths: 18,
          paymentType: "Parte contado + parte financiado" as PaymentType,
          downPayment: 1700000,
          financedAmount: 2500000,
          installments: 12,
          offeredInstallment: 320000
        },
        expected: {
          effectiveMonths: 18,
          currentFlow: 600000,
          operatingFlow: 530000,
          monthlyFlow: 210000,
          totalPaid: 3840000,
          financeCost: 1340000,
          investmentResult: 4000000,
          finalCash: 17300000,
          minCash: 1610000,
          mostDemandingMonth: 1,
          recoveryMonths: 9,
          exactRecoveryMonths: 1700000 / 210000
        }
      },
      {
        name: "Caso extremo 4 - herramienta productiva contado",
        input: {
          income: 2800000,
          expenses: 2100000,
          cash: 6000000,
          investment: 5000000,
          newIncome: 900000,
          newExpense: 180000,
          exitValue: 1200000,
          exitMonth: 10,
          analysisMonths: 12,
          paymentType: "100% contado" as PaymentType
        },
        expected: {
          effectiveMonths: 12,
          currentFlow: 700000,
          operatingFlow: 720000,
          monthlyFlow: 720000,
          totalPaid: 0,
          financeCost: 0,
          investmentResult: 4840000,
          finalCash: 19240000,
          minCash: 2420000,
          mostDemandingMonth: 1,
          recoveryMonths: 7,
          exactRecoveryMonths: 5000000 / 720000
        }
      },
      {
        name: "Caso extremo 5 - propiedad con renta y financiación larga",
        input: {
          income: 7000,
          expenses: 4500,
          cash: 40000,
          investment: 90000,
          newIncome: 650,
          newExpense: 300,
          exitValue: 110000,
          exitMonth: 36,
          analysisMonths: 24,
          paymentType: "Parte contado + parte financiado" as PaymentType,
          downPayment: 30000,
          financedAmount: 60000,
          installments: 36,
          offeredInstallment: 2100
        },
        expected: {
          effectiveMonths: 36,
          currentFlow: 2500,
          operatingFlow: 350,
          monthlyFlow: -1750,
          totalPaid: 75600,
          financeCost: 15600,
          investmentResult: 17000,
          finalCash: 147000,
          minCash: 10750,
          mostDemandingMonth: 1,
          recoveryMonths: null
        }
      }
    ];

    const summary = [];

    for (const testCase of cases) {
      const result = investment(testCase.input);
      const exactRecoveryMonths = result.monthlyFlow > 0 ? result.upfrontPaid / result.monthlyFlow : null;

      expect(result.rows).toHaveLength(testCase.expected.effectiveMonths);
      expect(result.currentFlow).toBe(testCase.expected.currentFlow);
      expect(testCase.input.newIncome - testCase.input.newExpense).toBe(testCase.expected.operatingFlow);
      expect(result.monthlyFlow).toBe(testCase.expected.monthlyFlow);
      expect(result.totalPaid).toBe(testCase.expected.totalPaid);
      expect(result.financeCost).toBe(testCase.expected.financeCost);
      expect(result.investmentResult).toBe(testCase.expected.investmentResult);
      expect(result.finalCash).toBe(testCase.expected.finalCash);
      expect(result.minCash).toBe(testCase.expected.minCash);
      expect(result.mostDemandingMonth).toBe(testCase.expected.mostDemandingMonth);
      expect(result.recoveryMonths).toBe(testCase.expected.recoveryMonths);
      if (testCase.expected.exactRecoveryMonths) {
        expect(exactRecoveryMonths).toBeCloseTo(testCase.expected.exactRecoveryMonths, 6);
      } else {
        expect(exactRecoveryMonths).toBeNull();
      }
      expectFiniteCalculation(result);

      summary.push({
        case: testCase.name,
        passed: true,
        effectiveMonths: result.rows.length,
        currentFlow: result.currentFlow,
        operatingFlow: testCase.input.newIncome - testCase.input.newExpense,
        financedFlow: result.monthlyFlow,
        totalPaid: result.totalPaid,
        financeCost: result.financeCost,
        investmentResult: result.investmentResult,
        finalCash: result.finalCash,
        minCash: result.minCash,
        mostDemandingMonth: result.mostDemandingMonth,
        recoveryMonths: result.recoveryMonths ?? "No recupera",
        exactRecoveryMonths: exactRecoveryMonths === null ? "No recupera" : Number(exactRecoveryMonths.toFixed(1))
      });
    }

    console.table(summary);
  });

  it("keeps stress-test investment scenarios responsive and finite", () => {
    const cases: Inputs[] = [
      {
        ...baseInputs,
        income: 4500,
        expenses: 3200,
        cash: 25000,
        investment: 50000,
        hasNewIncome: true,
        newIncome: 0,
        hasNewExpense: true,
        newExpense: 250,
        exitValue: 68000,
        exitMonth: 30,
        analysisMonths: 18,
        paymentType: "Parte contado + parte financiado",
        downPayment: 20000,
        financedAmount: 30000,
        installments: 24,
        offeredInstallment: 1600
      },
      {
        ...baseInputs,
        income: 6000,
        expenses: 4200,
        cash: 12000,
        investment: 18000,
        hasNewIncome: true,
        newIncome: 500,
        hasNewExpense: true,
        newExpense: 350,
        exitValue: 26000,
        exitMonth: 14,
        analysisMonths: 12,
        paymentType: "100% financiado",
        financedAmount: 18000,
        installments: 18,
        offeredInstallment: 1250
      },
      {
        ...baseInputs,
        income: 3500000,
        expenses: 2900000,
        cash: 2500000,
        investment: 4200000,
        hasNewIncome: true,
        newIncome: 650000,
        hasNewExpense: true,
        newExpense: 120000,
        exitValue: 0,
        exitMonth: 0,
        analysisMonths: 18,
        paymentType: "Parte contado + parte financiado",
        downPayment: 1700000,
        financedAmount: 2500000,
        installments: 12,
        offeredInstallment: 320000
      },
      {
        ...baseInputs,
        income: 2800000,
        expenses: 2100000,
        cash: 6000000,
        investment: 5000000,
        hasNewIncome: true,
        newIncome: 900000,
        hasNewExpense: true,
        newExpense: 180000,
        exitValue: 1200000,
        exitMonth: 10,
        analysisMonths: 12
      },
      {
        ...baseInputs,
        income: 7000,
        expenses: 4500,
        cash: 40000,
        investment: 90000,
        hasNewIncome: true,
        newIncome: 650,
        hasNewExpense: true,
        newExpense: 300,
        exitValue: 110000,
        exitMonth: 36,
        analysisMonths: 24,
        paymentType: "Parte contado + parte financiado",
        downPayment: 30000,
        financedAmount: 60000,
        installments: 36,
        offeredInstallment: 2100
      }
    ];

    for (const inputs of cases) {
      const base = calculate(inputs, {}, true);
      const difficult = calculate(inputs, { incomeChange: -Math.max(1, inputs.newIncome * 0.2), expenseChange: Math.max(1, inputs.newExpense * 0.1), exitValuePct: -0.2, exitMonthDelta: 2 }, true);
      const favorable = calculate(inputs, { incomeChange: Math.max(1, inputs.newIncome * 0.2), expenseChange: -Math.max(1, inputs.newExpense * 0.1), exitValuePct: 0.2, exitMonthDelta: inputs.exitMonth > 1 ? -1 : 0 }, true);
      const custom = calculate(inputs, { incomeChange: Math.max(1, inputs.newIncome * 0.15), expenseChange: Math.max(1, inputs.newExpense * 0.05), exitValuePct: 0.05 }, true);

      expect(difficult.finalCash).toBeLessThan(base.finalCash);
      expect(difficult.investmentResult).toBeLessThan(base.investmentResult);
      expect(favorable.finalCash).toBeGreaterThan(base.finalCash);
      expect(favorable.investmentResult).toBeGreaterThan(base.investmentResult);
      expect(custom.finalCash).not.toBe(base.finalCash);
      expect(custom.investmentResult).not.toBe(base.investmentResult);
      expectFiniteCalculation(base);
      expectFiniteCalculation(difficult);
      expectFiniteCalculation(favorable);
      expectFiniteCalculation(custom);
    }
  });

  it("keeps investment scenarios ordered and recalculates custom scenario", () => {
    const inputs: Inputs = {
      ...baseInputs,
      cash: 14000,
      income: 2700,
      expenses: 2500,
      investment: 6000,
      hasNewIncome: true,
      newIncome: 400,
      hasNewExpense: true,
      newExpense: 100,
      exitValue: 2000,
      exitMonth: 12,
      analysisMonths: 12
    };

    const base = calculate(inputs, {}, true);
    const difficult = calculate(inputs, { incomeChange: -80, expenseChange: 10, exitValuePct: -0.2, exitMonthDelta: 2 }, true);
    const favorable = calculate(inputs, { incomeChange: 80, expenseChange: -10, exitValuePct: 0.2, exitMonthDelta: -1 }, true);
    const custom = calculate(inputs, { incomeChange: 120, expenseChange: 40, exitValuePct: 0.1 }, true);

    expect(difficult.cashFlow).toBeLessThan(base.cashFlow);
    expect(difficult.finalCash).toBeLessThan(base.finalCash);
    expect(difficult.investmentResult).toBeLessThan(base.investmentResult);
    expect(favorable.cashFlow).toBeGreaterThan(base.cashFlow);
    expect(favorable.finalCash).toBeGreaterThan(base.finalCash);
    expect(favorable.investmentResult).toBeGreaterThan(base.investmentResult);
    expect(custom.finalCash).not.toBe(base.finalCash);
    expect(custom.investmentResult).not.toBe(base.investmentResult);
  });

  it("reports investment validation cases to console", () => {
    const case1 = investment({
      cash: 14000,
      income: 2700,
      expenses: 2500,
      investment: 6000,
      newIncome: 400,
      newExpense: 100,
      exitValue: 2000,
      exitMonth: 12,
      analysisMonths: 12
    });
    const case2 = investment({
      cash: 14000,
      income: 2700,
      expenses: 2500,
      investment: 6000,
      newIncome: 400,
      newExpense: 100,
      exitValue: 2000,
      exitMonth: 24,
      analysisMonths: 12
    });
    const case3 = investment({
      cash: 10000,
      income: 5000,
      expenses: 3800,
      investment: 12000,
      newIncome: 300,
      newExpense: 500,
      exitValue: 15000,
      exitMonth: 18,
      analysisMonths: 12,
      paymentType: "100% financiado",
      financedAmount: 12000,
      installments: 18,
      offeredInstallment: 900
    });
    const case4 = investment({
      cash: 5000,
      income: 3000,
      expenses: 2200,
      investment: 4000,
      newIncome: 700,
      newExpense: 200,
      exitValue: 0,
      exitMonth: 0,
      analysisMonths: 12
    });
    const case5 = investment({
      cash: 20000,
      income: 4000,
      expenses: 3000,
      investment: 10000,
      newIncome: 0,
      newExpense: 300,
      exitValue: 15000,
      exitMonth: 12,
      analysisMonths: 12
    });
    const case6 = investment({
      cash: 12000,
      income: 6000,
      expenses: 4200,
      investment: 20000,
      newIncome: 1200,
      newExpense: 300,
      exitValue: 25000,
      exitMonth: 24,
      analysisMonths: 12,
      paymentType: "Parte contado + parte financiado",
      downPayment: 8000,
      financedAmount: 12000,
      installments: 24,
      offeredInstallment: 700
    });

    console.table([
      {
        case: "Caso 1",
        effectiveMonths: case1.rows.length,
        currentFlow: case1.currentFlow,
        investmentFlow: case1.monthlyFlow,
        investmentResult: case1.investmentResult,
        finalCash: case1.finalCash,
        recoveryMonths: case1.recoveryMonths ?? "No recupera",
        exitMonth: case1.exitMonth,
        totalPaid: case1.totalPaid,
        financeCost: case1.financeCost
      },
      {
        case: "Caso 2",
        effectiveMonths: case2.rows.length,
        currentFlow: case2.currentFlow,
        investmentFlow: case2.monthlyFlow,
        investmentResult: case2.investmentResult,
        finalCash: case2.finalCash,
        recoveryMonths: case2.recoveryMonths ?? "No recupera",
        exitMonth: case2.exitMonth,
        totalPaid: case2.totalPaid,
        financeCost: case2.financeCost
      },
      {
        case: "Caso 3",
        effectiveMonths: case3.rows.length,
        currentFlow: case3.currentFlow,
        investmentFlow: case3.monthlyFlow,
        investmentResult: case3.investmentResult,
        finalCash: case3.finalCash,
        recoveryMonths: case3.recoveryMonths ?? "No recupera",
        exitMonth: case3.exitMonth,
        totalPaid: case3.totalPaid,
        financeCost: case3.financeCost
      },
      {
        case: "Caso 4",
        effectiveMonths: case4.rows.length,
        currentFlow: case4.currentFlow,
        investmentFlow: case4.monthlyFlow,
        investmentResult: case4.investmentResult,
        finalCash: case4.finalCash,
        recoveryMonths: case4.recoveryMonths ?? "No recupera",
        exitMonth: case4.exitMonth,
        totalPaid: case4.totalPaid,
        financeCost: case4.financeCost
      },
      {
        case: "Caso 5",
        effectiveMonths: case5.rows.length,
        currentFlow: case5.currentFlow,
        investmentFlow: case5.monthlyFlow,
        investmentResult: case5.investmentResult,
        finalCash: case5.finalCash,
        recoveryMonths: case5.recoveryMonths ?? "No recupera",
        exitMonth: case5.exitMonth,
        totalPaid: case5.totalPaid,
        financeCost: case5.financeCost
      },
      {
        case: "Caso 6",
        effectiveMonths: case6.rows.length,
        currentFlow: case6.currentFlow,
        investmentFlow: case6.monthlyFlow,
        investmentResult: case6.investmentResult,
        finalCash: case6.finalCash,
        recoveryMonths: case6.recoveryMonths ?? "No recupera",
        exitMonth: case6.exitMonth,
        totalPaid: case6.totalPaid,
        financeCost: case6.financeCost
      }
    ]);

    expect(case1.finalCash).toBe(16000);
    expect(case2.finalCash).toBe(22000);
    expect(case3.finalCash).toBe(26800);
    expect(case4.finalCash).toBe(16600);
    expect(case5.finalCash).toBe(33400);
    expect(case6.finalCash).toBe(77000);
  });

  it("recalculates predefined and custom scenarios from monthly amount changes", () => {
    const inputs: Inputs = {
      ...baseInputs,
      cash: 14000,
      income: 2700,
      expenses: 2500,
      investment: 6000,
      hasNewIncome: true,
      newIncome: 400,
      hasNewExpense: true,
      newExpense: 100
    };

    const base = calculate(inputs);
    const difficult = calculate(inputs, { incomeChange: -80, expenseChange: 10 });
    const favorable = calculate(inputs, { incomeChange: 80, expenseChange: -10 });
    const custom = calculate(inputs, { incomeChange: 200, expenseChange: 100 });

    expect(difficult.finalCash).toBeLessThan(base.finalCash);
    expect(difficult.minCash).toBeLessThan(base.minCash);
    expect(difficult.cashFlow).toBeLessThan(base.cashFlow);
    expect(favorable.finalCash).toBeGreaterThan(base.finalCash);
    expect(custom.finalCash).not.toBe(base.finalCash);
  });

  it("applies custom amount changes even without existing new income or expense", () => {
    const base = calculate({
      ...baseInputs,
      cash: 1000000,
      income: 1000000,
      expenses: 800000,
      investment: 0,
      hasNewIncome: false,
      hasNewExpense: false,
      analysisMonths: 12
    });
    const custom = calculate(
      {
        ...baseInputs,
        cash: 1000000,
        income: 1000000,
        expenses: 800000,
        investment: 0,
        hasNewIncome: false,
        hasNewExpense: false,
        analysisMonths: 12
      },
      { incomeChange: 200000, expenseChange: 100000 }
    );

    expect(custom.cashFlow).toBe(base.cashFlow + 100000);
    expect(custom.finalCash).toBe(base.finalCash + 1200000);
    expect(custom.minCash).toBe(base.minCash + 100000);
  });

  it("does not mark recoverable positive-flow scenarios as high risk", () => {
    const result = purchase({
      cash: 1000,
      income: 1000,
      expenses: 82,
      investment: 2500,
      newIncome: 0,
      newExpense: 0,
      analysisMonths: 12
    });

    expect(result.cashFlow).toBe(918);
    expect(result.finalCash).toBe(9516);
    expect(result.minCash).toBe(-582);
    expect(result.status).toBe("Ajustada");
  });

  it("marks clearly favorable custom scenarios as positive", () => {
    const custom = calculate(
      {
        ...baseInputs,
        cash: 3000000,
        income: 2700000,
        expenses: 2500000,
        investment: 2500000,
        hasNewIncome: true,
        newIncome: 0,
        hasNewExpense: true,
        newExpense: 0,
        analysisMonths: 12
      },
      { incomeChange: 200000, expenseChange: -50000 },
      false
    );

    expect(custom.cashFlow).toBe(450000);
    expect(custom.finalCash).toBe(5900000);
    expect(custom.minCash).toBe(950000);
    expect(custom.status).toBe("Sostenible");
  });

  it("classifies the reported manual examples without changing calculations", () => {
    expect(affordabilityStatus(9516000, -1000, 918000)).toBe("Ajustada");
    expect(affordabilityStatus(68952000, 4371000, 5871000)).toBe("Sostenible");
  });

  it("validates real case 1: cash purchase with enough cash", () => {
    const result = purchase({
      income: 3000000,
      expenses: 2200000,
      cash: 12000000,
      investment: 8500000,
      hasNewIncome: false,
      newIncome: 0,
      hasNewExpense: true,
      newExpense: 150000,
      paymentType: "100% contado",
      analysisMonths: 12
    });

    expect(result.rows).toHaveLength(12);
    expect(result.cashFlow).toBe(650000);
    expect(result.monthlyFlow).toBe(-150000);
    expect(result.upfrontPaid).toBe(8500000);
    expect(result.finalCash).toBe(11300000);
    expect(result.minCash).toBe(4150000);
    expect(result.mostDemandingMonth).toBe(1);
    expect(result.status).not.toBe("Riesgo alto");
  });

  it("validates real case 2: demanding mixed purchase financing", () => {
    const result = purchase({
      income: 2000000,
      expenses: 1800000,
      cash: 30000000,
      investment: 47500000,
      hasNewIncome: false,
      newIncome: 0,
      hasNewExpense: true,
      newExpense: -200000,
      paymentType: "Parte contado + parte financiado",
      downPayment: 30000000,
      financedAmount: 17500000,
      installments: 36,
      offeredInstallment: 750000,
      analysisMonths: 12
    });

    expect(result.rows).toHaveLength(36);
    expect(result.cashFlow).toBe(-350000);
    expect(result.monthlyFlow).toBe(-550000);
    expect(result.upfrontPaid).toBe(30000000);
    expect(result.totalFinanced).toBe(17500000);
    expect(result.rows.every((row) => row.financingPayment === 750000)).toBe(true);
    expect(result.finalCash).toBe(-12600000);
    expect(result.minCash).toBe(-12600000);
    expect(result.status).toBe("Riesgo alto");
  });

  it("validates real case 3: sustainable fully financed purchase", () => {
    const result = purchase({
      income: 4000000,
      expenses: 2600000,
      cash: 3000000,
      investment: 9000000,
      hasNewIncome: false,
      newIncome: 0,
      hasNewExpense: true,
      newExpense: 200000,
      paymentType: "100% financiado",
      financedAmount: 9000000,
      installments: 12,
      offeredInstallment: 900000,
      analysisMonths: 12
    });

    expect(result.rows).toHaveLength(12);
    expect(result.cashFlow).toBe(300000);
    expect(result.monthlyFlow).toBe(-1100000);
    expect(result.upfrontPaid).toBe(0);
    expect(result.totalFinanced).toBe(9000000);
    expect(result.finalCash).toBe(6600000);
    expect(result.minCash).toBe(3300000);
    expect(result.mostDemandingMonth).toBe(1);
    expect(result.status).not.toBe("Riesgo alto");
  });

  it("validates real scenarios ordering and custom recalculation", () => {
    const inputs: Inputs = {
      ...baseInputs,
      income: 3000000,
      expenses: 2200000,
      cash: 12000000,
      investment: 8500000,
      hasNewIncome: false,
      newIncome: 0,
      hasNewExpense: true,
      newExpense: 150000,
      paymentType: "100% contado",
      analysisMonths: 12
    };

    const base = calculate(inputs);
    const difficult = calculate(inputs, { incomeChange: -100000, expenseChange: 50000 });
    const favorable = calculate(inputs, { incomeChange: 100000, expenseChange: -50000 });
    const custom = calculate(inputs, { incomeChange: 250000, expenseChange: 100000 });

    expect(difficult.cashFlow).toBeLessThan(base.cashFlow);
    expect(difficult.finalCash).toBeLessThan(base.finalCash);
    expect(difficult.minCash).toBeLessThan(base.minCash);
    expect(favorable.cashFlow).toBeGreaterThan(base.cashFlow);
    expect(favorable.finalCash).toBeGreaterThan(base.finalCash);
    expect(favorable.minCash).toBeGreaterThan(base.minCash);
    expect(custom.cashFlow).toBe(base.cashFlow + 150000);
    expect(custom.finalCash).toBe(base.finalCash + 1800000);
  });
});
