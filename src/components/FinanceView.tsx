import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Edit2,
  Plus,
  ScanLine,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import {
  CURRENCY_META,
  FINANCE_CATEGORY_LABELS,
  formatCurrency,
  formatDateReadable,
  formatMonthYear,
  getTodayISO,
  PAYMENT_METHOD_LABELS,
  t,
} from '../i18n/translations';
import {
  FinanceCategory,
  FinanceRecord,
  FinanceType,
  PaymentMethod,
} from '../types';
import { ScanReceiptModal } from './ScanReceiptModal';

const ALL_CATEGORIES = Object.keys(FINANCE_CATEGORY_LABELS) as FinanceCategory[];
const EXPENSE_CATEGORIES: FinanceCategory[] = [
  'Food',
  'Rent',
  'Education',
  'Health',
  'Transport',
  'Shopping',
  'Electricity',
  'Water',
  'Internet',
  'Other',
];
const ALL_PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export const FinanceView: React.FC = () => {
  const {
    data,
    setActiveSection,
    addFinance,
    updateFinance,
    deleteFinance,
    updateCategoryBudgets,
    requestConfirm,
  } = useHome();

  const lang = data.settings.language;
  const currency = data.settings.currency;
  const currencySymbol = CURRENCY_META[currency].symbol;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | FinanceType>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | FinanceCategory>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  // Add/Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<FinanceType>('expense');
  const [category, setCategory] = useState<FinanceCategory>('Food');
  const [date, setDate] = useState(getTodayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [note, setNote] = useState('');
  const [formErr, setFormErr] = useState('');
  const [dismissedWarningKey, setDismissedWarningKey] = useState<string | null>(null);
  const [dismissedCatWarningKey, setDismissedCatWarningKey] = useState<string | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);

  // Category Budget Limits Modal State
  const [catLimitsModalOpen, setCatLimitsModalOpen] = useState(false);
  const [draftCatBudgets, setDraftCatBudgets] = useState<Record<string, string>>({});
  const [catLimitsErr, setCatLimitsErr] = useState('');

  // Available months from records + current month
  const availableMonths = useMemo(() => {
    const set = new Set<string>([getTodayISO().slice(0, 7)]);
    data.finances.forEach((f) => {
      if (f.date && f.date.length >= 7) set.add(f.date.slice(0, 7));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [data.finances]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return data.finances
      .filter((rec) => {
        if (typeFilter !== 'all' && rec.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && rec.category !== categoryFilter) return false;
        if (monthFilter !== 'all' && !rec.date.startsWith(monthFilter)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const catNe = FINANCE_CATEGORY_LABELS[rec.category].ne.toLowerCase();
          const catEn = FINANCE_CATEGORY_LABELS[rec.category].en.toLowerCase();
          return (
            rec.title.toLowerCase().includes(q) ||
            rec.note.toLowerCase().includes(q) ||
            catNe.includes(q) ||
            catEn.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.finances, typeFilter, categoryFilter, monthFilter, searchQuery]);

  // Totals based on filtered view
  const totalIncome = useMemo(
    () =>
      filteredRecords
        .filter((r) => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0),
    [filteredRecords]
  );

  const totalExpense = useMemo(
    () =>
      filteredRecords
        .filter((r) => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0),
    [filteredRecords]
  );

  const netBalance = totalIncome - totalExpense;

  // Monthly Household Budget Monitoring (>80% Warning System)
  const monitoredMonth = monthFilter !== 'all' ? monthFilter : getTodayISO().slice(0, 7);
  const monthlyBudget = data.settings.monthlyBudget;

  const monitoredMonthExpense = useMemo(
    () =>
      data.finances
        .filter((r) => r.type === 'expense' && r.date.startsWith(monitoredMonth))
        .reduce((sum, r) => sum + r.amount, 0),
    [data.finances, monitoredMonth]
  );

  const budgetPctRaw =
    monthlyBudget > 0 ? (monitoredMonthExpense / monthlyBudget) * 100 : 0;
  const isOver80Pct = monthlyBudget > 0 && monitoredMonthExpense > monthlyBudget * 0.8;
  const isOver100Pct = monthlyBudget > 0 && monitoredMonthExpense > monthlyBudget;
  const budgetPctDisplay =
    isOver80Pct && Math.round(budgetPctRaw) <= 80
      ? budgetPctRaw.toFixed(1)
      : String(Math.round(budgetPctRaw));
  const currentWarningKey = `${monitoredMonth}-${monitoredMonthExpense}-${monthlyBudget}`;
  const showBudgetWarningBanner =
    isOver80Pct && dismissedWarningKey !== currentWarningKey;

  // Real-Time Per-Category Monthly Spending & Near-Limit Alerts (>= 80% of category limit)
  const categoryBudgets = useMemo(
    () => data.settings.categoryBudgets || {},
    [data.settings.categoryBudgets]
  );

  const monitoredMonthByCategory = useMemo(() => {
    const map = new Map<FinanceCategory, number>();
    data.finances
      .filter((r) => r.type === 'expense' && r.date.startsWith(monitoredMonth))
      .forEach((r) => {
        map.set(r.category, (map.get(r.category) || 0) + r.amount);
      });
    return map;
  }, [data.finances, monitoredMonth]);

  const categoryBudgetAlerts = useMemo(() => {
    return ALL_CATEGORIES.flatMap((cat) => {
      const limit = categoryBudgets[cat];
      if (!limit || limit <= 0) return [];
      const spent = monitoredMonthByCategory.get(cat) || 0;
      if (spent < limit * 0.8) return [];
      const pctRaw = (spent / limit) * 100;
      const pctDisplay =
        pctRaw < 100 && Math.round(pctRaw) === 100
          ? pctRaw.toFixed(1)
          : pctRaw > 80 && Math.round(pctRaw) <= 80
            ? pctRaw.toFixed(1)
            : String(Math.round(pctRaw));
      return [
        {
          category: cat,
          spent,
          limit,
          pctRaw,
          pctDisplay,
          isExceeded: spent > limit,
          diff: Math.abs(limit - spent),
        },
      ];
    }).sort((a, b) => b.pctRaw - a.pctRaw);
  }, [categoryBudgets, monitoredMonthByCategory]);

  const hasExceededCategoryAlert = categoryBudgetAlerts.some((a) => a.isExceeded);
  const currentCatWarningKey = `${monitoredMonth}-${categoryBudgetAlerts
    .map((a) => `${a.category}:${a.spent}:${a.limit}`)
    .join('|')}`;
  const showCategoryAlertBanner =
    categoryBudgetAlerts.length > 0 && dismissedCatWarningKey !== currentCatWarningKey;

  // Live modal projection when adding or editing an expense (overall household budget)
  const modalProjection = useMemo(() => {
    if (!modalOpen || type !== 'expense' || monthlyBudget <= 0) return null;
    const entered = Number(amount);
    if (!amount || Number.isNaN(entered) || entered <= 0) return null;
    const targetYm = (date || getTodayISO()).slice(0, 7);
    const otherExpensesInMonth = data.finances
      .filter(
        (f) =>
          f.type === 'expense' &&
          f.date.startsWith(targetYm) &&
          f.id !== editingId
      )
      .reduce((s, f) => s + f.amount, 0);
    const projectedTotal = otherExpensesInMonth + entered;
    if (projectedTotal <= monthlyBudget * 0.8) return null;
    const projRaw = (projectedTotal / monthlyBudget) * 100;
    const projectedPct =
      Math.round(projRaw) <= 80 ? projRaw.toFixed(1) : String(Math.round(projRaw));
    return {
      targetYm,
      projectedTotal,
      projectedPct,
      isOverBudget: projectedTotal > monthlyBudget,
      diff: Math.abs(monthlyBudget - projectedTotal),
    };
  }, [modalOpen, type, amount, date, editingId, data.finances, monthlyBudget]);

  // Live modal projection for specific category budget limit (>= 80% near-limit warning)
  const modalCategoryProjection = useMemo(() => {
    if (!modalOpen || type !== 'expense') return null;
    const catLimit = categoryBudgets[category];
    if (!catLimit || catLimit <= 0) return null;
    const entered = Number(amount);
    if (!amount || Number.isNaN(entered) || entered <= 0) return null;
    const targetYm = (date || getTodayISO()).slice(0, 7);
    const otherCatExpenses = data.finances
      .filter(
        (f) =>
          f.type === 'expense' &&
          f.category === category &&
          f.date.startsWith(targetYm) &&
          f.id !== editingId
      )
      .reduce((s, f) => s + f.amount, 0);
    const projectedSpent = otherCatExpenses + entered;
    if (projectedSpent < catLimit * 0.8) return null;
    const projRaw = (projectedSpent / catLimit) * 100;
    const projectedPct =
      projRaw < 100 && Math.round(projRaw) === 100
        ? projRaw.toFixed(1)
        : projRaw > 80 && Math.round(projRaw) <= 80
          ? projRaw.toFixed(1)
          : String(Math.round(projRaw));
    return {
      category,
      targetYm,
      catLimit,
      projectedSpent,
      projectedPct,
      isExceeded: projectedSpent > catLimit,
      diff: Math.abs(catLimit - projectedSpent),
    };
  }, [modalOpen, type, category, amount, date, editingId, data.finances, categoryBudgets]);

  // Expense Breakdown by Category (merging filtered spending + configured monthly category limits)
  const expenseByCategory = useMemo(() => {
    const filteredMap = new Map<FinanceCategory, number>();
    filteredRecords
      .filter((r) => r.type === 'expense')
      .forEach((r) => {
        filteredMap.set(r.category, (filteredMap.get(r.category) || 0) + r.amount);
      });

    const categoriesToShow = new Set<FinanceCategory>([
      ...Array.from(filteredMap.keys()),
      ...(Object.keys(categoryBudgets).filter(
        (k) => (categoryBudgets[k as FinanceCategory] || 0) > 0
      ) as FinanceCategory[]),
    ]);

    return Array.from(categoriesToShow)
      .filter((cat) => categoryFilter === 'all' || cat === categoryFilter)
      .map((cat) => {
        const amountInFilter = filteredMap.get(cat) || 0;
        const monthSpent = monitoredMonthByCategory.get(cat) || 0;
        const limit = categoryBudgets[cat] || 0;
        const sharePct = totalExpense > 0 ? Math.round((amountInFilter / totalExpense) * 100) : 0;
        const limitPctRaw = limit > 0 ? (monthSpent / limit) * 100 : 0;
        const limitPctDisplay =
          limit > 0
            ? limitPctRaw < 100 && Math.round(limitPctRaw) === 100
              ? limitPctRaw.toFixed(1)
              : String(Math.round(limitPctRaw))
            : '0';
        return {
          category: cat,
          amount: amountInFilter,
          monthSpent,
          limit,
          pct: sharePct,
          limitPctRaw,
          limitPctDisplay,
          isNearLimit: limit > 0 && monthSpent >= limit * 0.8 && monthSpent <= limit,
          isOverLimit: limit > 0 && monthSpent > limit,
        };
      })
      .filter((item) => item.amount > 0 || item.limit > 0)
      .sort((a, b) => {
        // Surface categories exceeding or nearing their budget limit first, then by spend
        const aAlertScore = a.isOverLimit ? 2 : a.isNearLimit ? 1 : 0;
        const bAlertScore = b.isOverLimit ? 2 : b.isNearLimit ? 1 : 0;
        if (bAlertScore !== aAlertScore) return bAlertScore - aAlertScore;
        if (b.amount !== a.amount) return b.amount - a.amount;
        return b.limitPctRaw - a.limitPctRaw;
      });
  }, [
    filteredRecords,
    totalExpense,
    categoryBudgets,
    monitoredMonthByCategory,
    categoryFilter,
  ]);

  // Last 6 Months Trend (always computed across all data for reliable trend chart)
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months: { ym: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const inc = data.finances
        .filter((f) => f.type === 'income' && f.date.startsWith(ym))
        .reduce((s, f) => s + f.amount, 0);
      const exp = data.finances
        .filter((f) => f.type === 'expense' && f.date.startsWith(ym))
        .reduce((s, f) => s + f.amount, 0);
      months.push({ ym, income: inc, expense: exp });
    }
    return months;
  }, [data.finances]);

  const maxTrendValue = Math.max(
    1,
    ...monthlyTrend.map((m) => Math.max(m.income, m.expense))
  );

  const openAddModal = (initialType: FinanceType = 'expense') => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setType(initialType);
    setCategory(initialType === 'income' ? 'Salary' : 'Food');
    setDate(getTodayISO());
    setPaymentMethod('Cash');
    setNote('');
    setFormErr('');
    setModalOpen(true);
  };

  const openEditModal = (rec: FinanceRecord) => {
    setEditingId(rec.id);
    setTitle(rec.title);
    setAmount(String(rec.amount));
    setType(rec.type);
    setCategory(rec.category);
    setDate(rec.date);
    setPaymentMethod(rec.paymentMethod);
    setNote(rec.note);
    setFormErr('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormErr(t(lang, 'कृपया विवरण वा शीर्षक लेख्नुहोस्।', 'Please enter a title.'));
      return;
    }
    const num = Number(amount);
    if (!amount || Number.isNaN(num) || num <= 0) {
      setFormErr(t(lang, 'कृपया मान्य रकम राख्नुहोस्।', 'Please enter a valid positive amount.'));
      return;
    }
    if (!date) {
      setFormErr(t(lang, 'कृपया मिति छान्नुहोस्।', 'Please choose a date.'));
      return;
    }

    const payload = {
      title: title.trim(),
      amount: num,
      type,
      category,
      date,
      paymentMethod,
      note: note.trim(),
    };

    if (editingId) {
      updateFinance(editingId, payload);
    } else {
      addFinance(payload);
    }
    setModalOpen(false);
  };

  const confirmDelete = (rec: FinanceRecord) => {
    requestConfirm({
      title: t(lang, 'यो आर्थिक विवरण हटाउने हो?', 'Delete Finance Record?'),
      message: `"${rec.title}" (${formatCurrency(rec.amount, currency)}) ${t(
        lang,
        'स्थायी रूपमा हटाइनेछ।',
        'will be permanently deleted.'
      )}`,
      confirmLabel: t(lang, 'हटाउनुहोस्', 'Delete'),
      danger: true,
      onConfirm: () => deleteFinance(rec.id),
    });
  };

  const openCatLimitsModal = () => {
    const initialDraft: Record<string, string> = {};
    EXPENSE_CATEGORIES.forEach((cat) => {
      const val = categoryBudgets[cat];
      initialDraft[cat] = val && val > 0 ? String(val) : '';
    });
    setDraftCatBudgets(initialDraft);
    setCatLimitsErr('');
    setCatLimitsModalOpen(true);
  };

  const handleSaveCatLimits = (e: React.FormEvent) => {
    e.preventDefault();
    const nextBudgets: Partial<Record<FinanceCategory, number>> = {};

    for (const cat of EXPENSE_CATEGORIES) {
      const raw = (draftCatBudgets[cat] || '').trim();
      if (!raw) continue;
      const num = Number(raw);
      if (Number.isNaN(num) || num < 0) {
        setCatLimitsErr(
          t(
            lang,
            `${FINANCE_CATEGORY_LABELS[cat].ne} को बजेट सीमा मान्य सकारात्मक अंक हुनुपर्छ।`,
            `Please enter a valid non-negative limit for ${FINANCE_CATEGORY_LABELS[cat].en}.`
          )
        );
        return;
      }
      if (num > 0) {
        nextBudgets[cat] = Math.round(num);
      }
    }

    updateCategoryBudgets(nextBudgets);
    setCatLimitsModalOpen(false);
  };

  const draftConfiguredTotal = useMemo(() => {
    return EXPENSE_CATEGORIES.reduce((sum, cat) => {
      const val = Number((draftCatBudgets[cat] || '').trim());
      return !Number.isNaN(val) && val > 0 ? sum + val : sum;
    }, 0);
  }, [draftCatBudgets]);

  return (
    <div className="space-y-6">
      {/* Header & Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'घरको आम्दानी र खर्च खाता', 'Home Finance & Ledger')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t(
              lang,
              'परिवारको सम्पूर्ण आम्दानी, दैनिक खर्च र बचतको स्पष्ट हिसाबकिताब',
              'Track household income, categorized expenses, payment methods, and monthly trends'
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openCatLimitsModal}
            className="min-h-[42px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t(lang, 'विधा सीमा', 'Category Limits')}</span>
          </button>
          <button
            type="button"
            onClick={() => setScanModalOpen(true)}
            className="min-h-[42px] px-4 py-2 rounded-lg border border-amber-300 dark:border-amber-700/80 bg-amber-50/80 dark:bg-amber-950/35 hover:bg-amber-100/80 dark:hover:bg-amber-900/45 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <ScanLine className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{t(lang, 'रसिद स्क्यान', 'Scan Receipt')}</span>
          </button>
          <button
            type="button"
            onClick={() => openAddModal('income')}
            className="min-h-[42px] px-4 py-2 rounded-lg border border-emerald-600/40 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t(lang, 'आम्दानी थप्नुहोस्', 'Add Income')}</span>
          </button>
          <button
            type="button"
            onClick={() => openAddModal('expense')}
            className="min-h-[42px] px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t(lang, 'खर्च थप्नुहोस्', 'Add Expense')}</span>
          </button>
        </div>
      </div>

      {/* 80%+ Monthly Budget Warning Notification Banner */}
      {showBudgetWarningBanner && (
        <div
          role="alert"
          aria-live="polite"
          className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isOver100Pct
              ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/85 dark:bg-rose-950/35'
              : 'border-amber-300 dark:border-amber-800/80 bg-amber-50/85 dark:bg-amber-950/35'
          }`}
        >
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isOver100Pct
                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                  : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <div
                className={`text-sm sm:text-base font-bold ${
                  isOver100Pct
                    ? 'text-rose-950 dark:text-rose-200'
                    : 'text-amber-950 dark:text-amber-200'
                }`}
              >
                {isOver100Pct
                  ? t(
                      lang,
                      `मासिक बजेट सीमा नाघ्यो (${formatMonthYear(monitoredMonth, lang)} मा ${budgetPctDisplay}% खर्च)`,
                      `Monthly Budget Exceeded (${budgetPctDisplay}% spent in ${formatMonthYear(monitoredMonth, lang)})`
                    )
                  : t(
                      lang,
                      `मासिक बजेटको ८०% सीमा पार भयो (${formatMonthYear(monitoredMonth, lang)} मा ${budgetPctDisplay}% खर्च)`,
                      `Monthly Expenses Exceeded 80% of Budget (${budgetPctDisplay}% used in ${formatMonthYear(monitoredMonth, lang)})`
                    )}
              </div>
              <p
                className={`text-xs sm:text-sm leading-relaxed tabular-nums ${
                  isOver100Pct
                    ? 'text-rose-900/90 dark:text-rose-300'
                    : 'text-amber-900/90 dark:text-amber-300'
                }`}
              >
                {isOver100Pct
                  ? t(
                      lang,
                      `तोकिएको मासिक बजेट ${formatCurrency(monthlyBudget, currency)} मध्ये ${formatCurrency(monitoredMonthExpense, currency)} खर्च भइसकेको छ (${formatCurrency(monitoredMonthExpense - monthlyBudget, currency)} बढी)। गैर-अत्यावश्यक खर्च कटौती गर्न वा बजेट पुनरावलोकन गर्न सुझाव दिइन्छ।`,
                      `You have spent ${formatCurrency(monitoredMonthExpense, currency)} out of your ${formatCurrency(monthlyBudget, currency)} monthly budget (${formatCurrency(monitoredMonthExpense - monthlyBudget, currency)} over target). Consider pausing non-essential spending.`
                    )
                  : t(
                      lang,
                      `तोकिएको मासिक बजेट ${formatCurrency(monthlyBudget, currency)} मध्ये ${formatCurrency(monitoredMonthExpense, currency)} खर्च भइसकेको छ। यस महिनाका लागि अब ${formatCurrency(monthlyBudget - monitoredMonthExpense, currency)} मात्र बाँकी छ।`,
                      `You have spent ${formatCurrency(monitoredMonthExpense, currency)} of your ${formatCurrency(monthlyBudget, currency)} budget. Only ${formatCurrency(monthlyBudget - monitoredMonthExpense, currency)} remains for this month.`
                    )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection('settings')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                isOver100Pct
                  ? 'border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 hover:bg-rose-100/70 dark:hover:bg-rose-900/40'
                  : 'border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-900/40'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t(lang, 'बजेट समायोजन', 'Adjust Budget')}</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissedWarningKey(currentWarningKey)}
              aria-label={t(lang, 'चेतावनी बन्द गर्नुहोस्', 'Dismiss budget warning')}
              className="min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Real-Time Category Budget Limit Notification Center (>= 80% Near-Limit & Exceeded Alerts) */}
      {showCategoryAlertBanner && (
        <div
          role="alert"
          aria-live="polite"
          className={`rounded-2xl border p-4 sm:p-5 space-y-3.5 ${
            hasExceededCategoryAlert
              ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/30'
              : 'border-amber-300 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/30'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  hasExceededCategoryAlert
                    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                <BellRing className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div
                  className={`text-sm sm:text-base font-bold ${
                    hasExceededCategoryAlert
                      ? 'text-rose-950 dark:text-rose-200'
                      : 'text-amber-950 dark:text-amber-200'
                  }`}
                >
                  {t(
                    lang,
                    `विधागत मासिक बजेट सूचना (${formatMonthYear(monitoredMonth, lang)})`,
                    `Category Budget Alerts (${formatMonthYear(monitoredMonth, lang)})`
                  )}
                </div>
                <p
                  className={`text-xs leading-relaxed ${
                    hasExceededCategoryAlert
                      ? 'text-rose-900/85 dark:text-rose-300'
                      : 'text-amber-900/85 dark:text-amber-300'
                  }`}
                >
                  {t(
                    lang,
                    `${categoryBudgetAlerts.length} विधामा मासिक खर्च तोकिएको बजेट सीमाको नजिक (८०%+) वा माथि पुगेको छ।`,
                    `Monthly spending in ${categoryBudgetAlerts.length} ${
                      categoryBudgetAlerts.length === 1 ? 'category is' : 'categories are'
                    } nearing (80%+) or exceeding your set limit.`
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={openCatLimitsModal}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  hasExceededCategoryAlert
                    ? 'border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 hover:bg-rose-100/70 dark:hover:bg-rose-900/40'
                    : 'border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-900/40'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{t(lang, 'सीमा समायोजन', 'Edit Limits')}</span>
              </button>
              <button
                type="button"
                onClick={() => setDismissedCatWarningKey(currentCatWarningKey)}
                aria-label={t(lang, 'सूचना बन्द गर्नुहोस्', 'Dismiss category budget alerts')}
                className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className={`divide-y border-t pt-1 ${
              hasExceededCategoryAlert
                ? 'divide-rose-200/70 dark:divide-rose-800/50 border-rose-200/80 dark:border-rose-800/60'
                : 'divide-amber-200/70 dark:divide-amber-800/50 border-amber-200/80 dark:border-amber-800/60'
            }`}
          >
            {categoryBudgetAlerts.map((alertItem) => (
              <div
                key={alertItem.category}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {FINANCE_CATEGORY_LABELS[alertItem.category][lang]}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">·</span>
                  <span
                    className={`font-semibold ${
                      alertItem.isExceeded
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {alertItem.isExceeded
                      ? t(lang, 'बजेट सीमा नाघ्यो', 'Limit exceeded')
                      : t(lang, 'बजेट सीमाको नजिक', 'Nearing budget limit')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-x-3 gap-y-1">
                  <span className="font-mono tabular-nums text-xs text-slate-800 dark:text-slate-200">
                    {formatCurrency(alertItem.spent, currency)} /{' '}
                    {formatCurrency(alertItem.limit, currency)} ·{' '}
                    <strong
                      className={
                        alertItem.isExceeded
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-amber-800 dark:text-amber-300'
                      }
                    >
                      {alertItem.pctDisplay}%
                    </strong>{' '}
                    ·{' '}
                    {alertItem.isExceeded
                      ? t(
                          lang,
                          `${formatCurrency(alertItem.diff, currency)} बढी`,
                          `${formatCurrency(alertItem.diff, currency)} over`
                        )
                      : t(
                          lang,
                          `${formatCurrency(alertItem.diff, currency)} बाँकी`,
                          `${formatCurrency(alertItem.diff, currency)} left`
                        )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter('expense');
                      setCategoryFilter(alertItem.category);
                      if (monthFilter === 'all') {
                        setMonthFilter(monitoredMonth);
                      }
                    }}
                    className="text-xs font-semibold underline underline-offset-2 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white cursor-pointer shrink-0"
                  >
                    {t(lang, 'कारोबार हेर्नुहोस्', 'View entries')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{t(lang, 'कुल आम्दानी (छानिएको अवधि)', 'Total Income')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatCurrency(totalIncome, currency)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{t(lang, 'कुल खर्च (छानिएको अवधि)', 'Total Expenses')}</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-700 dark:text-rose-400">
            {formatCurrency(totalExpense, currency)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{t(lang, 'खुद बचत / मौज्दात', 'Net Balance')}</span>
            <Wallet className="w-4 h-4 text-slate-500" />
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              netBalance >= 0
                ? 'text-slate-900 dark:text-white'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(netBalance, currency)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate pr-2">
              {t(
                lang,
                `मासिक बजेट स्थिति (${formatMonthYear(monitoredMonth, lang)})`,
                `Budget Usage (${formatMonthYear(monitoredMonth, lang)})`
              )}
            </span>
            <span
              className={`font-mono font-bold tabular-nums shrink-0 ${
                isOver100Pct
                  ? 'text-rose-600 dark:text-rose-400'
                  : isOver80Pct
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {budgetPctDisplay}%
            </span>
          </div>
          <div className="relative h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isOver100Pct
                  ? 'bg-rose-600'
                  : isOver80Pct
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, budgetPctRaw))}%` }}
            />
            <div
              title={t(lang, '८०% चेतावनी सीमा', '80% warning threshold')}
              className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-slate-400/70 dark:bg-slate-500"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            <span>{formatCurrency(monitoredMonthExpense, currency)}</span>
            <span>
              {t(lang, 'सीमा:', 'Cap:')} {formatCurrency(monthlyBudget, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Visualizations: Category Spending & 6-Month Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown & Monthly Category Limits */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t(lang, 'विधाअनुसार खर्च र बजेट सीमा', 'Category Spending & Limits')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(
                  lang,
                  `${formatMonthYear(monitoredMonth, lang)} को विधागत सीमा अनुगमन`,
                  `Monthly limits tracked for ${formatMonthYear(monitoredMonth, lang)}`
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={openCatLimitsModal}
              className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{t(lang, 'सीमा सेट गर्नुहोस्', 'Set Limits')}</span>
            </button>
          </div>
          {expenseByCategory.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              {t(lang, 'छानिएको अवधिमा कुनै खर्च छैन।', 'No expenses found for selected filters.')}
            </p>
          ) : (
            <div className="space-y-3.5">
              {expenseByCategory.slice(0, 8).map((item) => {
                const hasLimit = item.limit > 0;
                const barWidth = hasLimit
                  ? Math.min(100, Math.max(item.monthSpent > 0 ? 4 : 0, item.limitPctRaw))
                  : Math.max(item.amount > 0 ? 4 : 0, item.pct);
                const barColorClass = hasLimit
                  ? item.isOverLimit
                    ? 'bg-rose-600 dark:bg-rose-500'
                    : item.isNearLimit
                      ? 'bg-amber-500 dark:bg-amber-400'
                      : 'bg-emerald-600 dark:bg-emerald-500'
                  : 'bg-slate-900 dark:bg-emerald-500';

                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {FINANCE_CATEGORY_LABELS[item.category][lang]}
                        </span>
                        {item.isOverLimit && (
                          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                            · {t(lang, 'सीमा नाघ्यो', 'Over limit')}
                          </span>
                        )}
                        {!item.isOverLimit && item.isNearLimit && (
                          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                            · {t(lang, 'सीमा नजिक', 'Near limit')}
                          </span>
                        )}
                      </div>
                      <span className="font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400 shrink-0">
                        {hasLimit ? (
                          <>
                            {formatCurrency(item.monthSpent, currency)} /{' '}
                            {formatCurrency(item.limit, currency)} ·{' '}
                            <span
                              className={
                                item.isOverLimit
                                  ? 'font-bold text-rose-600 dark:text-rose-400'
                                  : item.isNearLimit
                                    ? 'font-bold text-amber-600 dark:text-amber-400'
                                    : 'font-semibold text-emerald-700 dark:text-emerald-400'
                              }
                            >
                              {item.limitPctDisplay}%
                            </span>
                          </>
                        ) : (
                          <>
                            {formatCurrency(item.amount, currency)} · {item.pct}%
                          </>
                        )}
                      </span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColorClass}`}
                        style={{ width: `${barWidth}%` }}
                      />
                      {hasLimit && (
                        <div
                          title={t(lang, '८०% विधा चेतावनी सीमा', '80% category warning threshold')}
                          className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-slate-400/75 dark:bg-slate-500"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 6-Month Income vs Expense Trend */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t(lang, '६ महिनाको आम्दानी र खर्च प्रवृत्ति', '6-Month Income vs Expenses')}
            </h3>
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                <span>{t(lang, 'आम्दानी', 'Income')}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                <span>{t(lang, 'खर्च', 'Expense')}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-44 pt-4 border-b border-slate-200 dark:border-slate-800">
            {monthlyTrend.map((m) => {
              const incH = Math.round((m.income / maxTrendValue) * 100);
              const expH = Math.round((m.expense / maxTrendValue) * 100);
              return (
                <div key={m.ym} className="flex flex-col items-center h-full justify-end gap-2">
                  <div className="w-full flex items-end justify-center gap-1 h-32">
                    <div
                      title={`${t(lang, 'आम्दानी', 'Income')}: ${formatCurrency(m.income, currency)}`}
                      className="w-3 sm:w-4 bg-emerald-600 dark:bg-emerald-500 rounded-t-xs transition-all"
                      style={{ height: `${m.income > 0 ? Math.max(6, incH) : 2}%` }}
                    />
                    <div
                      title={`${t(lang, 'खर्च', 'Expense')}: ${formatCurrency(m.expense, currency)}`}
                      className="w-3 sm:w-4 bg-rose-500 dark:bg-rose-400 rounded-t-xs transition-all"
                      style={{ height: `${m.expense > 0 ? Math.max(6, expH) : 2}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-6 gap-2 pt-2 text-center">
            {monthlyTrend.map((m) => (
              <div
                key={m.ym}
                className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums"
              >
                {formatMonthYear(m.ym, lang).split(' ')[0]}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Search & Filter Controls */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                lang,
                'शीर्षक, विधा वा टिपोटबाट खोज्नुहोस्...',
                'Search by title, category, or note...'
              )}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-stone-50/60 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Segmented Type Filter */}
          <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
            {(['all', 'expense', 'income'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTypeFilter(tf)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  typeFilter === tf
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf === 'all' && t(lang, 'सबै', 'All')}
                {tf === 'expense' && t(lang, 'खर्च मात्र', 'Expenses')}
                {tf === 'income' && t(lang, 'आम्दानी मात्र', 'Income')}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | FinanceCategory)}
            aria-label={t(lang, 'विधा छान्नुहोस्', 'Filter by category')}
            className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
          >
            <option value="all">{t(lang, 'सबै विधा (Categories)', 'All Categories')}</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {FINANCE_CATEGORY_LABELS[c][lang]}
              </option>
            ))}
          </select>

          {/* Month Dropdown */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            aria-label={t(lang, 'महिना छान्नुहोस्', 'Filter by month')}
            className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
          >
            <option value="all">{t(lang, 'सबै महिना', 'All Months')}</option>
            {availableMonths.map((ym) => (
              <option key={ym} value={ym}>
                {formatMonthYear(ym, lang)}
              </option>
            ))}
          </select>
        </div>

        {/* Ledger Table / Mobile List */}
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t(
                lang,
                'कुनै आर्थिक कारोबार भेटिएन।',
                'No matching income or expense records found.'
              )}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setScanModalOpen(true)}
                className="min-h-[40px] px-4 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>{t(lang, 'रसिद स्क्यान गर्नुहोस्', 'Scan Receipt')}</span>
              </button>
              <button
                type="button"
                onClick={() => openAddModal('expense')}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                {t(lang, 'पहिलो विवरण थप्नुहोस्', 'Log First Entry')}
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4">{t(lang, 'विवरण', 'Description')}</th>
                  <th className="py-3 px-4 hidden md:table-cell">
                    {t(lang, 'विधा र माध्यम', 'Category & Method')}
                  </th>
                  <th className="py-3 px-4 hidden sm:table-cell">
                    {t(lang, 'मिति', 'Date')}
                  </th>
                  <th className="py-3 px-4 text-right">{t(lang, 'रकम', 'Amount')}</th>
                  <th className="py-3 pl-4 text-right">{t(lang, 'कार्य', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {rec.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 md:hidden mt-0.5">
                        {FINANCE_CATEGORY_LABELS[rec.category][lang]} ·{' '}
                        {PAYMENT_METHOD_LABELS[rec.paymentMethod][lang]} ·{' '}
                        {formatDateReadable(rec.date, lang)}
                      </div>
                      {rec.note && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {rec.note}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell text-xs text-slate-600 dark:text-slate-300">
                      {FINANCE_CATEGORY_LABELS[rec.category][lang]} ·{' '}
                      {PAYMENT_METHOD_LABELS[rec.paymentMethod][lang]}
                    </td>
                    <td className="py-3.5 px-4 hidden sm:table-cell text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDateReadable(rec.date, lang)}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                        rec.type === 'income'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {rec.type === 'income' ? '+' : '-'}
                      {formatCurrency(rec.amount, currency)}
                    </td>
                    <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(rec)}
                          aria-label={t(lang, 'सम्पादन गर्नुहोस्', 'Edit')}
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(rec)}
                          aria-label={t(lang, 'हटाउनुहोस्', 'Delete')}
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add / Edit Finance Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {editingId
                  ? t(lang, 'आर्थिक विवरण सम्पादन', 'Edit Finance Record')
                  : t(lang, 'नयाँ आम्दानी / खर्च थप्नुहोस्', 'Add Income or Expense')}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                {!editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setScanModalOpen(true);
                    }}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/80 bg-amber-50/80 dark:bg-amber-950/35 text-xs font-semibold text-amber-900 dark:text-amber-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>{t(lang, 'रसिद स्क्यान', 'Scan Receipt')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {formErr && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300">
                  {formErr}
                </div>
              )}

              {/* Type Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setType('expense');
                    if (category === 'Salary' || category === 'Business') setCategory('Food');
                  }}
                  className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                    type === 'expense'
                      ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t(lang, 'खर्च (Expense)', 'Expense')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('income');
                    setCategory('Salary');
                  }}
                  className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                    type === 'income'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t(lang, 'आम्दानी (Income)', 'Income')}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'शीर्षक / विवरण *', 'Title *')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t(
                    lang,
                    'उदा: भाटभटेनी रासन किनमेल / मासिक तलब',
                    'e.g., Monthly Groceries / Salary'
                  )}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, `रकम (${currencySymbol}) *`, `Amount (${currencySymbol}) *`)}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'मिति *', 'Date *')}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {modalProjection && (
                <div
                  role="status"
                  className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs leading-relaxed tabular-nums ${
                    modalProjection.isOverBudget
                      ? 'border-rose-200 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                      : 'border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {modalProjection.isOverBudget
                      ? t(
                          lang,
                          `चेतावनी: यो खर्च थप्दा ${formatMonthYear(modalProjection.targetYm, lang)} को कुल खर्च ${formatCurrency(modalProjection.projectedTotal, currency)} (${modalProjection.projectedPct}%) पुग्नेछ र मासिक बजेट ${formatCurrency(modalProjection.diff, currency)} ले नाघ्नेछ।`,
                          `Alert: Saving this expense brings ${formatMonthYear(modalProjection.targetYm, lang)} spending to ${formatCurrency(modalProjection.projectedTotal, currency)} (${modalProjection.projectedPct}%), exceeding your budget by ${formatCurrency(modalProjection.diff, currency)}.`
                        )
                      : t(
                          lang,
                          `सावधानी: यो खर्च थप्दा ${formatMonthYear(modalProjection.targetYm, lang)} को मासिक बजेटको ${modalProjection.projectedPct}% प्रयोग हुनेछ (८०% सीमा पार · ${formatCurrency(modalProjection.diff, currency)} बाँकी)।`,
                          `Heads up: Saving this expense brings ${formatMonthYear(modalProjection.targetYm, lang)} spending to ${modalProjection.projectedPct}% (above 80% threshold · ${formatCurrency(modalProjection.diff, currency)} remaining).`
                        )}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'विधा (Category)', 'Category')}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FinanceCategory)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {FINANCE_CATEGORY_LABELS[c][lang]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'भुक्तानी माध्यम', 'Payment Method')}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {ALL_PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {PAYMENT_METHOD_LABELS[pm][lang]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Real-Time Category Budget Limit Projection inside Add/Edit Modal */}
              {modalCategoryProjection && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs leading-relaxed tabular-nums ${
                    modalCategoryProjection.isExceeded
                      ? 'border-rose-200 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                      : 'border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <BellRing className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {modalCategoryProjection.isExceeded
                      ? t(
                          lang,
                          `विधा सीमा नाघ्यो (${FINANCE_CATEGORY_LABELS[modalCategoryProjection.category].ne}): यो खर्चपछि ${formatMonthYear(modalCategoryProjection.targetYm, lang)} को खर्च ${formatCurrency(modalCategoryProjection.projectedSpent, currency)} (${modalCategoryProjection.projectedPct}%) पुग्नेछ — तोकिएको ${formatCurrency(modalCategoryProjection.catLimit, currency)} सीमाभन्दा ${formatCurrency(modalCategoryProjection.diff, currency)} बढी।`,
                          `Category limit exceeded (${FINANCE_CATEGORY_LABELS[modalCategoryProjection.category].en}): Saving brings ${formatMonthYear(modalCategoryProjection.targetYm, lang)} category spend to ${formatCurrency(modalCategoryProjection.projectedSpent, currency)} (${modalCategoryProjection.projectedPct}%), ${formatCurrency(modalCategoryProjection.diff, currency)} over your ${formatCurrency(modalCategoryProjection.catLimit, currency)} limit.`
                        )
                      : t(
                          lang,
                          `विधा सीमा नजिक (${FINANCE_CATEGORY_LABELS[modalCategoryProjection.category].ne}): यो खर्चपछि ${formatMonthYear(modalCategoryProjection.targetYm, lang)} को विधा बजेटको ${modalCategoryProjection.projectedPct}% प्रयोग हुनेछ (${formatCurrency(modalCategoryProjection.diff, currency)} बाँकी)।`,
                          `Nearing ${FINANCE_CATEGORY_LABELS[modalCategoryProjection.category].en} limit: Saving brings ${formatMonthYear(modalCategoryProjection.targetYm, lang)} category spend to ${modalCategoryProjection.projectedPct}% of your ${formatCurrency(modalCategoryProjection.catLimit, currency)} limit (${formatCurrency(modalCategoryProjection.diff, currency)} remaining).`
                        )}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'कैफियत / टिपोट', 'Note')}
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t(lang, 'रसिद नं. वा थप जानकारी...', 'Optional memo or receipt details...')}
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t(lang, 'रद्द गर्नुहोस्', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white cursor-pointer"
                >
                  {editingId
                    ? t(lang, 'अद्यावधिक गर्नुहोस्', 'Update Record')
                    : t(lang, 'सुरक्षित गर्नुहोस्', 'Save Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Budget Limits Configuration Modal */}
      {catLimitsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-limits-modal-title"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3
                  id="category-limits-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white truncate"
                >
                  {t(
                    lang,
                    'विधागत मासिक बजेट सीमा सेटिङ',
                    'Monthly Category Budget Limits'
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t(
                    lang,
                    'कुनै पनि विधाको खर्च ८०% पुगेमा वा सीमा नाघेमा स्वतः रियल-टाइम सूचना प्राप्त हुनेछ।',
                    'Receive real-time alerts whenever monthly category spending reaches 80% or exceeds its limit.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCatLimitsModalOpen(false)}
                aria-label={t(lang, 'बन्द गर्नुहोस्', 'Close')}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveCatLimits}
              className="p-6 overflow-y-auto space-y-5"
            >
              {catLimitsErr && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300">
                  {catLimitsErr}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-mono tabular-nums">
                  {t(lang, 'विधागत सीमाको जम्मा:', 'Configured category caps:')} {' '}
                  <strong className="text-slate-900 dark:text-white">
                    {formatCurrency(draftConfiguredTotal, currency)}
                  </strong>{' '}
                  · {t(lang, 'कुल घर बजेट:', 'Household budget:')}{' '}
                  {formatCurrency(monthlyBudget, currency)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const cleared: Record<string, string> = {};
                    EXPENSE_CATEGORIES.forEach((c) => {
                      cleared[c] = '';
                    });
                    setDraftCatBudgets(cleared);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 cursor-pointer"
                >
                  {t(lang, 'सबै खाली गर्नुहोस्', 'Clear all limits')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {EXPENSE_CATEGORIES.map((cat) => {
                  const spentNow = monitoredMonthByCategory.get(cat) || 0;
                  const draftNum = Number((draftCatBudgets[cat] || '').trim());
                  const hasValidDraft = !Number.isNaN(draftNum) && draftNum > 0;
                  const isNearOrOver = hasValidDraft && spentNow >= draftNum * 0.8;
                  const isOver = hasValidDraft && spentNow > draftNum;

                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label
                          htmlFor={`cat-limit-${cat}`}
                          className="font-semibold text-slate-800 dark:text-slate-200 truncate"
                        >
                          {FINANCE_CATEGORY_LABELS[cat][lang]}
                        </label>
                        <span
                          className={`font-mono tabular-nums shrink-0 ${
                            isOver
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : isNearOrOver
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {t(lang, 'यो महिना:', 'Spent:')}{' '}
                          {formatCurrency(spentNow, currency)}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 select-none">
                          {currencySymbol}
                        </span>
                        <input
                          id={`cat-limit-${cat}`}
                          type="number"
                          min="0"
                          step="any"
                          value={draftCatBudgets[cat] ?? ''}
                          onChange={(e) =>
                            setDraftCatBudgets((prev) => ({
                              ...prev,
                              [cat]: e.target.value,
                            }))
                          }
                          placeholder={t(lang, 'सीमा छैन', 'No limit')}
                          className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCatLimitsModalOpen(false)}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t(lang, 'रद्द गर्नुहोस्', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-sm font-semibold text-white cursor-pointer"
                >
                  {t(lang, 'सीमा सुरक्षित गर्नुहोस्', 'Save Category Limits')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera & Photo Receipt Scanner Modal */}
      <ScanReceiptModal
        open={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
      />
    </div>
  );
};
