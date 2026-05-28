export type Currency = "ARS" | "USD";
export type PaymentType = "100% contado" | "Parte contado + parte financiado" | "100% financiado";
export type Status = "Riesgo alto" | "Ajustada" | "Sostenible";

export type Inputs = {
  income: number;
  expenses: number;
  cash: number;
  currency: Currency;
  analysisMonths: number;
  investment: number;
  hasNewExpense: boolean;
  newExpense: number;
  hasNewIncome: boolean;
  newIncome: number;
  exitValue: number;
  exitMonth: number;
  paymentType: PaymentType;
  downPayment: number;
  financedAmount: number;
  installments: number;
  offeredInstallment: number;
};

export type MonthRow = {
  month: number;
  currentIncome: number;
  newIncome: number;
  exitIncome: number;
  totalIncome: number;
  currentExpenses: number;
  newExpenses: number;
  financingPayment: number;
  upfrontPayment: number;
  totalExpenses: number;
  monthlyResult: number;
  accumulatedCash: number;
};

export type Calculation = {
  rows: MonthRow[];
  finalCash: number;
  totalResult: number;
  incrementalResult: number;
  minCash: number;
  currentFlow: number;
  monthlyFlow: number;
  cashFlow: number;
  recoveryMonths: number | null;
  exitMonth: number;
  mostDemandingMonth: number;
  upfrontPaid: number;
  totalFinanced: number;
  totalPaid: number;
  financeCost: number;
  financeCostPct: number;
  exitValue: number;
  investmentResult: number;
  status: Status;
};

export type Scenario = {
  exitValuePct?: number;
  costPct?: number;
  exitMonthDelta?: number;
  incomePct?: number;
  expensePct?: number;
  newIncomePct?: number;
  newExpensePct?: number;
  incomeChange?: number;
  expenseChange?: number;
};

export function clampMonth(value: number, max = 120) {
  return Math.min(max, Math.max(1, Math.round(value || 1)));
}

export function getSimulationMonths(inputs: Inputs, isInvestment: boolean, scenario: Scenario = {}) {
  const selectedMonths = Math.min(24, Math.max(2, Math.round(inputs.analysisMonths || 12)));
  const financingMonths = inputs.paymentType === "100% contado" ? 0 : inputs.installments;
  if (isInvestment) {
    const scenarioExitMonth = Math.max(1, inputs.exitMonth + (scenario.exitMonthDelta ?? 0));
    return Math.max(selectedMonths, scenarioExitMonth, financingMonths);
  }
  return Math.max(selectedMonths, financingMonths);
}

export function getPaymentSummary(inputs: Inputs) {
  const hasFinancing = inputs.paymentType !== "100% contado";
  const totalFinanced = hasFinancing ? inputs.financedAmount : 0;
  const totalPaid = hasFinancing ? inputs.offeredInstallment * inputs.installments : 0;
  const financeCost = totalPaid - totalFinanced;
  const financeCostPct = totalFinanced > 0 ? financeCost / totalFinanced : 0;
  const upfrontPaid =
    inputs.paymentType === "100% contado"
      ? inputs.investment
      : inputs.paymentType === "Parte contado + parte financiado"
        ? inputs.downPayment
        : 0;

  return { hasFinancing, totalFinanced, totalPaid, financeCost, financeCostPct, upfrontPaid };
}

export function affordabilityStatus(finalCash: number, minCash: number, cashFlow: number): Status {
  if (cashFlow > 0 && finalCash > 0 && minCash > 0) return "Sostenible";
  if (cashFlow > 0 && finalCash > 0 && minCash < 0) return "Ajustada";
  if (cashFlow < 0 && finalCash < 0) return "Riesgo alto";
  if (finalCash < 0 || minCash < 0) return "Riesgo alto";
  return "Sostenible";
}

export function investmentStatus(finalCash: number, investmentResult: number, minCash: number, recoveryMonths: number | null, cashFlow: number): Status {
  if (cashFlow > 0 && finalCash > 0 && minCash > 0) return "Sostenible";
  if (cashFlow > 0 && finalCash > 0 && minCash < 0) return "Ajustada";
  if (cashFlow < 0 && finalCash < 0) return "Riesgo alto";
  if (finalCash < 0 || minCash < 0) return "Riesgo alto";
  if (investmentResult < 0 || recoveryMonths === null || recoveryMonths > 12) return "Ajustada";
  return "Sostenible";
}

export function buildProjection(inputs: Inputs, scenario: Scenario = {}, isInvestment = false): MonthRow[] {
  const rows: MonthRow[] = [];
  let cash = inputs.cash;
  const months = getSimulationMonths(inputs, isInvestment, scenario);
  const payment = getPaymentSummary(inputs);
  const adjustedCurrentIncome = Math.max(0, inputs.income * (1 + (scenario.incomePct ?? 0)));
  const adjustedCurrentExpenses = Math.max(0, inputs.expenses * (1 + (scenario.expensePct ?? 0)));
  const baseNewExpense = (isInvestment || inputs.hasNewExpense)
    ? inputs.newExpense * (1 + (scenario.newExpensePct ?? scenario.costPct ?? 0))
    : 0;
  const baseNewIncome = (isInvestment || inputs.hasNewIncome)
    ? inputs.newIncome * (1 + (scenario.newIncomePct ?? 0))
    : 0;
  const adjustedExpense = baseNewExpense + (scenario.expenseChange ?? 0);
  const adjustedIncome = baseNewIncome + (scenario.incomeChange ?? 0);
  const adjustedExitValue = Math.max(0, inputs.exitValue * (1 + (scenario.exitValuePct ?? 0)));
  const exitMonth = clampMonth(inputs.exitMonth + (scenario.exitMonthDelta ?? 0), months);

  for (let month = 1; month <= months; month += 1) {
    const newIncome = adjustedIncome;
    const newExpenses = adjustedExpense;
    const exitIncome = isInvestment && month === exitMonth ? adjustedExitValue : 0;
    const financingPayment =
      payment.hasFinancing && month <= inputs.installments
        ? inputs.offeredInstallment
        : 0;
    const upfrontPayment = month === 1 ? payment.upfrontPaid : 0;
    const totalIncome = adjustedCurrentIncome + newIncome + exitIncome;
    const totalExpenses =
      adjustedCurrentExpenses + newExpenses + financingPayment + upfrontPayment;
    const monthlyResult = totalIncome - totalExpenses;
    cash += monthlyResult;

    rows.push({
      month,
      currentIncome: adjustedCurrentIncome,
      newIncome,
      exitIncome,
      totalIncome,
      currentExpenses: adjustedCurrentExpenses,
      newExpenses,
      financingPayment,
      upfrontPayment,
      totalExpenses,
      monthlyResult,
      accumulatedCash: cash
    });
  }

  return rows;
}

export function calculate(inputs: Inputs, scenario: Scenario = {}, isInvestment = false): Calculation {
  const rows = buildProjection(inputs, scenario, isInvestment);
  const finalCash = rows.at(-1)?.accumulatedCash ?? inputs.cash;
  const minRow = rows.reduce((lowest, row) => row.accumulatedCash < lowest.accumulatedCash ? row : lowest, rows[0]);
  const minCash = minRow?.accumulatedCash ?? inputs.cash;
  const mostDemandingMonth = minRow?.month ?? 1;
  const payment = getPaymentSummary(inputs);
  const baseNewExpense = (isInvestment || inputs.hasNewExpense)
    ? inputs.newExpense * (1 + (scenario.newExpensePct ?? scenario.costPct ?? 0))
    : 0;
  const baseNewIncome = (isInvestment || inputs.hasNewIncome)
    ? inputs.newIncome * (1 + (scenario.newIncomePct ?? 0))
    : 0;
  const adjustedExpense = baseNewExpense + (scenario.expenseChange ?? 0);
  const adjustedIncome = baseNewIncome + (scenario.incomeChange ?? 0);
  const firstMonth = rows[0];
  const currentFlow = inputs.income - inputs.expenses;
  const monthlyFlow = adjustedIncome - adjustedExpense - (payment.hasFinancing ? inputs.offeredInstallment : 0);
  const adjustedExitValue = Math.max(0, inputs.exitValue * (1 + (scenario.exitValuePct ?? 0)));
  const adjustedExitMonth = clampMonth(inputs.exitMonth + (scenario.exitMonthDelta ?? 0), getSimulationMonths(inputs, isInvestment, scenario));
  const generatedIncome = rows.reduce((acc, row) => acc + row.newIncome, 0);
  const carryingCosts = rows.reduce((acc, row) => acc + row.newExpenses, 0);
  const exitIncome = rows.reduce((acc, row) => acc + row.exitIncome, 0);
  const financingPaid = rows.reduce((acc, row) => acc + row.financingPayment, 0);
  const upfrontPaid = rows.reduce((acc, row) => acc + row.upfrontPayment, 0);
  const incrementalResult =
    rows.reduce((acc, row) => acc + row.newIncome - row.newExpenses - row.financingPayment, 0) -
    upfrontPaid;
  const cashFlow = firstMonth
    ? firstMonth.totalIncome - firstMonth.totalExpenses + firstMonth.upfrontPayment - firstMonth.exitIncome
    : inputs.income - inputs.expenses;
  const investmentResult = isInvestment
    ? generatedIncome + exitIncome - carryingCosts - upfrontPaid - financingPaid
    : incrementalResult;
  const recoveryMonths = isInvestment
    ? monthlyFlow > 0
      ? Math.ceil(upfrontPaid / monthlyFlow)
      : null
    : monthlyFlow > 0
      ? Math.ceil(upfrontPaid / monthlyFlow)
      : null;
  const status = isInvestment
    ? investmentStatus(finalCash, investmentResult, minCash, recoveryMonths, cashFlow)
    : affordabilityStatus(finalCash, minCash, cashFlow);

  return {
    rows,
    finalCash,
    totalResult: rows.reduce((acc, row) => acc + row.monthlyResult, 0),
    incrementalResult,
    minCash,
    currentFlow,
    monthlyFlow,
    cashFlow,
    recoveryMonths,
    exitMonth: adjustedExitMonth,
    mostDemandingMonth,
    upfrontPaid,
    totalFinanced: payment.totalFinanced,
    totalPaid: payment.totalPaid,
    financeCost: payment.financeCost,
    financeCostPct: payment.financeCostPct,
    exitValue: adjustedExitValue,
    investmentResult,
    status
  };
}
