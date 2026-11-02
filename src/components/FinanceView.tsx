import React, { useMemo, useState } from 'react';
import {
  Edit2,
  Plus,
  Search,
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

const ALL_CATEGORIES = Object.keys(FINANCE_CATEGORY_LABELS) as FinanceCategory[];
const ALL_PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export const FinanceView: React.FC = () => {
  const {
    data,
    addFinance,
    updateFinance,
    deleteFinance,
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

  // Expense Breakdown by Category (for filtered records)
  const expenseByCategory = useMemo(() => {
    const map = new Map<FinanceCategory, number>();
    filteredRecords
      .filter((r) => r.type === 'expense')
      .forEach((r) => {
        map.set(r.category, (map.get(r.category) || 0) + r.amount);
      });
    return Array.from(map.entries())
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        pct: totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredRecords, totalExpense]);

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
        <div className="flex items-center gap-2.5 shrink-0">
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
            className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:opacity-90 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t(lang, 'खर्च थप्नुहोस्', 'Add Expense')}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>

      {/* Visualizations: Category Spending & 6-Month Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            {t(lang, 'विधाअनुसार खर्च वर्गीकरण', 'Expenses by Category')}
          </h3>
          {expenseByCategory.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              {t(lang, 'छानिएको अवधिमा कुनै खर्च छैन।', 'No expenses found for selected filters.')}
            </p>
          ) : (
            <div className="space-y-3.5">
              {expenseByCategory.slice(0, 6).map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {FINANCE_CATEGORY_LABELS[item.category][lang]}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {formatCurrency(item.amount, currency)} · {item.pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-900 dark:bg-emerald-500 transition-all"
                      style={{ width: `${Math.max(4, item.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
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
            <button
              type="button"
              onClick={() => openAddModal('expense')}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
            >
              {t(lang, 'पहिलो विवरण थप्नुहोस्', 'Log First Entry')}
            </button>
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
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingId
                  ? t(lang, 'आर्थिक विवरण सम्पादन', 'Edit Finance Record')
                  : t(lang, 'नयाँ आम्दानी / खर्च थप्नुहोस्', 'Add Income or Expense')}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
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
    </div>
  );
};
