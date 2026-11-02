import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  HelpCircle,
  Lightbulb,
  Plus,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import {
  BILL_CATEGORY_LABELS,
  diffDaysFromToday,
  EVENT_CATEGORY_LABELS,
  FINANCE_CATEGORY_LABELS,
  formatCurrency,
  formatDateReadable,
  getRelativeDueText,
  getTodayISO,
  t,
} from '../i18n/translations';
import { generateLocalHouseholdInsights } from '../utils/insights';
import nepaliSmartHomeClear from '../assets/images/nepali_smart_home_clear_1793619332675.jpg';

export const DashboardView: React.FC = () => {
  const {
    data,
    setActiveSection,
    setQuickModal,
    cycleTaskStatus,
  } = useHome();

  const lang = data.settings.language;
  const currency = data.settings.currency;
  const todayISO = getTodayISO();
  const currentMonth = todayISO.slice(0, 7);

  // Real calculated financial figures
  const monthFinances = data.finances.filter((f) => f.date.startsWith(currentMonth));
  const monthIncome = monthFinances
    .filter((f) => f.type === 'income')
    .reduce((sum, f) => sum + f.amount, 0);
  const monthExpense = monthFinances
    .filter((f) => f.type === 'expense')
    .reduce((sum, f) => sum + f.amount, 0);

  const monthlyBudget = data.settings.monthlyBudget;
  const remainingBudget = monthlyBudget - monthExpense;
  const budgetPct =
    monthlyBudget > 0 ? Math.min(100, Math.round((monthExpense / monthlyBudget) * 100)) : 0;
  const isOverBudget = remainingBudget < 0;

  // Pending & overdue bills
  const pendingBills = data.bills
    .filter((b) => b.status === 'unpaid')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const pendingBillsTotal = pendingBills.reduce((s, b) => s + b.amount, 0);
  const overdueCount = pendingBills.filter((b) => diffDaysFromToday(b.dueDate) < 0).length;

  // Today's & urgent tasks
  const activeTasks = data.tasks
    .filter((tk) => tk.status !== 'completed')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const completedTasksCount = data.tasks.filter((tk) => tk.status === 'completed').length;

  // Upcoming events (today or future)
  const upcomingEvents = data.events
    .filter((e) => diffDaysFromToday(e.date) >= -1)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  // Shopping summary
  const unpurchasedItems = data.shoppingLists.flatMap((list) =>
    list.items
      .filter((i) => !i.purchased)
      .map((item) => ({ ...item, listName: list.name, listId: list.id }))
  );
  const unpurchasedEstimate = unpurchasedItems.reduce((s, i) => s + i.estimatedPrice, 0);

  // Maintenance alerts
  const upcomingMaintenance = data.maintenance
    .filter(
      (m) =>
        m.status === 'needs_attention' ||
        (m.status !== 'completed' && diffDaysFromToday(m.nextMaintenanceDate) <= 14)
    )
    .sort((a, b) => a.nextMaintenanceDate.localeCompare(b.nextMaintenanceDate));

  // Recent finance activity
  const recentFinances = [...data.finances]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // Smart Family Assistant Local Insights
  const insights = generateLocalHouseholdInsights(data, lang);

  const getMemberName = (id: string) =>
    data.members.find((m) => m.id === id)?.name || t(lang, 'परिवार सदस्य', 'Family Member');

  return (
    <div className="space-y-8">
      {/* Personalized Welcome Hero: Split Layout with Dedicated Unobstructed Image (Zero Overlay) */}
      <section className="vibe-hero-surface relative overflow-hidden rounded-2xl border border-emerald-900/30 dark:border-emerald-800/40 p-6 sm:p-8 text-white shadow-sm">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left 7 Columns: Greeting, Quick Actions & Family Members */}
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold tracking-wide text-amber-300">
                {t(
                  lang,
                  `नमस्ते · ${formatDateReadable(todayISO, lang)}`,
                  `Namaste · ${formatDateReadable(todayISO, lang)}`
                )}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white [text-wrap:balance]">
                {t(
                  lang,
                  `${data.settings.householdName} को डिजिटल गृहपृष्ठ`,
                  `Welcome home, ${data.settings.householdName}`
                )}
              </h2>
              <p className="text-sm text-emerald-100/85 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-300" />
                  <span className="tabular-nums">
                    {data.members.length} {t(lang, 'सदस्यहरू', 'family members')}
                  </span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {pendingBills.length} {t(lang, 'बाँकी बिल', 'pending bills')}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {activeTasks.length} {t(lang, 'सक्रिय काम', 'active tasks')}
                </span>
              </p>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setQuickModal('expense')}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t(lang, 'खर्च थप्नुहोस्', 'Add Expense')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('assistant')}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/45 text-amber-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-amber-300" />
                <span>{t(lang, 'सहायता · AI सहायक', 'Help · AI Assistance')}</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickModal('bill')}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-emerald-200" />
                <span>{t(lang, 'बिल', 'Add Bill')}</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickModal('task')}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>{t(lang, 'काम', 'Add Task')}</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickModal('shopping')}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-200" />
                <span>{t(lang, 'किनमेल', 'Shopping')}</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickModal('event')}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <CalendarDays className="w-4 h-4 text-emerald-200" />
                <span>{t(lang, 'कार्यक्रम', 'Event')}</span>
              </button>
            </div>

            {/* Family Member Avatars Strip */}
            <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {data.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 ring-2 ring-white/20"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.name.slice(0, 1)}
                    </div>
                    <div className="text-xs">
                      <div className="font-semibold text-white">
                        {member.name}
                      </div>
                      <div className="text-emerald-100/75">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('settings')}
                className="text-xs font-semibold text-amber-300 hover:text-amber-200 hover:underline whitespace-nowrap cursor-pointer"
              >
                {t(lang, 'सदस्य व्यवस्थापन →', 'Manage Members →')}
              </button>
            </div>
          </div>

          {/* Right 5 Columns: Dedicated Crystal-Clear Showcase Photograph — ZERO Overlay */}
          <div className="lg:col-span-5">
            <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/20 shadow-sm bg-slate-900">
              <img
                src={nepaliSmartHomeClear}
                alt={t(
                  lang,
                  'हिमाली दृश्यसहितको उज्यालो र सुन्दर नेपाली पारिवारिक घर',
                  'Bright sunlit Nepali family home courtyard overlooking snow-capped Himalayan peaks'
                )}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Primary KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{t(lang, 'मासिक घर बजेट', 'Monthly Budget')}</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(monthlyBudget, currency)}
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="relative h-2 w-full rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverBudget
                    ? 'bg-gradient-to-r from-rose-600 to-red-500'
                    : budgetPct >= 80
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-500'
                }`}
                style={{ width: `${budgetPct}%` }}
              />
              <span
                aria-hidden="true"
                className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-slate-900/25 dark:bg-white/30"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {t(
                lang,
                `यस महिना ${budgetPct}% बजेट प्रयोग · आम्दानी ${formatCurrency(monthIncome, currency)}`,
                `${budgetPct}% used · Income ${formatCurrency(monthIncome, currency)}`
              )}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{t(lang, 'यस महिनाको खर्च', 'Expenses This Month')}</span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(monthExpense, currency)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {monthFinances.filter((f) => f.type === 'expense').length}{' '}
            {t(lang, 'वटा खर्च कारोबार दर्ता', 'expense entries this month')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>
              {isOverBudget
                ? t(lang, 'बजेट नाघेको रकम', 'Over Budget By')
                : t(lang, 'बाँकी मासिक बजेट', 'Remaining Budget')}
            </span>
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isOverBudget
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              isOverBudget
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {formatCurrency(Math.abs(remainingBudget), currency)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isOverBudget
              ? t(lang, 'बजेट सीमाभन्दा बढी खर्च भएको छ', 'Exceeds monthly target')
              : t(lang, 'तोकिएको बजेट सीमाभित्र सुरक्षित', 'Safely within target')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{t(lang, 'तिर्न बाँकी बिलहरू', 'Pending Bills')}</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(pendingBillsTotal, currency)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {overdueCount > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                {overdueCount} {t(lang, 'वटा म्याद नाघेको', 'overdue')} ·{' '}
              </span>
            ) : null}
            {pendingBills.length} {t(lang, 'वटा बिल बाँकी', 'unpaid bills')}
          </p>
        </div>
      </section>

      {/* Smart Family Assistant (Local Data-Driven Insights + AI Advisor Link) */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-stone-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-950/60 dark:to-amber-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/50">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t(lang, 'स्मार्ट पारिवारिक सहायक (सुझावहरू)', 'Smart Family Insights')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(
                  lang,
                  'तपाईंको घरायसी डाटाको विश्लेषण र AI पारिवारिक सल्लाहकार',
                  'Instant local household checks plus conversational AI coaching'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveSection('assistant')}
            className="self-start sm:self-auto min-h-[38px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>{t(lang, 'AI सल्लाहकार खोल्नुहोस् →', 'Open AI Assistant →')}</span>
          </button>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-slate-800">
          {insights.slice(0, 4).map((ins) => (
            <div
              key={ins.id}
              className="py-4 first:pt-4 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {ins.severity === 'urgent' && (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  {ins.severity === 'warning' && (
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  {ins.severity === 'positive' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {ins.severity === 'info' && (
                    <Lightbulb className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  )}
                  <span>{ins.title}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {ins.suggestion}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection(ins.targetSection)}
                className="self-start sm:self-center inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer py-1"
              >
                <span>{ins.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Two-Column Grid: Pending Bills & Family Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Bills */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t(lang, 'आगामी तथा बाँकी बिलहरू', 'Pending & Overdue Bills')}
              </h3>
              <button
                type="button"
                onClick={() => setActiveSection('bills')}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap cursor-pointer"
              >
                {t(lang, 'सबै हेर्नुहोस्', 'View All')}
              </button>
            </div>

            {pendingBills.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t(lang, 'सबै बिल भुक्तानी भइसकेका छन्!', 'All utility bills are settled!')}
                </p>
                <button
                  type="button"
                  onClick={() => setQuickModal('bill')}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {t(lang, '+ नयाँ बिल थप्नुहोस्', '+ Add a Bill Reminder')}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-slate-800">
                {pendingBills.slice(0, 4).map((bill) => {
                  const isLate = diffDaysFromToday(bill.dueDate) < 0;
                  return (
                    <div
                      key={bill.id}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {bill.billName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-1.5 mt-0.5">
                          <span>{bill.provider}</span>
                          <span aria-hidden="true">·</span>
                          <span>{BILL_CATEGORY_LABELS[bill.category][lang]}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              isLate
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : 'text-amber-700 dark:text-amber-400 font-medium'
                            }
                          >
                            {getRelativeDueText(bill.dueDate, lang)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(bill.amount, currency)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSection('bills')}
                          className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          {t(lang, 'भुक्तानी', 'Pay')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Today's & Priority Family Tasks */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t(lang, 'परिवारका आजका र बाँकी काम', "Family Tasks & Today's Chores")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                  {completedTasksCount}/{data.tasks.length}{' '}
                  {t(lang, 'काम सम्पन्न', 'tasks completed')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('tasks')}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap cursor-pointer"
              >
                {t(lang, 'सबै काम', 'All Tasks')}
              </button>
            </div>

            {activeTasks.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t(lang, 'कुनै बाँकी घरायसी काम छैन।', 'No pending household tasks.')}
                </p>
                <button
                  type="button"
                  onClick={() => setQuickModal('task')}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {t(lang, '+ नयाँ काम तोक्नुहोस्', '+ Assign a Task')}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-slate-800">
                {activeTasks.slice(0, 4).map((task) => {
                  const isDueTodayOrPast = diffDaysFromToday(task.dueDate) <= 0;
                  return (
                    <div
                      key={task.id}
                      className="py-3.5 flex items-start justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => cycleTaskStatus(task.id)}
                        className="min-h-[36px] min-w-[36px] -ml-1 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors shrink-0 cursor-pointer"
                        title={t(lang, 'स्थिति बदल्न क्लिक गर्नुहोस्', 'Click to advance status')}
                      >
                        {task.status === 'in_progress' ? (
                          <Clock className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {task.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-1.5 mt-0.5">
                          <span>{getMemberName(task.assignedMemberId)}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              isDueTodayOrPast
                                ? 'text-rose-600 dark:text-rose-400 font-medium'
                                : ''
                            }
                          >
                            {getRelativeDueText(task.dueDate, lang)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Three-Column Row: Upcoming Events, Shopping Reminders & Maintenance, Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Birthdays & Events */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t(lang, 'आगामी जन्मदिन र कार्यक्रम', 'Upcoming Events')}
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection('calendar')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {t(lang, 'क्यालेन्डर', 'Calendar')}
            </button>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              {t(lang, 'आगामी कार्यक्रमहरू छैनन्।', 'No upcoming events scheduled.')}
            </p>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {upcomingEvents.map((ev) => (
                <div key={ev.id} className="py-3 space-y-0.5">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {ev.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-1.5">
                    <span className="tabular-nums">{formatDateReadable(ev.date, lang)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{EVENT_CATEGORY_LABELS[ev.category][lang]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {getRelativeDueText(ev.date, lang)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shopping & Home Maintenance Reminders */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-6 space-y-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t(lang, 'किनमेल र मर्मत सम्झना', 'Shopping & Maintenance')}
              </h3>
              <button
                type="button"
                onClick={() => setActiveSection('shopping')}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {t(lang, 'सूची खोलौं', 'Open')}
              </button>
            </div>

            <div className="pt-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">
                  {t(lang, 'किन्न बाँकी सामान', 'Unpurchased Items')}
                </span>
                <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                  {unpurchasedItems.length} ({formatCurrency(unpurchasedEstimate, currency)})
                </span>
              </div>

              {unpurchasedItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400"
                >
                  <span className="truncate pr-2">
                    {item.product} · {item.quantity}
                  </span>
                  <span className="font-mono tabular-nums shrink-0">
                    {formatCurrency(item.estimatedPrice, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                <span>{t(lang, 'आगामी घर मर्मत', 'Upcoming Maintenance')}</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveSection('maintenance')}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {t(lang, 'मर्मत हेर्नुहोस्', 'View')}
              </button>
            </div>
            {upcomingMaintenance.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(lang, 'तत्काल कुनै मर्मत बाँकी छैन।', 'No urgent maintenance due.')}
              </p>
            ) : (
              upcomingMaintenance.slice(0, 2).map((m) => (
                <div key={m.id} className="py-1.5 text-xs">
                  <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {m.title}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {formatDateReadable(m.nextMaintenanceDate, lang)} ·{' '}
                    {getRelativeDueText(m.nextMaintenanceDate, lang)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Financial Activity */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t(lang, 'हालैका कारोबारहरू', 'Recent Activity')}
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection('finance')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {t(lang, 'सबै खर्च', 'Ledger')}
            </button>
          </div>
          {recentFinances.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              {t(lang, 'कुनै आम्दानी वा खर्च दर्ता भएको छैन।', 'No transactions logged yet.')}
            </p>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {recentFinances.map((rec) => (
                <div
                  key={rec.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {rec.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {FINANCE_CATEGORY_LABELS[rec.category][lang]} ·{' '}
                      <span className="tabular-nums">{formatDateReadable(rec.date, lang)}</span>
                    </div>
                  </div>
                  <div
                    className={`text-sm font-mono font-semibold tabular-nums shrink-0 ${
                      rec.type === 'income'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {rec.type === 'income' ? '+' : '-'}
                    {formatCurrency(rec.amount, currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
