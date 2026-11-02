import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ClipboardList,
  HelpCircle,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import {
  BILL_CATEGORY_LABELS,
  FINANCE_CATEGORY_LABELS,
  formatCurrency,
  formatDateReadable,
  getTodayISO,
  t,
} from '../i18n/translations';
import {
  BillCategory,
  EventCategory,
  FinanceCategory,
  MaintenanceCategory,
  PaymentMethod,
  ShoppingCategory,
  TaskPriority,
} from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface ParsedEntryItem {
  id: string;
  entryType:
    | 'expense'
    | 'income'
    | 'bill'
    | 'shopping'
    | 'task'
    | 'event'
    | 'maintenance';
  title: string;
  amount: number;
  date: string;
  financeCategory?: string;
  paymentMethod?: string;
  provider?: string;
  billCategory?: string;
  quantity?: string;
  shoppingCategory?: string;
  assignedMemberName?: string;
  taskPriority?: string;
  eventCategory?: string;
  maintenanceCategory?: string;
  note?: string;
  saved?: boolean;
}

interface MonthlyAIPlan {
  headline: string;
  budgetHealthSummary: string;
  savingsTips: string[];
  thisWeekPriorities: string[];
}

const VALID_FINANCE_CATS: FinanceCategory[] = [
  'Food',
  'Rent',
  'Education',
  'Health',
  'Transport',
  'Shopping',
  'Electricity',
  'Water',
  'Internet',
  'Salary',
  'Business',
  'Other',
];

const VALID_PAY_METHODS: PaymentMethod[] = [
  'Cash',
  'eSewa / Khalti',
  'Bank Transfer',
  'Card',
  'Cheque',
];

const VALID_BILL_CATS: BillCategory[] = [
  'electricity',
  'water',
  'internet',
  'telephone',
  'rent',
  'school_fees',
  'other',
];

const VALID_SHOP_CATS: ShoppingCategory[] = [
  'groceries',
  'vegetables',
  'dairy',
  'household',
  'festival',
  'health',
  'other',
];

const VALID_PRIORITIES: TaskPriority[] = ['high', 'medium', 'low'];

const VALID_EVENT_CATS: EventCategory[] = [
  'birthday',
  'anniversary',
  'school',
  'appointment',
  'festival',
  'gathering',
];

const VALID_MAINT_CATS: MaintenanceCategory[] = [
  'cleaning',
  'plumbing',
  'electricity',
  'painting',
  'appliance',
  'gardening',
  'repairs',
];

export const AssistantView: React.FC = () => {
  const {
    data,
    addFinance,
    addBill,
    addShoppingList,
    addShoppingItem,
    addTask,
    addEvent,
    addMaintenance,
    addToast,
  } = useHome();

  const lang = data.settings.language;
  const currency = data.settings.currency;
  const todayISO = getTodayISO();
  const currentMonth = todayISO.slice(0, 7);

  const [activeTab, setActiveTab] = useState<'chat' | 'quick_entry' | 'plan'>('chat');
  const [includeHouseholdContext, setIncludeHouseholdContext] = useState(true);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Smart Quick-Entry State
  const [rawEntryText, setRawEntryText] = useState('');
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseSummary, setParseSummary] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedEntryItem[]>([]);

  // Monthly Action Plan State
  const [planData, setPlanData] = useState<MonthlyAIPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');

  // Build concise, privacy-respecting live household summary context
  const householdSummaryPayload = useMemo(() => {
    const monthFinances = data.finances.filter((f) => f.date.startsWith(currentMonth));
    const monthIncome = monthFinances
      .filter((f) => f.type === 'income')
      .reduce((s, f) => s + f.amount, 0);
    const monthExpense = monthFinances
      .filter((f) => f.type === 'expense')
      .reduce((s, f) => s + f.amount, 0);

    const categoryTotals: Record<string, number> = {};
    monthFinances
      .filter((f) => f.type === 'expense')
      .forEach((f) => {
        categoryTotals[f.category] = (categoryTotals[f.category] || 0) + f.amount;
      });

    const unpaidBills = data.bills
      .filter((b) => b.status === 'unpaid')
      .map((b) => ({
        billName: b.billName,
        provider: b.provider,
        amount: b.amount,
        dueDate: b.dueDate,
      }));

    const pendingTasks = data.tasks
      .filter((tk) => tk.status !== 'completed')
      .map((tk) => ({
        title: tk.title,
        dueDate: tk.dueDate,
        priority: tk.priority,
        status: tk.status,
      }));

    const unpurchasedShopping = data.shoppingLists.map((l) => ({
      listName: l.name,
      budget: l.budget,
      pendingEstimate: l.items
        .filter((i) => !i.purchased)
        .reduce((s, i) => s + i.estimatedPrice, 0),
      pendingItemCount: l.items.filter((i) => !i.purchased).length,
    }));

    const pendingMaintenance = data.maintenance
      .filter((m) => m.status !== 'completed')
      .map((m) => ({
        title: m.title,
        nextMaintenanceDate: m.nextMaintenanceDate,
        cost: m.cost,
        status: m.status,
      }));

    return {
      todayISO,
      householdName: data.settings.householdName,
      currency,
      monthlyBudget: data.settings.monthlyBudget,
      currentMonthIncome: monthIncome,
      currentMonthExpense: monthExpense,
      budgetUsedPercent:
        data.settings.monthlyBudget > 0
          ? Number(((monthExpense / data.settings.monthlyBudget) * 100).toFixed(1))
          : 0,
      expensesByCategory: categoryTotals,
      unpaidBills,
      pendingTasks,
      shoppingLists: unpurchasedShopping,
      pendingMaintenance,
    };
  }, [data, currentMonth, currency, todayISO]);

  const starterPrompts = useMemo(
    () =>
      lang === 'ne'
        ? [
            'यो एपमा रसिद स्क्यान र विधागत बजेट सीमा कसरी प्रयोग गर्ने?',
            'यस महिनाको बजेट र खर्च हेर्दा कहाँ बचत गर्न सकिन्छ?',
            'हाम्रो तिर्न बाँकी बिल र अर्जेन्ट कामहरूको प्राथमिकता सूची बनाइदिनुहोस्।',
            'डाटा ब्याकअप (JSON) र मासिक रिपोर्ट प्रिन्ट कसरी गर्ने?',
          ]
        : [
            'How do I scan receipts and set category budget limits in this app?',
            'Based on our monthly budget and spending, where can we save most effectively?',
            'Prioritize our unpaid utility bills and pending family chores for this week.',
            'How do I export reports or back up my household data as JSON?',
          ],
    [lang]
  );

  const sendChatMessage = async (promptText?: string) => {
    const cleanText = (promptText ?? chatInput).trim();
    if (!cleanText || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: cleanText,
    };

    const historyPayload = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setChatInput('');
    setChatError('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: cleanText,
          language: lang,
          history: historyPayload,
          householdContext: includeHouseholdContext ? householdSummaryPayload : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to get AI response');
      }

      const modelMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: json.reply || t(lang, 'कुनै उत्तर प्राप्त भएन।', 'No response received.'),
      };
      setMessages((prev) => [...prev, modelMsg]);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : String(err));
    } finally {
      setChatLoading(false);
    }
  };

  const handleParseNaturalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawEntryText.trim() || parseLoading) return;
    setParseError('');
    setParseSummary('');
    setParsedItems([]);
    setParseLoading(true);

    try {
      const res = await fetch('/api/ai/parse-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawEntryText.trim(),
          language: lang,
          todayISO,
          currency,
          memberNames: data.members.map((m) => m.name),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to parse household entry');
      }

      const items: ParsedEntryItem[] = Array.isArray(json.items)
        ? json.items.map((item: Omit<ParsedEntryItem, 'id'>, idx: number) => ({
            ...item,
            id: `parsed-${Date.now()}-${idx}`,
            date:
              typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
                ? item.date
                : todayISO,
            amount: typeof item.amount === 'number' && item.amount >= 0 ? item.amount : 0,
            saved: false,
          }))
        : [];

      setParseSummary(String(json.summary || ''));
      setParsedItems(items);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    } finally {
      setParseLoading(false);
    }
  };

  const commitParsedItem = (item: ParsedEntryItem) => {
    if (item.saved) return;

    const safeFinCat = VALID_FINANCE_CATS.includes(item.financeCategory as FinanceCategory)
      ? (item.financeCategory as FinanceCategory)
      : item.entryType === 'income'
        ? 'Salary'
        : 'Other';

    const safePayMethod = VALID_PAY_METHODS.includes(item.paymentMethod as PaymentMethod)
      ? (item.paymentMethod as PaymentMethod)
      : 'Cash';

    if (item.entryType === 'expense' || item.entryType === 'income') {
      addFinance({
        title: item.title,
        amount: item.amount > 0 ? item.amount : 100,
        type: item.entryType,
        category: safeFinCat,
        date: item.date,
        paymentMethod: safePayMethod,
        note: item.note || '',
      });
    } else if (item.entryType === 'bill') {
      const safeBillCat = VALID_BILL_CATS.includes(item.billCategory as BillCategory)
        ? (item.billCategory as BillCategory)
        : 'other';
      addBill({
        provider: item.provider || BILL_CATEGORY_LABELS[safeBillCat][lang],
        billName: item.title,
        category: safeBillCat,
        amount: item.amount > 0 ? item.amount : 500,
        dueDate: item.date,
        status: 'unpaid',
        notes: item.note || '',
      });
    } else if (item.entryType === 'shopping') {
      const safeShopCat = VALID_SHOP_CATS.includes(item.shoppingCategory as ShoppingCategory)
        ? (item.shoppingCategory as ShoppingCategory)
        : 'groceries';
      const targetListId =
        data.shoppingLists[0]?.id ||
        addShoppingList(
          t(lang, 'घरायसी किनमेल सूची', 'Household Shopping List'),
          6000
        );
      addShoppingItem(targetListId, {
        product: item.title,
        quantity: item.quantity || '1',
        estimatedPrice: item.amount,
        category: safeShopCat,
        purchased: false,
      });
    } else if (item.entryType === 'task') {
      const safePrio = VALID_PRIORITIES.includes(item.taskPriority as TaskPriority)
        ? (item.taskPriority as TaskPriority)
        : 'medium';
      const matchedMember = data.members.find(
        (m) =>
          item.assignedMemberName &&
          m.name.toLowerCase().includes(item.assignedMemberName.toLowerCase())
      );
      addTask({
        title: item.title,
        description: item.note || '',
        assignedMemberId: matchedMember?.id || data.members[0]?.id || '',
        dueDate: item.date,
        priority: safePrio,
        status: 'pending',
      });
    } else if (item.entryType === 'event') {
      const safeEvtCat = VALID_EVENT_CATS.includes(item.eventCategory as EventCategory)
        ? (item.eventCategory as EventCategory)
        : 'gathering';
      addEvent({
        title: item.title,
        date: item.date,
        category: safeEvtCat,
        sourceType: safeEvtCat === 'festival' ? 'manual_festival' : 'verified_gregorian',
        location: item.note || '',
        notes: '',
      });
    } else if (item.entryType === 'maintenance') {
      const safeMaintCat = VALID_MAINT_CATS.includes(
        item.maintenanceCategory as MaintenanceCategory
      )
        ? (item.maintenanceCategory as MaintenanceCategory)
        : 'repairs';
      const nextDate = new Date(item.date + 'T00:00:00');
      nextDate.setDate(nextDate.getDate() + 90);
      addMaintenance({
        title: item.title,
        category: safeMaintCat,
        cost: item.amount,
        date: todayISO,
        nextMaintenanceDate: item.date > todayISO ? item.date : nextDate.toISOString().slice(0, 10),
        status: 'scheduled',
        notes: item.note || '',
      });
    }

    setParsedItems((prev) =>
      prev.map((pi) => (pi.id === item.id ? { ...pi, saved: true } : pi))
    );
  };

  const commitAllParsedItems = () => {
    const unsaved = parsedItems.filter((i) => !i.saved);
    unsaved.forEach((item) => commitParsedItem(item));
    if (unsaved.length > 1) {
      addToast(
        t(
          lang,
          `${unsaved.length} वटा विवरणहरू सफलतापूर्वक खातामा थपिए!`,
          `Added all ${unsaved.length} items to your household!`
        ),
        'success'
      );
    }
  };

  const generateMonthlyPlan = async () => {
    if (planLoading) return;
    setPlanError('');
    setPlanLoading(true);
    try {
      const res = await fetch('/api/ai/monthly-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: lang,
          householdContext: householdSummaryPayload,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Could not generate monthly plan');
      }
      setPlanData(json as MonthlyAIPlan);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : String(err));
    } finally {
      setPlanLoading(false);
    }
  };

  const getEntryTypeLabel = (type: ParsedEntryItem['entryType']) => {
    const labels: Record<ParsedEntryItem['entryType'], { ne: string; en: string }> = {
      expense: { ne: 'घर खर्च', en: 'Expense' },
      income: { ne: 'आम्दानी', en: 'Income' },
      bill: { ne: 'बिल रिमाइन्डर', en: 'Utility Bill' },
      shopping: { ne: 'किनमेल सामान', en: 'Shopping Item' },
      task: { ne: 'घरायसी काम', en: 'Family Task' },
      event: { ne: 'क्यालेन्डर कार्यक्रम', en: 'Calendar Event' },
      maintenance: { ne: 'घर मर्मत', en: 'Maintenance' },
    };
    return labels[type][lang];
  };

  return (
    <div className="space-y-6">
      {/* Vibrant Himalayan AI Focal Banner */}
      <section className="vibe-hero-surface rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 w-64 h-64 rounded-full bg-emerald-400/15 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-24 -bottom-16 w-52 h-52 rounded-full bg-rose-500/15 blur-2xl"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300 tracking-wide">
              <HelpCircle className="w-4 h-4" />
              <span>
                {t(
                  lang,
                  'सहायता केन्द्र · स्मार्ट AI गृह सहायक (Help & AI Assistance)',
                  'Help Center · Smart Household AI Assistance'
                )}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight [text-wrap:balance]">
              {t(
                lang,
                'सहायता, AI परामर्श र द्रुत घरायसी टिपोट',
                'App Help, Family AI Assistance & Smart Quick Entry'
              )}
            </h2>
            <p className="text-sm text-emerald-50/85 leading-relaxed">
              {t(
                lang,
                'एपका फिचरहरूबारे सहायता लिनुहोस्, बजेट बचत सल्लाह पाउनुहोस्, वा सामान्य नेपाली/अंग्रेजी वाक्य लेखेरै खर्च, बिल र कामहरू स्वतः थप्नुहोस्।',
                'Get instant help with any feature in Digital Home Nepal, ask personalized budget questions, or type everyday sentences to log expenses, bills, and chores.'
              )}
            </p>
          </div>

          {/* Interactive Mode Switcher */}
          <div className="flex items-center p-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 self-start lg:self-center overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-white/85 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>{t(lang, 'AI सल्लाहकार च्याट', 'AI Advisor Chat')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quick_entry')}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'quick_entry'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-white/85 hover:text-white hover:bg-white/5'
              }`}
            >
              <Wand2 className="w-4 h-4 shrink-0" />
              <span>{t(lang, 'वाक्यबाट द्रुत टिपोट', 'Smart Quick Entry')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'plan'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-white/85 hover:text-white hover:bg-white/5'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>{t(lang, 'मासिक कार्ययोजना', 'Monthly Plan')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* TAB 1: CONVERSATIONAL AI ADVISOR */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <section className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 flex flex-col min-h-[500px]">
            {/* Chat Header */}
            <div className="px-5 py-4 border-b border-stone-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {t(lang, 'डिजिटल होम AI परामर्शदाता', 'Digital Home AI Advisor')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t(
                      lang,
                      'नेपाली वा अंग्रेजी दुवै भाषामा प्रश्न सोध्न सक्नुहुन्छ',
                      'Ask questions naturally in Nepali or English'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHouseholdContext}
                    onChange={(e) => setIncludeHouseholdContext(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-600"
                  />
                  <span>
                    {t(lang, 'घरायसी डाटा सन्दर्भ जोड्नुहोस्', 'Share household summary')}
                  </span>
                </label>

                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setChatError('');
                    }}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t(lang, 'सफा', 'Clear')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[460px]">
              {messages.length === 0 ? (
                <div className="py-8 space-y-5">
                  <div className="text-center space-y-1.5 max-w-md mx-auto">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {t(
                        lang,
                        `नमस्ते ${data.settings.householdName}! आज म कसरी सहयोग गरूँ?`,
                        `Namaste ${data.settings.householdName}! How can I help your household today?`
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t(
                        lang,
                        'तलका उदाहरण प्रश्नहरू मध्ये कुनै एक छान्नुहोस् वा आफ्नै प्रश्न लेख्नुहोस्:',
                        'Pick a suggested question below or type your own:'
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {starterPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendChatMessage(prompt)}
                        className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/50 hover:border-emerald-500/60 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/25 text-left text-xs sm:text-sm text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-stone-200/70 dark:border-slate-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 bg-stone-100 dark:bg-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>
                      {t(
                        lang,
                        'AI सहायकले विश्लेषण गर्दैछ...',
                        'Analyzing your household request...'
                      )}
                    </span>
                  </div>
                </div>
              )}

              {chatError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{chatError}</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChatMessage();
              }}
              className="p-4 border-t border-stone-200/80 dark:border-slate-800 flex items-center gap-2.5"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t(
                  lang,
                  'खर्च, बिल, बचत वा घरायसी योजनाबारे सोध्नुहोस्...',
                  'Ask about your budget, bills, savings, or meal & home planning...'
                )}
                className="flex-1 h-11 px-4 rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{t(lang, 'पठाउनुहोस्', 'Send')}</span>
              </button>
            </form>
          </section>

          {/* Right Context Snapshot Sidebar */}
          <aside className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t(lang, 'सक्रिय घरायसी सारांश', 'Live Household Snapshot')}
            </h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {t(lang, 'मासिक बजेट', 'Monthly Budget')}
                </span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(householdSummaryPayload.monthlyBudget, currency)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {t(lang, 'यस महिना खर्च', 'Spent This Month')}
                </span>
                <span className="font-mono font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                  {formatCurrency(householdSummaryPayload.currentMonthExpense, currency)} (
                  {householdSummaryPayload.budgetUsedPercent}%)
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {t(lang, 'तिर्न बाँकी बिल', 'Unpaid Bills')}
                </span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  {householdSummaryPayload.unpaidBills.length}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {t(lang, 'बाँकी घरायसी काम', 'Pending Chores')}
                </span>
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  {householdSummaryPayload.pendingTasks.length}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p>
                {t(
                  lang,
                  'गोपनीयता नियन्त्रण: तपाईंको मुख्य डाटा डिभाइसकै localStorage मा रहन्छ। माथिको चेकबक्स अन हुँदा मात्र AI जवाफका लागि सारांश प्रयोग हुन्छ।',
                  'Privacy Control: Your database stays in local browser storage. Summary figures are only shared with the AI Assistant when you send a prompt with the toggle enabled.'
                )}
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* TAB 2: SMART NATURAL-LANGUAGE QUICK ENTRY */}
      {activeTab === 'quick_entry' && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-6 space-y-5">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {t(
                lang,
                'सामान्य वाक्य लेख्नुहोस् — AI ले स्वतः छुट्याएर तयार गर्छ',
                'Type Naturally — AI Extracts Structured Household Records'
              )}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {t(
                lang,
                'उदाहरण: "आज भाटभटेनीमा रासन किन्दा ४२०० खर्च भयो कार्डबाट, र भोलि आरवले पानी ट्याङ्की सफा गर्ने"',
                'Example: "Spent 4200 on groceries at Bhatbhateni by card today, and assign Aarav to check rooftop tank tomorrow"'
              )}
            </p>
          </div>

          <form onSubmit={handleParseNaturalEntry} className="space-y-3">
            <textarea
              rows={3}
              value={rawEntryText}
              onChange={(e) => setRawEntryText(e.target.value)}
              placeholder={t(
                lang,
                'यहाँ नेपाली वा अंग्रेजीमा खर्च, आम्दानी, बिल, किनमेल वा कामको वाक्य लेख्नुहोस्...',
                'Write one or more expenses, bills, shopping items, tasks, or events in plain Nepali or English...'
              )}
              className="w-full p-4 rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setRawEntryText(
                      lang === 'ne'
                        ? 'आज कालीमाटीमा तरकारी र फलफूल किन्दा १८५० नगद खर्च भयो, र ५ दिनपछि WorldLink इन्टरनेट बिल १६५० तिर्नुपर्नेछ।'
                        : 'Spent 1850 cash on vegetables and fruits today, and WorldLink internet bill of 1650 is due in 5 days.'
                    )
                  }
                  className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {t(lang, '+ उदाहरण वाक्य राख्नुहोस्', '+ Try sample sentence')}
                </button>
              </div>

              <button
                type="submit"
                disabled={parseLoading || !rawEntryText.trim()}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                {parseLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span>
                  {t(lang, 'AI बाट विवरण निकाल्नुहोस्', 'Extract Structured Items')}
                </span>
              </button>
            </div>
          </form>

          {parseError && (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedItems.length > 0 && (
            <div className="pt-4 border-t border-stone-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {parseSummary ||
                    t(lang, 'पहिचान गरिएका विवरणहरू:', 'Extracted Household Entries:')}
                </p>
                {parsedItems.some((i) => !i.saved) && parsedItems.length > 1 && (
                  <button
                    type="button"
                    onClick={commitAllParsedItems}
                    className="min-h-[38px] px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t(lang, 'सबै खातामा थप्नुहोस्', 'Save All to Household')}</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-stone-100 dark:divide-slate-800">
                {parsedItems.map((item) => (
                  <div
                    key={item.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {getEntryTypeLabel(item.entryType)}
                        </span>
                        {item.financeCategory &&
                          VALID_FINANCE_CATS.includes(
                            item.financeCategory as FinanceCategory
                          ) && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>
                                {
                                  FINANCE_CATEGORY_LABELS[
                                    item.financeCategory as FinanceCategory
                                  ][lang]
                                }
                              </span>
                            </>
                          )}
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {formatDateReadable(item.date, lang)}
                        </span>
                        {item.amount > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                              {formatCurrency(item.amount, currency)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={item.saved}
                      onClick={() => commitParsedItem(item)}
                      className={`self-start sm:self-center min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        item.saved
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {item.saved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{t(lang, 'थपियो', 'Saved')}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t(lang, 'खातामा थप्नुहोस्', 'Add to Household')}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: AI MONTHLY HOUSEHOLD ACTION PLAN */}
      {activeTab === 'plan' && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t(
                  lang,
                  'मासिक पारिवारिक बजेट तथा कार्ययोजना',
                  'AI Monthly Household Briefing & Savings Plan'
                )}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {t(
                  lang,
                  'तपाईंको हालको आम्दानी, खर्च, बाँकी बिल र कामहरूको आधारमा तयार पारिएको व्यावहारिक योजना',
                  'Tailored guidance synthesized from your current budget pace, bills, shopping lists, and chores'
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={generateMonthlyPlan}
              disabled={planLoading}
              className="self-start sm:self-auto min-h-[42px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {planLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>
                {planData
                  ? t(lang, 'पुनः अद्यावधिक गर्नुहोस्', 'Refresh Action Plan')
                  : t(lang, 'कार्ययोजना तयार गर्नुहोस्', 'Generate Monthly Plan')}
              </span>
            </button>
          </div>

          {planError && (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{planError}</span>
            </div>
          )}

          {!planData && !planLoading && !planError && (
            <div className="py-10 text-center space-y-2 max-w-md mx-auto">
              <ClipboardList className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t(
                  lang,
                  'एक क्लिकमा यस महिनाको स्मार्ट घरायसी योजना बनाउनुहोस्',
                  'Generate your personalized monthly household strategy in one click'
                )}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(
                  lang,
                  'AI ले तपाईंको बजेट सीमा, खर्च विधा र बाँकी कामहरूको समीक्षा गरी ३ मुख्य बचत उपाय र साप्ताहिक प्राथमिकता दिनेछ।',
                  'The AI Assistant reviews your live budget utilization, top expense categories, and upcoming bills to suggest concrete next steps.'
                )}
              </p>
            </div>
          )}

          {planLoading && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {t(
                  lang,
                  'तपाईंको पारिवारिक कार्ययोजना तयार हुँदैछ...',
                  'Crafting your monthly household action plan...'
                )}
              </p>
            </div>
          )}

          {planData && !planLoading && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/70 space-y-1.5">
                <h4 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                  {planData.headline}
                </h4>
                <p className="text-xs sm:text-sm text-emerald-900/90 dark:text-emerald-300 leading-relaxed">
                  {planData.budgetHealthSummary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t(lang, 'बचत तथा खर्च सुधारका उपायहरू', 'Smart Savings Opportunities')}
                  </h4>
                  <div className="divide-y divide-stone-100 dark:divide-slate-800">
                    {planData.savingsTips.map((tip, i) => (
                      <div
                        key={i}
                        className="py-3 first:pt-0 text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2.5 leading-relaxed"
                      >
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          0{i + 1}.
                        </span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t(lang, 'यो साताका प्रमुख प्राथमिकताहरू', 'This Week’s Priority Actions')}
                  </h4>
                  <div className="divide-y divide-stone-100 dark:divide-slate-800">
                    {planData.thisWeekPriorities.map((prio, i) => (
                      <div
                        key={i}
                        className="py-3 first:pt-0 text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2.5 leading-relaxed"
                      >
                        <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span>{prio}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
