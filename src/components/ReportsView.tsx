import React, { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useHome } from '../context/HomeContext';
import {
  FINANCE_CATEGORY_LABELS,
  formatCurrency,
  formatDateReadable,
  formatMonthYear,
  getTodayISO,
  PAYMENT_METHOD_LABELS,
  t,
} from '../i18n/translations';
import { FinanceCategory } from '../types';

type DatePreset = 'this_month' | 'last_3_months' | 'last_6_months' | 'all' | 'custom';

export const ReportsView: React.FC = () => {
  const { data, addToast } = useHome();
  const lang = data.settings.language;
  const currency = data.settings.currency;
  const todayISO = getTodayISO();

  const [preset, setPreset] = useState<DatePreset>('last_3_months');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(todayISO);

  // Compute start & end ISO bounds
  const { startISO, endISO } = useMemo(() => {
    const now = new Date();
    if (preset === 'this_month') {
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { startISO: start, endISO: '9999-12-31' };
    }
    if (preset === 'last_3_months') {
      const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      return { startISO: start, endISO: '9999-12-31' };
    }
    if (preset === 'last_6_months') {
      const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      return { startISO: start, endISO: '9999-12-31' };
    }
    if (preset === 'custom') {
      return {
        startISO: customStart || '0000-01-01',
        endISO: customEnd || '9999-12-31',
      };
    }
    return { startISO: '0000-01-01', endISO: '9999-12-31' };
  }, [preset, customStart, customEnd]);

  const filteredFinances = useMemo(
    () =>
      data.finances.filter((f) => f.date >= startISO && f.date <= endISO),
    [data.finances, startISO, endISO]
  );

  const totalIncome = useMemo(
    () =>
      filteredFinances
        .filter((f) => f.type === 'income')
        .reduce((s, f) => s + f.amount, 0),
    [filteredFinances]
  );

  const totalExpense = useMemo(
    () =>
      filteredFinances
        .filter((f) => f.type === 'expense')
        .reduce((s, f) => s + f.amount, 0),
    [filteredFinances]
  );

  // Monthly breakdown
  const monthlySummary = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    filteredFinances.forEach((f) => {
      const ym = f.date.slice(0, 7);
      const cur = map.get(ym) || { income: 0, expense: 0 };
      if (f.type === 'income') cur.income += f.amount;
      else cur.expense += f.amount;
      map.set(ym, cur);
    });
    return Array.from(map.entries())
      .map(([ym, vals]) => ({ ym, ...vals, net: vals.income - vals.expense }))
      .sort((a, b) => b.ym.localeCompare(a.ym));
  }, [filteredFinances]);

  // Spending categories
  const categoryBreakdown = useMemo(() => {
    const map = new Map<FinanceCategory, number>();
    filteredFinances
      .filter((f) => f.type === 'expense')
      .forEach((f) => {
        map.set(f.category, (map.get(f.category) || 0) + f.amount);
      });
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        share: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredFinances, totalExpense]);

  // Bill payment history flattened
  const billPayments = useMemo(() => {
    return data.bills
      .flatMap((b) =>
        b.paymentHistory
          .filter((ph) => ph.paidDate >= startISO && ph.paidDate <= endISO)
          .map((ph) => ({
            id: ph.id,
            billName: b.billName,
            provider: b.provider,
            paidDate: ph.paidDate,
            amount: ph.amount,
            paymentMethod: ph.paymentMethod,
            note: ph.note,
          }))
      )
      .sort((a, b) => b.paidDate.localeCompare(a.paidDate));
  }, [data.bills, startISO, endISO]);

  // Task completion summary
  const memberTaskStats = useMemo(() => {
    return data.members.map((m) => {
      const assigned = data.tasks.filter((tk) => tk.assignedMemberId === m.id);
      const done = assigned.filter((tk) => tk.status === 'completed').length;
      return {
        id: m.id,
        name: m.name,
        total: assigned.length,
        done,
        pct: assigned.length > 0 ? Math.round((done / assigned.length) * 100) : 0,
      };
    });
  }, [data.members, data.tasks]);

  // Shopping totals
  const shoppingTotals = useMemo(() => {
    const totalBudget = data.shoppingLists.reduce((s, l) => s + l.budget, 0);
    const totalEstimated = data.shoppingLists.reduce(
      (s, l) => s + l.items.reduce((is, i) => is + i.estimatedPrice, 0),
      0
    );
    const totalPurchased = data.shoppingLists.reduce(
      (s, l) =>
        s +
        l.items
          .filter((i) => i.purchased)
          .reduce((is, i) => is + i.estimatedPrice, 0),
      0
    );
    return { totalBudget, totalEstimated, totalPurchased };
  }, [data.shoppingLists]);

  const exportCSV = () => {
    const escapeCell = (val: string | number) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const headers = [
      'Date',
      'Type',
      'Category',
      'Title',
      `Amount (${currency})`,
      'Payment Method',
      'Note',
    ];

    const rows = filteredFinances
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((f) => [
        f.date,
        f.type,
        FINANCE_CATEGORY_LABELS[f.category][lang],
        f.title,
        f.amount,
        PAYMENT_METHOD_LABELS[f.paymentMethod][lang],
        f.note,
      ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `digital-home-nepal-report-${todayISO}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast(
      t(lang, 'CSV रिपोर्ट सफलतापूर्वक डाउनलोड भयो।', 'CSV report downloaded successfully.'),
      'success'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'पारिवारिक मासिक रिपोर्ट र विश्लेषण', 'Family Household Reports')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t(
              lang,
              'मासिक आम्दानी-खर्च, बिल भुक्तानी, कार्य प्रगति र प्रिन्ट वा CSV डाउनलोड सुविधा',
              'Comprehensive summary of household finances, bills, tasks, and shopping with CSV & print support'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={exportCSV}
            className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t(lang, 'CSV डाउनलोड', 'Download CSV')}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:opacity-90 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{t(lang, 'रिपोर्ट प्रिन्ट', 'Print Report')}</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print-only border-b border-slate-300 pb-4 mb-4">
        <h1 className="text-2xl font-bold">
          Digital Home Nepal — {data.settings.householdName}
        </h1>
        <p className="text-sm text-slate-600">
          {t(lang, 'पारिवारिक आर्थिक तथा घरायसी प्रतिवेदन', 'Household Summary Report')} ·{' '}
          {formatDateReadable(todayISO, lang)}
        </p>
      </div>

      {/* Date Range Filter Controls */}
      <section className="no-print bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-x-auto">
          {(
            [
              ['this_month', t(lang, 'यस महिना', 'This Month')],
              ['last_3_months', t(lang, 'पछिल्लो ३ महिना', 'Last 3 Months')],
              ['last_6_months', t(lang, 'पछिल्लो ६ महिना', 'Last 6 Months')],
              ['all', t(lang, 'सबै समय', 'All Time')],
              ['custom', t(lang, 'मिति छान्नुहोस्', 'Custom Range')],
            ] as [DatePreset, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                preset === key
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-slate-900 dark:text-white"
            />
            <span className="text-slate-500">{t(lang, 'देखि', 'to')}</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-slate-900 dark:text-white"
            />
          </div>
        )}
      </section>

      {/* Income vs Expenses Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t(lang, 'कुल आम्दानी', 'Total Income')}
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatCurrency(totalIncome, currency)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t(lang, 'कुल खर्च', 'Total Expenses')}
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-rose-700 dark:text-rose-400">
            {formatCurrency(totalExpense, currency)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t(lang, 'आम्दानी बनाम खर्च बचत', 'Net Savings')}
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(totalIncome - totalExpense, currency)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t(lang, 'किनमेल अनुमानित जम्मा', 'Shopping List Total')}
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(shoppingTotals.totalEstimated, currency)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
            {t(lang, 'किनिसकेको:', 'Purchased:')}{' '}
            {formatCurrency(shoppingTotals.totalPurchased, currency)}
          </div>
        </div>
      </div>

      {/* Monthly Household Expenses & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            {t(lang, 'महिनाअनुसार आम्दानी बनाम खर्च', 'Household Finances by Month')}
          </h3>
          {monthlySummary.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              {t(lang, 'यस अवधिमा कुनै डाटा छैन।', 'No financial data in selected period.')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 pr-3">{t(lang, 'महिना', 'Month')}</th>
                    <th className="py-2.5 px-3 text-right">{t(lang, 'आम्दानी', 'Income')}</th>
                    <th className="py-2.5 px-3 text-right">{t(lang, 'खर्च', 'Expenses')}</th>
                    <th className="py-2.5 pl-3 text-right">{t(lang, 'बचत', 'Net')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthlySummary.map((row) => (
                    <tr key={row.ym}>
                      <td className="py-3 pr-3 font-medium text-slate-900 dark:text-white">
                        {formatMonthYear(row.ym, lang)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(row.income, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-rose-700 dark:text-rose-400">
                        {formatCurrency(row.expense, currency)}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(row.net, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            {t(lang, 'खर्चका प्रमुख क्षेत्रहरू', 'Spending Categories Breakdown')}
          </h3>
          {categoryBreakdown.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              {t(lang, 'यस अवधिमा कुनै खर्च छैन।', 'No expenses recorded in this period.')}
            </p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((cb) => (
                <div key={cb.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {FINANCE_CATEGORY_LABELS[cb.category][lang]}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {formatCurrency(cb.amount, currency)} ({cb.share}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${Math.max(3, cb.share)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Bill Payment History & Task Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            {t(lang, 'बिल भुक्तानी इतिहास', 'Bill Payment History')}
          </h3>
          {billPayments.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              {t(lang, 'यस अवधिमा कुनै बिल भुक्तानी रेकर्ड छैन।', 'No bill payments in this period.')}
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {billPayments.map((bp) => (
                <div
                  key={bp.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                      {bp.billName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {bp.provider} · {formatDateReadable(bp.paidDate, lang)} ·{' '}
                      {PAYMENT_METHOD_LABELS[bp.paymentMethod][lang]}
                    </div>
                  </div>
                  <div className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
                    {formatCurrency(bp.amount, currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            {t(lang, 'परिवारका सदस्यअनुसार कार्य सम्पन्न दर', 'Task Completion by Member')}
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {memberTaskStats.map((ms) => (
              <div key={ms.id} className="py-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {ms.name}
                  </span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {ms.done}/{ms.total} ({ms.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-900 dark:bg-emerald-500"
                    style={{ width: `${ms.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
