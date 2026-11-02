"use client";

import { useEffect, useMemo, useState } from "react";
import { calculate, clampMonth, type Calculation, type Currency, type Inputs, type MonthRow, type PaymentType, type Status } from "@/lib/finance";
import { formatAmount, money, parseAmount } from "@/lib/format";

type DecisionType = "Compra o gasto importante" | "Inversión / crecimiento";
type SimulatorMode = "purchase" | "investment";
type ExpenseDirection = "Aumentan" | "Disminuyen";

const initialInputs: Inputs = {
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

const steps = [
  "Tipo",
  "Situación actual",
  "Decisión",
  "Financiación",
  "Resultados"
];

const decisionCards: Array<{
  type: DecisionType;
  title: string;
  examples: string;
}> = [
  {
    type: "Compra o gasto importante",
    title: "Compra o gasto importante",
    examples: "Autos, propiedades de uso, mudanzas, compras personales y bienes de consumo."
  },
  {
    type: "Inversión / crecimiento",
    title: "Inversión / crecimiento",
    examples: "Terreno, networking, negocio, herramientas y capital inmovilizado."
  }
];

function statusClasses(status: Status) {
  if (status === "Sostenible") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "Ajustada") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-800";
}

function NumberField({
  label,
  value,
  onChange,
  helper,
  min = 0
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helper?: string;
  min?: number;
}) {
  const [displayValue, setDisplayValue] = useState(() => formatAmount(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatAmount(value));
    }
  }, [isFocused, value]);

  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#28322f]">{label}</span>
      <input
        className="h-12 rounded-lg border border-[#d9d3c7] bg-white px-4 text-base outline-none transition focus:border-[#2f6f63] focus:ring-4 focus:ring-[#2f6f63]/10"
        inputMode="decimal"
        type="text"
        value={displayValue}
        onBlur={() => {
          setIsFocused(false);
          setDisplayValue(formatAmount(value));
        }}
        onChange={(event) => {
          const nextDisplayValue = event.target.value;
          const nextValue = Math.max(min, parseAmount(nextDisplayValue));
          setDisplayValue(nextDisplayValue);
          onChange(nextValue);
        }}
        onFocus={() => {
          setIsFocused(true);
          setDisplayValue(Number.isFinite(value) ? String(value).replace(".", ",") : "0");
        }}
      />
      {helper ? <span className="text-xs leading-relaxed text-[#6d766f]">{helper}</span> : null}
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  helper
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  helper?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#28322f]">{label}</span>
      <select
        className="h-12 rounded-lg border border-[#d9d3c7] bg-white px-4 text-base outline-none transition focus:border-[#2f6f63] focus:ring-4 focus:ring-[#2f6f63]/10"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {helper ? <span className="text-xs leading-relaxed text-[#6d766f]">{helper}</span> : null}
    </label>
  );
}

function ToggleField({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-[#28322f]">{label}</span>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#d9d3c7] bg-white p-1">
        {[true, false].map((option) => (
          <button
            key={String(option)}
            className={`h-10 rounded-md text-sm font-semibold transition ${
              value === option ? "bg-[#2f6f63] text-white" : "text-[#6d766f] hover:bg-[#f6f2ea]"
            }`}
            onClick={() => onChange(option)}
            type="button"
          >
            {option ? "Sí" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "neutral",
  compact = false
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
  compact?: boolean;
}) {
  const toneClass = {
    neutral: "border-[#d9d3c7] bg-[#fffdf8]",
    success: "border-emerald-200 bg-emerald-50",
    warning: "border-amber-200 bg-amber-50",
    danger: "border-red-200 bg-red-50"
  }[tone];

  return (
    <div className={`rounded-lg border ${compact ? "p-3" : "p-4"} ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6d766f]">{label}</p>
      <p className={`${compact ? "mt-1 text-lg" : "mt-2 text-xl"} break-words font-semibold text-[#28322f]`}>{value}</p>
      {helper ? <p className="mt-2 text-sm leading-relaxed text-[#6d766f]">{helper}</p> : null}
    </div>
  );
}

function CashChart({ rows, currency, compact = false }: { rows: MonthRow[]; currency: Currency; compact?: boolean }) {
  const width = 720;
  const height = compact ? 170 : 240;
  const padding = 30;
  const values = rows.map((row) => row.accumulatedCash);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(rows.length - 1, 1);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });
  const zeroY = height - padding - ((0 - min) / range) * (height - padding * 2);

  return (
    <div className="rounded-lg border border-[#d9d3c7] bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[#28322f]">Caja acumulada mes a mes</h3>
        <span className="text-sm text-[#6d766f]">{currency}</span>
      </div>
      <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolución de caja acumulada">
        <line x1={padding} x2={width - padding} y1={zeroY} y2={zeroY} stroke="#d9d3c7" strokeDasharray="5 5" />
        <polyline fill="none" points={points.join(" ")} stroke="#2f6f63" strokeLinecap="round" strokeLinejoin="round" strokeWidth={compact ? "3" : "4"} />
        {values.map((value, index) => {
          const [x, y] = points[index].split(",").map(Number);
          return <circle key={`${index}-${value}`} cx={x} cy={y} fill="#e7b85d" r={compact ? "3" : "4"} />;
        })}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-[#6d766f]">
        <span>Mes 1</span>
        <span>{money(values.at(-1) ?? 0, currency)}</span>
        <span>Mes {rows.length}</span>
      </div>
    </div>
  );
}

function FinanceSummary({ results, currency }: { results: Calculation; currency: Currency }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard label="Total pagado" value={money(results.totalPaid, currency)} tone={results.totalPaid > 0 ? "warning" : "neutral"} />
      <MetricCard
        label="Diferencia vs financiado"
        value={money(results.financeCost, currency)}
        helper={`${(results.financeCostPct * 100).toFixed(1)}% sobre el monto financiado.`}
      />
      <MetricCard label="Total financiado" value={money(results.totalFinanced, currency)} />
    </div>
  );
}

function recoveryText(results: Calculation) {
  if (results.monthlyFlow <= 0 || results.recoveryMonths === null) {
    return "No recupera";
  }
  if (results.recoveryMonths > results.rows.length) {
    return "No recupera dentro del período";
  }
  return `${results.recoveryMonths} meses`;
}

function recoveryHelper(results: Calculation) {
  if (results.monthlyFlow <= 0 || results.recoveryMonths === null) {
    return "El flujo mensual nuevo no alcanza para recuperar el pago inicial.";
  }
  if (results.recoveryMonths > results.rows.length) {
    return `Recupero estimado: ${results.recoveryMonths} meses. Período analizado: ${results.rows.length} meses.`;
  }
  return `Dentro de los ${results.rows.length} meses analizados.`;
}

function investmentRecoveryText(results: Calculation) {
  if (results.monthlyFlow <= 0 || results.recoveryMonths === null) {
    return "No recupera por flujo";
  }
  return `${results.recoveryMonths} meses`;
}

function investmentRecoveryHelper(results: Calculation) {
  if (results.monthlyFlow <= 0 || results.recoveryMonths === null) {
    return "El flujo neto mensual no alcanza para recuperar el dinero desembolsado al inicio.";
  }
  return "Tiempo estimado para recuperar el dinero efectivamente desembolsado al inicio.";
}

function statusHelper(status: Status) {
  if (status === "Sostenible") return "La inversión parece sostenible para tu situación actual.";
  if (status === "Ajustada") return "La inversión podría dejar tu caja ajustada.";
  return "La inversión genera tensión importante sobre tu caja.";
}

function IntroVisual({ isInvestment }: { isInvestment: boolean }) {
  return (
    <div className="relative min-h-[210px] overflow-hidden rounded-lg border border-[#d9d3c7] bg-[#f8f5ee] p-5">
      <div className="absolute inset-x-5 top-5 flex items-center justify-between">
        <span className="h-2 w-16 rounded-full bg-[#2f6f63]/20" />
        <span className="h-8 w-8 rounded-full border border-[#2f6f63]/20 bg-white" />
      </div>
      <svg className="mt-8 h-36 w-full" viewBox="0 0 280 150" role="img" aria-label={isInvestment ? "Proyección de inversión" : "Análisis de compra"}>
        <rect x="20" y="22" width="240" height="104" rx="16" fill="#fffdf8" stroke="#d9d3c7" />
        <line x1="45" x2="235" y1="101" y2="101" stroke="#d9d3c7" strokeDasharray="4 6" />
        {isInvestment ? (
          <>
            <path d="M48 103 C82 90 94 72 121 76 C151 81 163 49 197 47 C216 46 225 36 236 28" fill="none" stroke="#2f6f63" strokeLinecap="round" strokeWidth="5" />
            <circle cx="121" cy="76" r="6" fill="#e7b85d" />
            <circle cx="197" cy="47" r="6" fill="#e7b85d" />
            <rect x="55" y="111" width="24" height="8" rx="4" fill="#2f6f63" opacity="0.18" />
            <rect x="88" y="107" width="36" height="8" rx="4" fill="#2f6f63" opacity="0.28" />
            <rect x="134" y="94" width="44" height="8" rx="4" fill="#2f6f63" opacity="0.38" />
            <rect x="188" y="76" width="36" height="8" rx="4" fill="#2f6f63" opacity="0.5" />
          </>
        ) : (
          <>
            <rect x="52" y="46" width="46" height="58" rx="10" fill="#2f6f63" opacity="0.16" />
            <rect x="113" y="33" width="54" height="71" rx="10" fill="#e7b85d" opacity="0.5" />
            <rect x="183" y="58" width="44" height="46" rx="10" fill="#2f6f63" opacity="0.22" />
            <path d="M50 118 H229" stroke="#2f6f63" strokeLinecap="round" strokeWidth="5" />
            <path d="M58 78 H91 M121 61 H159 M191 82 H219" stroke="#fffdf8" strokeLinecap="round" strokeWidth="5" />
          </>
        )}
      </svg>
      <div className="grid grid-cols-3 gap-2">
        <span className="h-2 rounded-full bg-[#2f6f63]/15" />
        <span className="h-2 rounded-full bg-[#e7b85d]/60" />
        <span className="h-2 rounded-full bg-[#2f6f63]/25" />
      </div>
    </div>
  );
}

export function Simulator({ mode = "purchase" }: { mode?: SimulatorMode }) {
  const [step, setStep] = useState(0);
  const initialDecisionType: DecisionType = mode === "investment" ? "Inversión / crecimiento" : "Compra o gasto importante";
  const [decisionType, setDecisionType] = useState<DecisionType | null>(initialDecisionType);
  const [inputs, setInputs] = useState<Inputs>(initialInputs);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [hasAssociatedCosts, setHasAssociatedCosts] = useState(false);
  const [associatedCosts, setAssociatedCosts] = useState({
    transfer: 0,
    delivery: 0,
    taxes: 0,
    other: 0
  });
  const [expenseDirection, setExpenseDirection] = useState<ExpenseDirection>("Aumentan");
  const [customExitValuePct, setCustomExitValuePct] = useState(0);
  const [customExitMonthDelta, setCustomExitMonthDelta] = useState(0);
  const [customIncome, setCustomIncome] = useState(0);
  const [customExpense, setCustomExpense] = useState(0);
  const isInvestment = mode === "investment";
  const isPurchase = mode === "purchase";
  const visibleDecisionCards = decisionCards.filter((card) =>
    mode === "investment"
      ? card.type === "Inversión / crecimiento"
      : card.type === "Compra o gasto importante"
  );
  const hasFinancing = inputs.paymentType !== "100% contado";
  const scenarioBaseIncome = isInvestment || inputs.hasNewIncome ? inputs.newIncome : 0;
  const scenarioBaseExpense = isInvestment || inputs.hasNewExpense ? inputs.newExpense : 0;
  const difficultIncomeChange = scenarioBaseIncome * -0.2;
  const difficultExpenseChange = isInvestment ? scenarioBaseExpense * 0.1 : Math.abs(scenarioBaseExpense) * 0.1;
  const favorableIncomeChange = scenarioBaseIncome * 0.2;
  const favorableExpenseChange = isInvestment ? scenarioBaseExpense * -0.1 : Math.abs(scenarioBaseExpense) * -0.1;
  const associatedCostsTotal = hasAssociatedCosts
    ? associatedCosts.transfer + associatedCosts.delivery + associatedCosts.taxes + associatedCosts.other
    : 0;
  const purchaseTotal = purchasePrice + associatedCostsTotal;
  const currentSurplus = inputs.income - inputs.expenses;
  const monthlyExpenseChangeAmount = inputs.hasNewExpense ? Math.abs(inputs.newExpense) : 0;
  const surplusAfterMonthlyChange = inputs.hasNewExpense
    ? expenseDirection === "Aumentan"
      ? currentSurplus - monthlyExpenseChangeAmount
      : currentSurplus + monthlyExpenseChangeAmount
    : currentSurplus;
  const savingsRatio = inputs.cash > 0 ? purchaseTotal / inputs.cash : null;
  const surplusMonths = surplusAfterMonthlyChange > 0 ? purchaseTotal / surplusAfterMonthlyChange : null;
  const savingsTone = savingsRatio === null || savingsRatio > 1 ? "danger" : savingsRatio > 0.7 ? "warning" : "success";
  const lacksInitialCashForDownPayment =
    isPurchase &&
    inputs.paymentType === "Parte contado + parte financiado" &&
    inputs.cash < inputs.downPayment;
  const selectedAnalysisMonths = Math.min(24, Math.max(2, Math.round(inputs.analysisMonths || 12)));

  const results = useMemo(() => calculate(inputs, {}, isInvestment), [inputs, isInvestment]);
  const difficult = useMemo(
    () => calculate(
      inputs,
      isInvestment
        ? { incomeChange: difficultIncomeChange, expenseChange: difficultExpenseChange, exitValuePct: -0.2, exitMonthDelta: 2 }
        : { incomeChange: difficultIncomeChange, expenseChange: difficultExpenseChange },
      isInvestment
    ),
    [inputs, isInvestment, difficultIncomeChange, difficultExpenseChange]
  );
  const favorable = useMemo(
    () => calculate(
      inputs,
      isInvestment
        ? { incomeChange: favorableIncomeChange, expenseChange: favorableExpenseChange, exitValuePct: 0.2, exitMonthDelta: inputs.exitMonth > 1 ? -1 : 0 }
        : { incomeChange: favorableIncomeChange, expenseChange: favorableExpenseChange },
      isInvestment
    ),
    [inputs, isInvestment, favorableIncomeChange, favorableExpenseChange]
  );
  const custom = useMemo(
    () => calculate(
      inputs,
      isInvestment
        ? {
            incomeChange: customIncome,
            expenseChange: customExpense,
            exitValuePct: customExitValuePct / 100,
            exitMonthDelta: customExitMonthDelta
          }
        : {
            incomeChange: customIncome,
            expenseChange: customExpense
          },
      isInvestment
    ),
    [inputs, isInvestment, customExitValuePct, customExitMonthDelta, customIncome, customExpense]
  );

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  function updatePurchaseTotal(nextPrice = purchasePrice, nextCosts = associatedCosts, nextHasCosts = hasAssociatedCosts) {
    const nextAssociatedTotal = nextHasCosts
      ? nextCosts.transfer + nextCosts.delivery + nextCosts.taxes + nextCosts.other
      : 0;
    const nextTotal = nextPrice + nextAssociatedTotal;
    setInputs((current) => ({
      ...current,
      investment: nextTotal,
      financedAmount:
        current.paymentType === "100% financiado"
          ? nextTotal
          : current.paymentType === "Parte contado + parte financiado"
            ? Math.max(0, nextTotal - current.downPayment)
            : current.financedAmount
    }));
  }

  function updatePurchasePrice(value: number) {
    setPurchasePrice(value);
    updatePurchaseTotal(value);
  }

  function updateAssociatedCost(key: keyof typeof associatedCosts, value: number) {
    setAssociatedCosts((current) => {
      const next = { ...current, [key]: value };
      updatePurchaseTotal(purchasePrice, next);
      return next;
    });
  }

  function updateHasAssociatedCosts(value: boolean) {
    setHasAssociatedCosts(value);
    updatePurchaseTotal(purchasePrice, associatedCosts, value);
  }

  function updateHasMonthlyExpenseChange(value: boolean) {
    update("hasNewExpense", value);
    if (!value) {
      update("newExpense", 0);
    }
  }

  function updateExpenseDirection(value: ExpenseDirection) {
    setExpenseDirection(value);
    const amount = Math.abs(inputs.newExpense);
    update("newExpense", value === "Aumentan" ? amount : -amount);
  }

  function updateMonthlyExpenseChange(value: number) {
    const amount = Math.abs(value);
    update("newExpense", expenseDirection === "Aumentan" ? amount : -amount);
  }

  function updatePurchasePaymentType(value: PaymentType) {
    setInputs((current) => {
      const safeTotal = Math.max(0, current.investment);
      if (value === "100% contado") {
        return {
          ...current,
          paymentType: value,
          analysisMonths: 12,
          downPayment: 0,
          financedAmount: 0
        };
      }
      if (value === "100% financiado") {
        return {
          ...current,
          paymentType: value,
          analysisMonths: clampMonth(current.installments),
          downPayment: 0,
          financedAmount: safeTotal
        };
      }
      const suggestedDownPayment = current.downPayment > 0
        ? Math.min(current.downPayment, safeTotal)
        : Math.min(current.cash, safeTotal);
      return {
        ...current,
        paymentType: value,
        analysisMonths: clampMonth(current.installments),
        downPayment: suggestedDownPayment,
        financedAmount: Math.max(0, safeTotal - suggestedDownPayment)
      };
    });
  }

  function updatePurchaseInstallments(value: number) {
    const installments = clampMonth(value);
    setInputs((current) => ({
      ...current,
      installments,
      analysisMonths: installments
    }));
  }

  function purchaseReading() {
    if (inputs.cash > purchaseTotal && savingsRatio !== null && savingsRatio <= 0.7) {
      return "Podrías pagarlo de contado sin usar todos tus ahorros.";
    }
    if (inputs.cash < purchaseTotal) {
      return "La decisión supera tus ahorros disponibles. Probablemente necesitarías financiar una parte.";
    }
    return "La decisión consume una parte importante de tus ahorros y puede dejarte ajustado.";
  }

  function chooseDecision(type: DecisionType) {
    setDecisionType(type);
    if (type === "Compra o gasto importante") {
      setInputs((current) => ({ ...current, hasNewIncome: false, newIncome: 0 }));
    } else {
      setInputs((current) => ({ ...current, hasNewIncome: true, hasNewExpense: true }));
    }
    setStep(1);
  }

  function next() {
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previous() {
    setStep((current) => Math.max(current - 1, 0));
  }

  return (
    <main className="min-h-screen bg-[#f6f2ea]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d9d3c7] pb-4">
          <div>
            <div className="h-[14px]" aria-label="COCOO"><img src="/cocoo-wordmark.svg" alt="COCOO" className="block h-full w-auto" /></div>
            <h1 className="text-2xl font-semibold text-[#28322f] sm:text-3xl">
              {isInvestment ? "Simulador de impacto de una inversión" : "Simulador de compra o gasto importante"}
            </h1>
          </div>
          <div className="rounded-full border border-[#d9d3c7] bg-[#fffdf8] px-4 py-2 text-sm text-[#6d766f]">
            Paso {step + 1} de {steps.length}
          </div>
        </header>

        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {steps.map((item, index) => (
            <button
              key={item}
              className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                index === step
                  ? "border-[#2f6f63] bg-[#2f6f63] text-white"
                  : "border-[#d9d3c7] bg-[#fffdf8] text-[#6d766f]"
              }`}
              onClick={() => setStep(index)}
              type="button"
            >
              {index === 2 && isInvestment ? "Inversión" : index === 3 && isInvestment ? "Financiamiento" : item}
            </button>
          ))}
        </nav>

        <section className="rounded-xl border border-[#d9d3c7] bg-[#fffdf8] p-5 shadow-sm sm:p-6">
          {step === 0 ? (
            <div className="mx-auto grid min-h-[560px] w-full max-w-4xl content-center gap-8 py-8 sm:py-12">
              <div className="mx-auto max-w-3xl text-center">
                <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#2f6f63]">
                  Análisis guiado
                </p>
                <h2 className="text-4xl font-semibold leading-tight text-[#28322f] sm:text-5xl">
                  {isInvestment ? "Simulador de impacto de una inversión" : "Simulador de compra o gasto importante"}
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#6d766f] sm:text-lg">
                  {isInvestment
                    ? "Proyectá escenarios y evaluá el impacto real de una inversión."
                    : "Analizá si esta compra es sostenible para tu caja y tus ahorros."}
                </p>
              </div>
              <div className="grid gap-4">
                {visibleDecisionCards.map((card) => {
                  const selected = decisionType === card.type;
                  return (
                    <button
                      key={card.type}
                      className={`grid gap-8 rounded-xl border p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#2f6f63] hover:shadow-md sm:grid-cols-[1fr_280px] sm:p-8 md:p-10 ${
                        selected ? "border-[#2f6f63] bg-[#fffdf8]" : "border-[#d9d3c7] bg-white"
                      }`}
                      onClick={() => chooseDecision(card.type)}
                      type="button"
                    >
                      <span className="grid content-between gap-8">
                        <span>
                          <span className="block text-2xl font-semibold text-[#28322f] sm:text-3xl">{card.title}</span>
                          <span className="mt-4 block max-w-xl text-base leading-relaxed text-[#6d766f]">{card.examples}</span>
                        </span>
                        <span className="inline-flex min-h-12 w-fit items-center rounded-lg bg-[#2f6f63] px-7 text-base font-semibold text-white transition hover:bg-[#285f55]">
                          Analizar
                        </span>
                      </span>
                      <IntroVisual isInvestment={isInvestment} />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#28322f]">Situación actual</h2>
                <p className="mt-2 text-sm text-[#6d766f]">
                  {isInvestment
                    ? "Esto nos permite ver si la inversión es sostenible para tu situación actual."
                    : "Cargá una foto simple de tu punto de partida."}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField label="Ingresos mensuales actuales" value={inputs.income} onChange={(value) => update("income", value)} />
                <NumberField label="Gastos mensuales actuales, incluyendo cuotas y deudas" value={inputs.expenses} onChange={(value) => update("expenses", value)} />
                <NumberField
                  label="Caja o ahorros disponibles hoy"
                  value={inputs.cash}
                  onChange={(value) => update("cash", value)}
                  helper="Dinero disponible antes de tomar esta decisión."
                />
                <SelectField<Currency> label="Moneda de análisis" value={inputs.currency} options={["ARS", "USD"]} onChange={(value) => update("currency", value)} />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#28322f]">
                  {isInvestment ? "Inversión / crecimiento" : "La decisión"}
                </h2>
                <p className="mt-2 text-sm text-[#6d766f]">
                  {isInvestment
                    ? "Cargá los flujos esperados de la oportunidad para ver su impacto en tu caja."
                    : "Veamos un poco más esta decisión."}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {isInvestment ? (
                  <>
                    <NumberField label="Capital inicial a invertir" value={inputs.investment} onChange={(value) => update("investment", value)} helper="Monto que necesitás poner al comienzo." />
                    <NumberField label="Costos mensuales de sostener la inversión" value={inputs.newExpense} onChange={(value) => update("newExpense", value)} helper="Expensas, mantenimiento, seguros, gastos administrativos u otros costos." />
                    <NumberField label="Ingreso mensual esperado" value={inputs.newIncome} onChange={(value) => update("newIncome", value)} helper="Completá solo si la inversión genera ingresos durante el período." />
                    <NumberField label="Valor estimado de venta o salida" value={inputs.exitValue} onChange={(value) => update("exitValue", value)} helper="Monto que estimás recibir si vendés o cerrás la inversión." />
                    <NumberField label="Mes estimado de venta o salida" value={inputs.exitMonth} min={1} onChange={(value) => update("exitMonth", clampMonth(value))} helper="Mes en el que esperás recuperar el capital o vender el activo." />
                  </>
                ) : (
                  <>
                    <NumberField label="Precio" value={purchasePrice} onChange={updatePurchasePrice} helper="Valor principal de esta decisión." />
                    <ToggleField label="¿Tiene gastos además del precio?" value={hasAssociatedCosts} onChange={updateHasAssociatedCosts} />
                    {hasAssociatedCosts ? (
                      <>
                        <NumberField label="Transferencia / trámites" value={associatedCosts.transfer} onChange={(value) => updateAssociatedCost("transfer", value)} />
                        <NumberField label="Entrega / traslado" value={associatedCosts.delivery} onChange={(value) => updateAssociatedCost("delivery", value)} />
                        <NumberField label="Impuestos / escribanía" value={associatedCosts.taxes} onChange={(value) => updateAssociatedCost("taxes", value)} />
                        <NumberField label="Otros gastos" value={associatedCosts.other} onChange={(value) => updateAssociatedCost("other", value)} />
                      </>
                    ) : null}
                    <div className="md:col-span-2">
                      <MetricCard label="Total estimado" value={money(purchaseTotal, inputs.currency)} helper="Precio más gastos asociados." />
                    </div>
                    <ToggleField label="¿Esta decisión cambia tus gastos mensuales?" value={inputs.hasNewExpense} onChange={updateHasMonthlyExpenseChange} />
                    {inputs.hasNewExpense ? (
                      <>
                        <SelectField<ExpenseDirection>
                          label="¿Qué pasa con tus gastos?"
                          value={expenseDirection}
                          options={["Aumentan", "Disminuyen"]}
                          onChange={updateExpenseDirection}
                        />
                        <div className="grid gap-2 md:col-span-2">
                          <NumberField
                            label="Monto mensual del cambio"
                            value={Math.abs(inputs.newExpense)}
                            onChange={updateMonthlyExpenseChange}
                          />
                          <p className="text-sm font-medium leading-relaxed text-[#6d766f]">
                            Cargá el monto mensual estimado. El sistema lo suma o lo resta automáticamente según lo que elijas arriba.
                          </p>
                        </div>
                      </>
                    ) : null}
                    <div className="grid gap-4 md:col-span-2 lg:grid-cols-3">
                      <MetricCard
                        label="Relación con tus ahorros"
                        value={savingsRatio === null ? "Sin ahorros cargados" : `${(savingsRatio * 100).toFixed(0)}%`}
                        helper={savingsRatio === null ? "Cargá tus ahorros para ver esta relación." : `Esta decisión representa el ${(savingsRatio * 100).toFixed(0)}% de tus ahorros.`}
                        tone={savingsTone}
                        compact
                      />
                      <MetricCard
                        label="Relación con tu excedente mensual"
                        value={surplusMonths === null ? "Sin excedente mensual" : `${Math.ceil(surplusMonths)} meses`}
                        helper={surplusMonths === null ? "Tus gastos igualan o superan tus ingresos después del cambio mensual." : `Equivale a aprox. ${Math.ceil(surplusMonths)} meses de excedente mensual.`}
                        tone={surplusMonths === null || surplusMonths > 24 ? "warning" : "neutral"}
                        compact
                      />
                      <MetricCard label="Lectura general" value={purchaseReading()} compact />
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#28322f]">{isInvestment ? "Financiamiento" : "Financiación"}</h2>
                <p className="mt-2 text-sm text-[#6d766f]">
                  {isInvestment
                    ? "No calculamos una tasa bancaria exacta. Estimamos el costo financiero aproximado para ayudarte a decidir."
                    : "Elegí cómo pagarías esta decisión para estimar su impacto real en tu caja."}
                </p>
              </div>
              {isPurchase ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField<PaymentType>
                      label="Forma de pago"
                      value={inputs.paymentType}
                      options={["100% contado", "Parte contado + parte financiado", "100% financiado"]}
                      onChange={updatePurchasePaymentType}
                      helper="Elegí la opción más parecida a cómo lo pagarías."
                    />
                    <MetricCard
                      label="Total estimado de la decisión"
                      value={money(inputs.investment, inputs.currency)}
                      helper="Precio más gastos asociados cargados en el paso anterior."
                    />
                  </div>
                  {inputs.paymentType === "100% contado" ? (
                    <MetricCard
                      label="Pago inicial estimado"
                      value={money(results.upfrontPaid, inputs.currency)}
                      helper="Se toma el total estimado como pago al inicio."
                    />
                  ) : null}
                  {inputs.paymentType === "Parte contado + parte financiado" ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <NumberField
                          label="Pago inicial"
                          value={inputs.downPayment}
                          onChange={(value) => {
                            update("downPayment", value);
                            update("financedAmount", Math.max(0, inputs.investment - value));
                          }}
                          helper="Parte que pagarías al comienzo."
                        />
                        <NumberField
                          label="Monto financiado"
                          value={inputs.financedAmount}
                          onChange={(value) => update("financedAmount", value)}
                          helper="Parte que pagarías en cuotas."
                        />
                        <NumberField label="Cantidad de cuotas" value={inputs.installments} min={1} onChange={updatePurchaseInstallments} />
                        <NumberField label="Cuota mensual ofrecida" value={inputs.offeredInstallment} onChange={(value) => update("offeredInstallment", value)} />
                      </div>
                      {lacksInitialCashForDownPayment ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                          No tenés caja disponible suficiente para cubrir el pago inicial.
                        </div>
                      ) : null}
                      <FinanceSummary results={results} currency={inputs.currency} />
                    </>
                  ) : null}
                  {inputs.paymentType === "100% financiado" ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        <NumberField label="Monto financiado" value={inputs.financedAmount} onChange={(value) => update("financedAmount", value)} helper="Por defecto se completa con el total estimado." />
                        <NumberField label="Cantidad de cuotas" value={inputs.installments} min={1} onChange={updatePurchaseInstallments} />
                        <NumberField label="Cuota mensual ofrecida" value={inputs.offeredInstallment} onChange={(value) => update("offeredInstallment", value)} />
                      </div>
                      <FinanceSummary results={results} currency={inputs.currency} />
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <NumberField
                      label="Tiempo para analizar esta decisión"
                      value={inputs.analysisMonths}
                      min={2}
                      onChange={(value) => update("analysisMonths", Math.min(24, Math.max(2, Math.round(value || 12))))}
                      helper="Elegí durante cuántos meses querés ver el efecto de esta decisión."
                    />
                    <SelectField<PaymentType>
                      label="¿Cómo pagarías esta decisión?"
                      value={inputs.paymentType}
                      options={["100% contado", "Parte contado + parte financiado", "100% financiado"]}
                      onChange={(value) => update("paymentType", value)}
                    />
                    {inputs.paymentType === "Parte contado + parte financiado" ? (
                      <NumberField label="Pago inicial" value={inputs.downPayment} onChange={(value) => update("downPayment", value)} />
                    ) : null}
                    {hasFinancing ? (
                      <>
                        <NumberField label="Monto financiado" value={inputs.financedAmount} onChange={(value) => update("financedAmount", value)} />
                        <NumberField label="Cantidad de cuotas" value={inputs.installments} min={1} onChange={(value) => update("installments", clampMonth(value))} />
                        <NumberField label="Cuota mensual ofrecida" value={inputs.offeredInstallment} onChange={(value) => update("offeredInstallment", value)} />
                      </>
                    ) : null}
                  </div>
                  {hasFinancing ? (
                    <FinanceSummary results={results} currency={inputs.currency} />
                  ) : (
                    <MetricCard label="Pago contado" value={money(results.upfrontPaid, inputs.currency)} helper="No hay cuotas ni costo financiero estimado." />
                  )}
                </>
              )}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-[#28322f]">Resultados</h2>
                <p className="mt-2 text-sm text-[#6d766f]">
                  {isInvestment
                    ? "Esta simulación no recomienda inversiones. Solo muestra el impacto estimado en tu caja según los datos cargados."
                    : "Mirá cómo esta decisión impactaría tu caja y tu capacidad de sostenerla."}
                </p>
              </div>

              {isPurchase ? (
                <>
                  <section className="grid gap-4">
                    <h3 className="text-xl font-semibold text-[#28322f]">Impacto sobre tu situación actual</h3>
                    <div className="grid gap-4 lg:grid-cols-4">
                      <MetricCard label="Estado" value={results.status} tone={results.status === "Sostenible" ? "success" : results.status === "Ajustada" ? "warning" : "danger"} helper="Situación actual + decisión simulada." />
                      <MetricCard
                        label="Caja estimada al final del período analizado"
                        value={money(results.finalCash, inputs.currency)}
                        helper="Dinero estimado al finalizar la simulación."
                      />
                      <MetricCard
                        label="Caja mínima"
                        value={money(results.minCash, inputs.currency)}
                        helper="Nivel más bajo de dinero disponible durante la simulación."
                      />
                      <MetricCard
                        label="Mes más exigente"
                        value={`Mes ${results.mostDemandingMonth}`}
                        helper="Mes en el que tu caja llega a su punto más bajo."
                      />
                    </div>
                  </section>

                  <section className="grid gap-4">
                    <h3 className="text-xl font-semibold text-[#28322f]">Resultado de la decisión</h3>
                    {lacksInitialCashForDownPayment ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                        No tenés caja disponible suficiente para cubrir el pago inicial.
                      </div>
                    ) : null}
                    <div className="grid gap-4 lg:grid-cols-4">
                      <MetricCard label="Pago inicial / monto inicial" value={money(results.upfrontPaid, inputs.currency)} compact />
                      <MetricCard
                        label="Flujo mensual total"
                        value={money(results.cashFlow, inputs.currency)}
                        helper={`Excedente actual más cambios mensuales${hasFinancing ? " y cuota mensual" : ""}.`}
                        tone={results.cashFlow >= 0 ? "success" : "danger"}
                        compact
                      />
                      <MetricCard
                        label="Resultado incremental del período"
                        value={money(results.incrementalResult, inputs.currency)}
                        helper={`${results.rows.length} meses analizados menos el pago inicial.`}
                        tone={results.incrementalResult >= 0 ? "success" : "danger"}
                        compact
                      />
                      <MetricCard
                        label="Recupero estimado"
                        value={recoveryText(results)}
                        helper={recoveryHelper(results)}
                        tone={results.recoveryMonths && results.recoveryMonths <= results.rows.length ? "success" : "warning"}
                        compact
                      />
                    </div>
                  </section>
                </>
              ) : (
                <>
                  <section className="grid gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[#28322f]">Lectura rápida</h3>
                      <p className="mt-1 text-sm text-[#6d766f]">
                        Primero mirá si tu caja resiste la inversión. Después evaluá recupero y resultado.
                      </p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-4">
                      <MetricCard label="Caja final" value={money(results.finalCash, inputs.currency)} helper="Dinero estimado al finalizar la simulación." />
                      <MetricCard
                        label="Nivel mínimo de caja"
                        value={money(results.minCash, inputs.currency)}
                        helper={`Nivel más bajo de dinero disponible durante la simulación. Mes más exigente: ${results.mostDemandingMonth}.`}
                        tone={results.minCash < 0 ? "danger" : results.minCash < inputs.cash * 0.25 ? "warning" : "neutral"}
                      />
                      <MetricCard
                        label="Recupero del desembolso inicial"
                        value={investmentRecoveryText(results)}
                        helper={investmentRecoveryHelper(results)}
                        tone={results.recoveryMonths ? "success" : "warning"}
                      />
                      <MetricCard label="Resultado inversión" value={money(results.investmentResult, inputs.currency)} helper="Ingresos, salida, costos, pago inicial y cuotas del período." tone={results.investmentResult >= 0 ? "success" : "danger"} />
                    </div>
                  </section>

                  <section className="grid gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[#28322f]">Período analizado</h3>
                      <p className="mt-1 text-sm text-[#6d766f]">
                        Período analizado efectivo: {results.rows.length} meses.
                        {results.rows.length > selectedAnalysisMonths ? " El análisis se extendió automáticamente para incluir cuotas o salida estimada." : ""}
                      </p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <MetricCard label="Estado" value={results.status} tone={results.status === "Sostenible" ? "success" : results.status === "Ajustada" ? "warning" : "danger"} helper={statusHelper(results.status)} />
                      <MetricCard label="Flujo mensual de la inversión" value={money(inputs.newIncome - inputs.newExpense, inputs.currency)} helper="Ingreso mensual esperado menos costos mensuales de sostener la inversión, antes de cuotas." tone={inputs.newIncome - inputs.newExpense >= 0 ? "success" : "danger"} />
                      <MetricCard label="Flujo mensual con financiamiento" value={money(results.monthlyFlow, inputs.currency)} helper="Flujo de la inversión después de costos y cuota mensual." tone={results.monthlyFlow >= 0 ? "success" : "danger"} />
                    </div>
                  </section>

                  <section className="grid gap-4">
                    <h3 className="text-xl font-semibold text-[#28322f]">Detalle de la inversión</h3>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <MetricCard label="Capital invertido" value={money(inputs.investment, inputs.currency)} />
                      <MetricCard label="Valor estimado de salida" value={money(results.exitValue, inputs.currency)} />
                      <MetricCard label="Salida estimada" value={`Mes ${results.exitMonth}`} helper="Mes en el que estimás vender o cerrar la inversión." />
                    </div>
                  </section>
                </>
              )}

              <CashChart rows={results.rows} currency={inputs.currency} compact={isPurchase} />

              <section className="grid gap-3">
                <h3 className="text-xl font-semibold text-[#28322f]">¿Qué pasa si las cosas cambian?</h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  {[
                    {
                      name: "Difícil",
                      detail: isInvestment
                        ? `Menores ingresos, mayores costos y salida peor: ingresos ${money(difficultIncomeChange, inputs.currency)} por mes, costos ${money(difficultExpenseChange, inputs.currency)} por mes, salida menor y 2 meses más tarde.`
                        : `Si ganás menos o gastás más: ingresos ${money(difficultIncomeChange, inputs.currency)} por mes, gastos ${money(difficultExpenseChange, inputs.currency)} por mes.`,
                      result: difficult
                    },
                    {
                      name: "Favorable",
                      detail: isInvestment
                        ? `Mejores ingresos, menores costos y salida mejor: ingresos ${money(favorableIncomeChange, inputs.currency)} por mes, costos ${money(favorableExpenseChange, inputs.currency)} por mes, salida mayor y hasta 1 mes antes.`
                        : `Si te va mejor de lo esperado: ingresos ${money(favorableIncomeChange, inputs.currency)} por mes, gastos ${money(favorableExpenseChange, inputs.currency)} por mes.`,
                      result: favorable
                    }
                  ].map((scenario) => (
                    <div key={scenario.name} className="rounded-lg border border-[#d9d3c7] bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-[#28322f]">{scenario.name}</h4>
                          <p className="mt-1 text-xs leading-relaxed text-[#6d766f]">{scenario.detail}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${statusClasses(scenario.result.status)}`}>
                          {scenario.result.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <span>Flujo mensual</span><strong>{money(scenario.result.cashFlow, inputs.currency)}</strong>
                        <span>Caja final</span><strong>{money(scenario.result.finalCash, inputs.currency)}</strong>
                        <span>{isInvestment ? "Resultado estimado" : "Impacto estimado"}</span><strong>{money(isInvestment ? scenario.result.investmentResult : scenario.result.incrementalResult, inputs.currency)}</strong>
                        <span>{isInvestment ? "Nivel mínimo de caja" : "Caja mínima"}</span><strong>{money(scenario.result.minCash, inputs.currency)}</strong>
                        <span>Estado</span><strong>{scenario.result.status}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 rounded-lg border border-[#d9d3c7] bg-white p-4">
                <h3 className="text-xl font-semibold text-[#28322f]">Probá tu propio escenario</h3>
                {isInvestment ? (
                  <div className="grid gap-4 md:grid-cols-4">
                    <NumberField label="Cambio ingresos mensual" value={customIncome} min={-999999999} onChange={setCustomIncome} />
                    <NumberField label="Cambio gastos mensual" value={customExpense} min={-999999999} onChange={setCustomExpense} />
                    <NumberField label="Cambio valor de salida (%)" value={customExitValuePct} min={-100} onChange={setCustomExitValuePct} />
                    <NumberField label="Cambio mes de salida" value={customExitMonthDelta} min={-24} onChange={(value) => setCustomExitMonthDelta(Math.round(value || 0))} />
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <NumberField label="Cambio ingresos mensual" value={customIncome} min={-999999999} onChange={setCustomIncome} />
                    <NumberField label="Cambio gastos mensual" value={customExpense} min={-999999999} onChange={setCustomExpense} />
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-5">
                  <MetricCard label="Flujo mensual" value={money(custom.cashFlow, inputs.currency)} compact />
                  <MetricCard label="Caja final" value={money(custom.finalCash, inputs.currency)} compact />
                  <MetricCard label={isInvestment ? "Resultado estimado" : "Impacto estimado"} value={money(isInvestment ? custom.investmentResult : custom.incrementalResult, inputs.currency)} compact />
                  <MetricCard label={isInvestment ? "Nivel mínimo de caja" : "Caja mínima"} value={money(custom.minCash, inputs.currency)} helper={isInvestment ? `Mes más exigente: ${custom.mostDemandingMonth}.` : undefined} compact />
                  <MetricCard label="Estado" value={custom.status} tone={custom.status === "Sostenible" ? "success" : custom.status === "Ajustada" ? "warning" : "danger"} compact />
                </div>
              </section>

            </div>
          ) : null}
        </section>

        {step > 0 ? (
          <footer className="flex justify-between gap-3">
            <button className="h-11 rounded-lg border border-[#d9d3c7] bg-[#fffdf8] px-5 font-semibold text-[#28322f]" onClick={previous} type="button">
              Atrás
            </button>
            {step < steps.length - 1 ? (
              <button className="h-11 rounded-lg bg-[#2f6f63] px-5 font-semibold text-white" onClick={next} type="button">
                Continuar
              </button>
            ) : null}
          </footer>
        ) : null}
      </div>
    </main>
  );
}
