import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useHome } from '../context/HomeContext';
import {
  BILL_CATEGORY_LABELS,
  CURRENCY_META,
  EVENT_CATEGORY_LABELS,
  FINANCE_CATEGORY_LABELS,
  getTodayISO,
  MAINTENANCE_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  SHOPPING_CATEGORY_LABELS,
  TASK_PRIORITY_LABELS,
  t,
} from '../i18n/translations';
import {
  BillCategory,
  CalendarSourceType,
  EventCategory,
  FinanceCategory,
  MaintenanceCategory,
  PaymentMethod,
  ShoppingCategory,
  TaskPriority,
} from '../types';

export const GlobalOverlays: React.FC = () => {
  const {
    data,
    quickModal,
    setQuickModal,
    toasts,
    dismissToast,
    confirmState,
    closeConfirm,
    addFinance,
    addBill,
    addShoppingItem,
    addShoppingList,
    addTask,
    addEvent,
    addMaintenance,
  } = useHome();

  const lang = data.settings.language;
  const currencySymbol = CURRENCY_META[data.settings.currency].symbol;

  // Quick form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [nextDate, setNextDate] = useState(getTodayISO());
  const [finCat, setFinCat] = useState<FinanceCategory>('Food');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [provider, setProvider] = useState('');
  const [billCat, setBillCat] = useState<BillCategory>('electricity');
  const [shopListId, setShopListId] = useState('');
  const [quantity, setQuantity] = useState('१ केजी');
  const [shopCat, setShopCat] = useState<ShoppingCategory>('groceries');
  const [memberId, setMemberId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [evtCat, setEvtCat] = useState<EventCategory>('gathering');
  const [evtSource, setEvtSource] = useState<CalendarSourceType>('verified_gregorian');
  const [location, setLocation] = useState('');
  const [maintCat, setMaintCat] = useState<MaintenanceCategory>('repairs');
  const [note, setNote] = useState('');
  const [formErr, setFormErr] = useState('');

  useEffect(() => {
    if (quickModal) {
      setTitle('');
      setAmount('');
      setDate(getTodayISO());
      const plus90 = new Date();
      plus90.setDate(plus90.getDate() + 90);
      setNextDate(plus90.toISOString().slice(0, 10));
      setFinCat(quickModal === 'income' ? 'Salary' : 'Food');
      setPayMethod('Cash');
      setProvider('');
      setBillCat('electricity');
      setShopListId(data.shoppingLists[0]?.id || '');
      setQuantity(lang === 'ne' ? '१ युनिट' : '1 unit');
      setShopCat('groceries');
      setMemberId(data.members[0]?.id || '');
      setPriority('medium');
      setEvtCat('gathering');
      setEvtSource('verified_gregorian');
      setLocation('');
      setMaintCat('repairs');
      setNote('');
      setFormErr('');
    }
  }, [quickModal, data.shoppingLists, data.members, lang]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormErr(t(lang, 'कृपया शीर्षक वा नाम लेख्नुहोस्।', 'Please enter a title or name.'));
      return;
    }

    if (quickModal === 'expense' || quickModal === 'income') {
      const num = Number(amount);
      if (!amount || Number.isNaN(num) || num <= 0) {
        setFormErr(t(lang, 'कृपया मान्य रकम राख्नुहोस्।', 'Please enter a valid positive amount.'));
        return;
      }
      addFinance({
        title: title.trim(),
        amount: num,
        type: quickModal,
        category: finCat,
        date,
        paymentMethod: payMethod,
        note: note.trim(),
      });
    } else if (quickModal === 'bill') {
      const num = Number(amount);
      if (!amount || Number.isNaN(num) || num <= 0) {
        setFormErr(t(lang, 'कृपया मान्य बिल रकम राख्नुहोस्।', 'Please enter a valid bill amount.'));
        return;
      }
      addBill({
        provider: provider.trim() || BILL_CATEGORY_LABELS[billCat][lang],
        billName: title.trim(),
        category: billCat,
        amount: num,
        dueDate: date,
        status: 'unpaid',
        notes: note.trim(),
      });
    } else if (quickModal === 'shopping') {
      const num = Number(amount || '0');
      if (Number.isNaN(num) || num < 0) {
        setFormErr(t(lang, 'कृपया मान्य अनुमानित मूल्य राख्नुहोस्।', 'Please enter a valid estimated price.'));
        return;
      }
      let targetListId = shopListId;
      if (!targetListId) {
        targetListId = addShoppingList(
          t(lang, 'घरायसी किनमेल सूची', 'Household Shopping List'),
          5000
        );
      }
      addShoppingItem(targetListId, {
        product: title.trim(),
        quantity: quantity.trim() || '1',
        estimatedPrice: num,
        category: shopCat,
        purchased: false,
      });
    } else if (quickModal === 'task') {
      addTask({
        title: title.trim(),
        description: note.trim(),
        assignedMemberId: memberId || data.members[0]?.id || '',
        dueDate: date,
        priority,
        status: 'pending',
      });
    } else if (quickModal === 'event') {
      addEvent({
        title: title.trim(),
        date,
        category: evtCat,
        sourceType: evtCat === 'festival' ? 'manual_festival' : evtSource,
        location: location.trim(),
        notes: note.trim(),
      });
    } else if (quickModal === 'maintenance') {
      const num = Number(amount || '0');
      addMaintenance({
        title: title.trim(),
        category: maintCat,
        cost: Number.isNaN(num) || num < 0 ? 0 : num,
        date,
        nextMaintenanceDate: nextDate,
        status: 'scheduled',
        notes: note.trim(),
      });
    }

    setQuickModal(null);
  };

  return (
    <>
      {/* Quick Add Modal */}
      {quickModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {quickModal === 'expense' && t(lang, 'नयाँ खर्च थप्नुहोस्', 'Add Household Expense')}
                {quickModal === 'income' && t(lang, 'नयाँ आम्दानी थप्नुहोस्', 'Add Household Income')}
                {quickModal === 'bill' && t(lang, 'नयाँ बिल रिमाइन्डर', 'Add Bill Reminder')}
                {quickModal === 'shopping' && t(lang, 'किनमेल सामान थप्नुहोस्', 'Add Shopping Item')}
                {quickModal === 'task' && t(lang, 'परिवारको काम थप्नुहोस्', 'Assign Family Task')}
                {quickModal === 'event' && t(lang, 'पारिवारिक कार्यक्रम थप्नुहोस्', 'Add Calendar Event')}
                {quickModal === 'maintenance' && t(lang, 'घर मर्मत विवरण थप्नुहोस्', 'Add Maintenance Record')}
              </h3>
              <button
                type="button"
                onClick={() => setQuickModal(null)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formErr && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300">
                  {formErr}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {quickModal === 'shopping'
                    ? t(lang, 'सामानको नाम *', 'Product Name *')
                    : t(lang, 'शीर्षक / विवरण *', 'Title *')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  placeholder={
                    quickModal === 'expense'
                      ? t(lang, 'उदा: कालीमाटी तरकारी तथा फलफूल', 'e.g., Fresh Vegetables & Groceries')
                      : quickModal === 'bill'
                        ? t(lang, 'उदा: घरको बिजुली महसुल', 'e.g., Monthly Electricity Bill')
                        : quickModal === 'shopping'
                          ? t(lang, 'उदा: जिरा मसिनो चामल', 'e.g., Jeera Masino Rice')
                          : quickModal === 'task'
                            ? t(lang, 'उदा: पानी ट्याङ्की जाँच गर्ने', 'e.g., Check rooftop water tank')
                            : t(lang, 'विवरण लेख्नुहोस्...', 'Enter title...')
                  }
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {(quickModal === 'expense' || quickModal === 'income') && (
                <>
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
                        {t(lang, 'मिति', 'Date')}
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
                        value={finCat}
                        onChange={(e) => setFinCat(e.target.value as FinanceCategory)}
                        className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      >
                        {(Object.keys(FINANCE_CATEGORY_LABELS) as FinanceCategory[]).map((cat) => (
                          <option key={cat} value={cat}>
                            {FINANCE_CATEGORY_LABELS[cat][lang]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t(lang, 'भुक्तानी माध्यम', 'Payment Method')}
                      </label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                        className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      >
                        {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((pm) => (
                          <option key={pm} value={pm}>
                            {PAYMENT_METHOD_LABELS[pm][lang]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {quickModal === 'bill' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t(lang, 'सेवा प्रदायक (Provider)', 'Provider')}
                      </label>
                      <input
                        type="text"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        placeholder={t(lang, 'उदा: NEA / WorldLink / KUKL', 'e.g., NEA / WorldLink')}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t(lang, 'प्रकार', 'Bill Category')}
                      </label>
                      <select
                        value={billCat}
                        onChange={(e) => setBillCat(e.target.value as BillCategory)}
                        className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      >
                        {(Object.keys(BILL_CATEGORY_LABELS) as BillCategory[]).map((bc) => (
                          <option key={bc} value={bc}>
                            {BILL_CATEGORY_LABELS[bc][lang]}
                          </option>
                        ))}
                      </select>
                    </div>
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
                        {t(lang, 'तिर्ने अन्तिम मिति', 'Due Date')}
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {quickModal === 'shopping' && (
                <>
                  {data.shoppingLists.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t(lang, 'किनमेल सूची छान्नुहोस्', 'Select Shopping List')}
                      </label>
                      <select
                        value={shopListId}
                        onChange={(e) => setShopListId(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      >
                        {data.shoppingLists.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t(lang, 'परिमाण', 'Quantity')}
                      </label>
                      <input
                        type="text"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t(lang, `अनुमानित मूल्य (${currencySymbol})`, `Est. Price (${currencySymbol})`)}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t(lang, 'समूह', 'Category')}
                      </label>
                      <select
                        value={shopCat}
                        onChange={(e) => setShopCat(e.target.value as ShoppingCategory)}
                        className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                      >
                        {(Object.keys(SHOPPING_CATEGORY_LABELS) as ShoppingCategory[]).map((sc) => (
                          <option key={sc} value={sc}>
                            {SHOPPING_CATEGORY_LABELS[sc][lang]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {quickModal === 'task' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(lang, 'जिम्मेवार सदस्य', 'Assigned To')}
                    </label>
                    <select
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    >
                      {data.members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(lang, 'सम्पन्न गर्ने मिति', 'Due Date')}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(lang, 'प्राथमिकता', 'Priority')}
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    >
                      {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                        <option key={p} value={p}>
                          {TASK_PRIORITY_LABELS[p][lang]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {quickModal === 'event' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(lang, 'मिति (ग्रेगोरियन)', 'Date (Gregorian)')}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(lang, 'कार्यक्रमको प्रकार', 'Event Type')}
                    </label>
                    <select
                      value={evtCat}
                      onChange={(e) => setEvtCat(e.target.value as EventCategory)}
                      className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    >
                      {(Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]).map((ec) => (
                        <option key={ec} value={ec}>
                          {EVENT_CATEGORY_LABELS[ec][lang]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(lang, 'स्थान', 'Location')}
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={t(lang, 'उदा: घरमै / क्लिनिक / स्कूल', 'e.g., Home / School')}
                      className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {quickModal === 'maintenance' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(lang, 'मर्मत विधा', 'Category')}
                    </label>
                    <select
                      value={maintCat}
                      onChange={(e) => setMaintCat(e.target.value as MaintenanceCategory)}
                      className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    >
                      {(Object.keys(MAINTENANCE_CATEGORY_LABELS) as MaintenanceCategory[]).map(
                        (mc) => (
                          <option key={mc} value={mc}>
                            {MAINTENANCE_CATEGORY_LABELS[mc][lang]}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(lang, `अनुमानित लागत (${currencySymbol})`, `Cost (${currencySymbol})`)}
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
                      {t(lang, 'पछिल्लो मर्मत मिति', 'Service Date')}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t(lang, 'अर्को मर्मत मिति', 'Next Maintenance Date')}
                    </label>
                    <input
                      type="date"
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {quickModal !== 'shopping' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'थप टिपोट (ऐच्छिक)', 'Notes (Optional)')}
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t(lang, 'रद्द गर्नुहोस्', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white cursor-pointer"
                >
                  {t(lang, 'सुरक्षित गर्नुहोस्', 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog (Replaces window.confirm) */}
      {confirmState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmState.danger
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {confirmState.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {confirmState.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t(lang, 'रद्द गर्नुहोस्', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmState.onConfirm();
                  closeConfirm();
                }}
                className={`min-h-[42px] px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer ${
                  confirmState.danger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-900 dark:bg-emerald-600 hover:opacity-90'
                }`}
              >
                {confirmState.confirmLabel || t(lang, 'पक्का गर्नुहोस्', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friendly Toast Stack */}
      <div
        aria-live="polite"
        className="no-print fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-lg border border-slate-700 text-xs sm:text-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              {toast.type === 'warning' && (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              {toast.type === 'error' && (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              {toast.type === 'info' && (
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
              )}
              <span className="leading-snug">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 shrink-0 cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
};
