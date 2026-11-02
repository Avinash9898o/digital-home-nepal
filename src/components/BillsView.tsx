import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  History,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import {
  BILL_CATEGORY_LABELS,
  CURRENCY_META,
  diffDaysFromToday,
  formatCurrency,
  formatDateReadable,
  getRelativeDueText,
  getTodayISO,
  PAYMENT_METHOD_LABELS,
  t,
} from '../i18n/translations';
import { BillCategory, BillItem, PaymentMethod } from '../types';

const BILL_CATEGORIES = Object.keys(BILL_CATEGORY_LABELS) as BillCategory[];
const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export const BillsView: React.FC = () => {
  const {
    data,
    addBill,
    updateBill,
    deleteBill,
    markBillPaid,
    markBillUnpaid,
    requestConfirm,
  } = useHome();

  const lang = data.settings.language;
  const currency = data.settings.currency;
  const currencySymbol = CURRENCY_META[currency].symbol;

  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'overdue' | 'paid'>('all');
  const [catFilter, setCatFilter] = useState<'all' | BillCategory>('all');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Add/Edit Bill Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillItem | null>(null);
  const [provider, setProvider] = useState('');
  const [billName, setBillName] = useState('');
  const [category, setCategory] = useState<BillCategory>('electricity');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(getTodayISO());
  const [status, setStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [notes, setNotes] = useState('');
  const [formErr, setFormErr] = useState('');

  // Mark as Paid Modal
  const [payingBill, setPayingBill] = useState<BillItem | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('eSewa / Khalti');
  const [paidDate, setPaidDate] = useState(getTodayISO());
  const [payNote, setPayNote] = useState('');
  const [alsoLogExpense, setAlsoLogExpense] = useState(true);

  const overdueBills = useMemo(
    () =>
      data.bills.filter((b) => b.status === 'unpaid' && diffDaysFromToday(b.dueDate) < 0),
    [data.bills]
  );

  const upcomingSoonBills = useMemo(
    () =>
      data.bills.filter((b) => {
        if (b.status !== 'unpaid') return false;
        const d = diffDaysFromToday(b.dueDate);
        return d >= 0 && d <= 7;
      }),
    [data.bills]
  );

  const filteredBills = useMemo(() => {
    return data.bills
      .filter((b) => {
        if (catFilter !== 'all' && b.category !== catFilter) return false;
        if (statusFilter === 'unpaid' && b.status !== 'unpaid') return false;
        if (statusFilter === 'paid' && b.status !== 'paid') return false;
        if (
          statusFilter === 'overdue' &&
          !(b.status === 'unpaid' && diffDaysFromToday(b.dueDate) < 0)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'unpaid' ? -1 : 1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [data.bills, catFilter, statusFilter]);

  const totalUnpaidAmount = data.bills
    .filter((b) => b.status === 'unpaid')
    .reduce((s, b) => s + b.amount, 0);

  const totalPaidAmount = data.bills
    .filter((b) => b.status === 'paid')
    .reduce((s, b) => s + b.amount, 0);

  const openCreateModal = () => {
    setEditingBill(null);
    setProvider('');
    setBillName('');
    setCategory('electricity');
    setAmount('');
    setDueDate(getTodayISO());
    setStatus('unpaid');
    setNotes('');
    setFormErr('');
    setModalOpen(true);
  };

  const openEditModal = (bill: BillItem) => {
    setEditingBill(bill);
    setProvider(bill.provider);
    setBillName(bill.billName);
    setCategory(bill.category);
    setAmount(String(bill.amount));
    setDueDate(bill.dueDate);
    setStatus(bill.status);
    setNotes(bill.notes);
    setFormErr('');
    setModalOpen(true);
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billName.trim()) {
      setFormErr(t(lang, 'कृपया बिलको नाम लेख्नुहोस्।', 'Please enter a bill name.'));
      return;
    }
    const num = Number(amount);
    if (!amount || Number.isNaN(num) || num <= 0) {
      setFormErr(t(lang, 'कृपया मान्य बिल रकम राख्नुहोस्।', 'Please enter a valid positive amount.'));
      return;
    }

    const payload = {
      provider: provider.trim() || BILL_CATEGORY_LABELS[category][lang],
      billName: billName.trim(),
      category,
      amount: num,
      dueDate,
      status,
      notes: notes.trim(),
    };

    if (editingBill) {
      updateBill(editingBill.id, payload);
    } else {
      addBill(payload);
    }
    setModalOpen(false);
  };

  const openPayModal = (bill: BillItem) => {
    setPayingBill(bill);
    setPayMethod('eSewa / Khalti');
    setPaidDate(getTodayISO());
    setPayNote('');
    setAlsoLogExpense(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill) return;
    markBillPaid(payingBill.id, payMethod, paidDate, payNote.trim(), alsoLogExpense);
    setPayingBill(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'बिल तथा भुक्तानी रिमाइन्डर', 'Household Bill Manager')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t(
              lang,
              'बिजुली, खानेपानी, इन्टरनेट, टेलिफोन, घरभाडा र स्कूल शुल्कको समयमै व्यवस्थापन',
              'Manage electricity, water, internet, rent, and school fees with overdue alerts and payment history'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="self-start sm:self-auto min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:opacity-90 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t(lang, 'नयाँ बिल थप्नुहोस्', 'Add Bill')}</span>
        </button>
      </div>

      {/* Overdue & Upcoming Alerts Banner */}
      {(overdueBills.length > 0 || upcomingSoonBills.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdueBills.length > 0 && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/30 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="font-bold text-rose-900 dark:text-rose-200">
                  {t(
                    lang,
                    `म्याद नाघेका बिल: ${overdueBills.length} वटा`,
                    `${overdueBills.length} Overdue Bill${overdueBills.length > 1 ? 's' : ''} Require Attention`
                  )}
                </div>
                <p className="text-rose-800 dark:text-rose-300">
                  {overdueBills.map((b) => b.billName).join(', ')} —{' '}
                  {t(
                    lang,
                    'थप जरिवाना नलागोस् भन्नका लागि छिटो भुक्तानी गर्नुहोस्।',
                    'Settle soon to avoid late penalties.'
                  )}
                </p>
              </div>
            </div>
          )}

          {upcomingSoonBills.length > 0 && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  {t(
                    lang,
                    `आगामी ७ दिनभित्र तिर्नुपर्ने: ${upcomingSoonBills.length} वटा बिल`,
                    `${upcomingSoonBills.length} Bill${upcomingSoonBills.length > 1 ? 's' : ''} Due Within 7 Days`
                  )}
                </div>
                <p className="text-amber-800 dark:text-amber-300">
                  {upcomingSoonBills.map((b) => b.billName).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t(lang, 'तिर्न बाँकी कुल रकम', 'Total Unpaid Bills')}
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-rose-700 dark:text-rose-400">
            {formatCurrency(totalUnpaidAmount, currency)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t(lang, 'भुक्तानी भइसकेको रकम', 'Settled Bills Total')}
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatCurrency(totalPaidAmount, currency)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t(lang, 'दर्ता भएका जम्मा बिल', 'Total Tracked Bills')}
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {data.bills.length}
          </div>
        </div>
      </div>

      {/* Filters & Bills List */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-x-auto">
            {(['all', 'unpaid', 'overdue', 'paid'] as const).map((sf) => (
              <button
                key={sf}
                type="button"
                onClick={() => setStatusFilter(sf)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === sf
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {sf === 'all' && t(lang, 'सबै बिल', 'All')}
                {sf === 'unpaid' && t(lang, 'तिर्न बाँकी', 'Unpaid')}
                {sf === 'overdue' && t(lang, 'म्याद नाघेका', 'Overdue')}
                {sf === 'paid' && t(lang, 'भुक्तानी सम्पन्न', 'Paid')}
              </button>
            ))}
          </div>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as 'all' | BillCategory)}
            className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
          >
            <option value="all">{t(lang, 'सबै सेवा प्रकार', 'All Categories')}</option>
            {BILL_CATEGORIES.map((bc) => (
              <option key={bc} value={bc}>
                {BILL_CATEGORY_LABELS[bc][lang]}
              </option>
            ))}
          </select>
        </div>

        {filteredBills.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t(lang, 'यस समूहमा कुनै बिल भेटिएन।', 'No bills match your current filter.')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredBills.map((bill) => {
              const daysDiff = diffDaysFromToday(bill.dueDate);
              const isOverdue = bill.status === 'unpaid' && daysDiff < 0;
              const historyOpen = expandedHistoryId === bill.id;

              return (
                <div key={bill.id} className="py-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {bill.status === 'paid' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : isOverdue ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {bill.billName}
                        </h4>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {bill.provider}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{BILL_CATEGORY_LABELS[bill.category][lang]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {t(lang, 'म्याद:', 'Due:')} {formatDateReadable(bill.dueDate, lang)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            bill.status === 'paid'
                              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                              : isOverdue
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : 'text-amber-700 dark:text-amber-400 font-medium'
                          }
                        >
                          {bill.status === 'paid'
                            ? t(lang, 'भुक्तानी सम्पन्न', 'Paid')
                            : getRelativeDueText(bill.dueDate, lang)}
                        </span>
                      </div>

                      {bill.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {bill.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 shrink-0">
                      <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(bill.amount, currency)}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {bill.status === 'unpaid' ? (
                          <button
                            type="button"
                            onClick={() => openPayModal(bill)}
                            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                          >
                            {t(lang, 'भुक्तानी गर्नुहोस्', 'Mark Paid')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => markBillUnpaid(bill.id)}
                            title={t(lang, 'बाँकी अवस्थामा फर्काउनुहोस्', 'Mark Unpaid')}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{t(lang, 'बाँकी राख्ने', 'Unpaid')}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedHistoryId(historyOpen ? null : bill.id)
                          }
                          className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
                          title={t(lang, 'भुक्तानी इतिहास', 'Payment History')}
                        >
                          <History className="w-3.5 h-3.5" />
                          <span className="font-mono tabular-nums">
                            {bill.paymentHistory.length}
                          </span>
                          {historyOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(bill)}
                          aria-label="Edit Bill"
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            requestConfirm({
                              title: t(lang, 'बिल हटाउने हो?', 'Delete Bill?'),
                              message: `"${bill.billName}" ${t(
                                lang,
                                'हटाइनेछ।',
                                'will be permanently deleted.'
                              )}`,
                              confirmLabel: t(lang, 'हटाउनुहोस्', 'Delete'),
                              danger: true,
                              onConfirm: () => deleteBill(bill.id),
                            })
                          }
                          aria-label="Delete Bill"
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Payment History */}
                  {historyOpen && (
                    <div className="pt-3 pl-6 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t(lang, 'भुक्तानी इतिहास (Payment History)', 'Payment History')}
                      </div>
                      {bill.paymentHistory.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t(
                            lang,
                            'अहिलेसम्म कुनै भुक्तानी रेकर्ड छैन।',
                            'No historical payments recorded yet.'
                          )}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {bill.paymentHistory.map((ph) => (
                            <div
                              key={ph.id}
                              className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400"
                            >
                              <span>
                                <span className="font-mono tabular-nums">
                                  {formatDateReadable(ph.paidDate, lang)}
                                </span>{' '}
                                · {PAYMENT_METHOD_LABELS[ph.paymentMethod][lang]}
                                {ph.note ? ` · ${ph.note}` : ''}
                              </span>
                              <span className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(ph.amount, currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Mark Paid Modal */}
      {payingBill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t(lang, 'बिल भुक्तानी पुष्टि गर्नुहोस्', 'Confirm Bill Payment')}
              </h3>
              <button
                type="button"
                onClick={() => setPayingBill(null)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-slate-800/60 space-y-1">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {payingBill.billName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {payingBill.provider} ·{' '}
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(payingBill.amount, currency)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'भुक्तानी माध्यम', 'Payment Method')}
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {PAYMENT_METHOD_LABELS[pm][lang]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'भुक्तानी मिति', 'Payment Date')}
                  </label>
                  <input
                    type="date"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'रसिद नं. / टिपोट', 'Receipt / Reference Note')}
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder={t(lang, 'उदा: eSewa रिफरेन्स नं.', 'e.g., Transaction ID')}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={alsoLogExpense}
                  onChange={(e) => setAlsoLogExpense(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-600"
                />
                <span>
                  {t(
                    lang,
                    'यो रकम "घरको खर्च" खातामा पनि स्वतः थप्नुहोस्',
                    'Also record this payment in Home Finance expenses'
                  )}
                </span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPayingBill(null)}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t(lang, 'रद्द', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white cursor-pointer"
                >
                  {t(lang, 'भुक्तानी सम्पन्न गर्नुहोस्', 'Confirm Paid')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Bill Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingBill
                  ? t(lang, 'बिल सम्पादन गर्नुहोस्', 'Edit Bill')
                  : t(lang, 'नयाँ घरायसी बिल थप्नुहोस्', 'Add Household Bill')}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {formErr && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300">
                  {formErr}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'बिलको नाम *', 'Bill Name *')}
                  </label>
                  <input
                    type="text"
                    value={billName}
                    onChange={(e) => setBillName(e.target.value)}
                    placeholder={t(lang, 'उदा: मासिक बिजुली महसुल', 'e.g., Monthly Electricity')}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'सेवा प्रदायक (Provider)', 'Provider')}
                  </label>
                  <input
                    type="text"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder={t(lang, 'उदा: NEA / KUKL / WorldLink', 'e.g., NEA / KUKL')}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'सेवा प्रकार', 'Category')}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BillCategory)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {BILL_CATEGORIES.map((bc) => (
                      <option key={bc} value={bc}>
                        {BILL_CATEGORY_LABELS[bc][lang]}
                      </option>
                    ))}
                  </select>
                </div>

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
                    {t(lang, 'तिर्ने अन्तिम मिति', 'Due Date')}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'थप टिपोट', 'Notes')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t(lang, 'ग्राहक आईडी वा मिटर नं...', 'Customer ID or meter number...')}
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t(lang, 'रद्द गर्नुहोस्', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white cursor-pointer"
                >
                  {t(lang, 'सुरक्षित गर्नुहोस्', 'Save Bill')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
