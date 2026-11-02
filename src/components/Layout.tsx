import React, { useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  CreditCard,
  Home,
  LayoutDashboard,
  Menu,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sun,
  Trash2,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import { diffDaysFromToday, NAV_LABELS, t } from '../i18n/translations';
import { NavSection, QuickModalType } from '../types';

const NAV_ITEMS: { id: NavSection; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'finance', icon: Wallet },
  { id: 'bills', icon: CreditCard },
  { id: 'shopping', icon: ShoppingBag },
  { id: 'tasks', icon: CheckSquare },
  { id: 'calendar', icon: CalendarDays },
  { id: 'maintenance', icon: Wrench },
  { id: 'reports', icon: BarChart3 },
  { id: 'settings', icon: Settings },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    data,
    activeSection,
    setActiveSection,
    setQuickModal,
    toggleLanguage,
    toggleTheme,
    removeDemoDataOnly,
    requestConfirm,
  } = useHome();

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  const lang = data.settings.language;

  // Compute subtle unboxed numeric indicators for sidebar clarity
  const unpaidBillCount = data.bills.filter((b) => b.status === 'unpaid').length;
  const pendingTaskCount = data.tasks.filter((tk) => tk.status !== 'completed').length;
  const unpurchasedCount = data.shoppingLists.reduce(
    (sum, l) => sum + l.items.filter((i) => !i.purchased).length,
    0
  );
  const dueMaintenanceCount = data.maintenance.filter(
    (m) =>
      m.status === 'needs_attention' ||
      (m.status !== 'completed' && diffDaysFromToday(m.nextMaintenanceDate) <= 7)
  ).length;

  const getCountForNav = (id: NavSection): number => {
    if (id === 'bills') return unpaidBillCount;
    if (id === 'tasks') return pendingTaskCount;
    if (id === 'shopping') return unpurchasedCount;
    if (id === 'maintenance') return dueMaintenanceCount;
    return 0;
  };

  const handleSelectNav = (id: NavSection) => {
    setActiveSection(id);
    setMobileMoreOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAddSelect = (type: QuickModalType) => {
    setQuickMenuOpen(false);
    setQuickModal(type);
  };

  const confirmRemoveDemo = () => {
    requestConfirm({
      title: t(lang, 'नमुना डाटा हटाउने हो?', 'Remove Demo Data?'),
      message: t(
        lang,
        'यसले सुरुका सबै नमुना (Demo) विवरणहरू हटाउनेछ, तर तपाईंले आफैँ थप्नुभएका विवरणहरू सुरक्षित रहनेछन्।',
        'This will clear all sample demo items while keeping any records you created yourself.'
      ),
      confirmLabel: t(lang, 'नमुना डाटा हटाउनुहोस्', 'Remove Demo Data'),
      danger: true,
      onConfirm: removeDemoDataOnly,
    });
  };

  const mobilePrimaryTabs: NavSection[] = ['dashboard', 'finance', 'bills', 'shopping'];
  const mobileSecondaryTabs: NavSection[] = [
    'tasks',
    'calendar',
    'maintenance',
    'reports',
    'settings',
  ];
  const isSecondaryActive = mobileSecondaryTabs.includes(activeSection);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:w-64 xl:w-72 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen">
        {/* Brand */}
        <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shrink-0 overflow-hidden">
            <span className="absolute top-0 right-0 w-3 h-3 bg-rose-600 rounded-bl-md" aria-hidden="true" />
            <Home className="w-4 h-4 text-emerald-400 relative z-10" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
              Digital Home Nepal
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {data.settings.householdName}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main Navigation">
          {NAV_ITEMS.map(({ id, icon: Icon }) => {
            const active = activeSection === id;
            const count = getCountForNav(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectNav(id)}
                className={`w-full min-h-[42px] px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 font-medium'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active
                        ? 'text-emerald-300 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span className="truncate whitespace-nowrap">
                    {NAV_LABELS[id][lang]}
                  </span>
                </span>
                {count > 0 && (
                  <span
                    className={`text-xs font-mono tabular-nums shrink-0 ${
                      active
                        ? 'text-emerald-200 dark:text-emerald-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Local Storage Footer Note */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              {t(
                lang,
                'लोकल डिभाइस स्टोरेजमा सुरक्षित · अफलाइन काम गर्छ',
                'Saved in local browser storage · Private to this device'
              )}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col pb-20 lg:pb-0">
        {/* Top Workspace Bar (3-zone contract: Breadcrumb Left — Actions Right) */}
        <header className="no-print h-14 sm:h-16 px-4 sm:px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
          {/* Zone 1: Contextual Breadcrumb / Brand on mobile */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="lg:hidden w-8 h-8 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Home className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                {data.settings.householdName}
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
                /
              </span>
              <h1 className="font-bold text-slate-900 dark:text-white truncate whitespace-nowrap">
                {NAV_LABELS[activeSection][lang]}
              </h1>
            </div>
          </div>

          {/* Zone 3: Language, Theme & Primary Quick Add */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleLanguage}
              className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title={t(lang, 'भाषा बदल्नुहोस्', 'Switch Language')}
            >
              {lang === 'ne' ? 'EN / नेपाली' : 'नेपाली / EN'}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t(lang, 'थिम बदल्नुहोस्', 'Toggle Light/Dark Theme')}
              className="min-h-[40px] min-w-[40px] rounded-lg border border-slate-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shrink-0 cursor-pointer"
            >
              {data.settings.theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setQuickMenuOpen((prev) => !prev)}
                className="min-h-[40px] px-3.5 sm:px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>{t(lang, 'नयाँ थप्नुहोस्', 'Quick Add')}</span>
              </button>

              {quickMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setQuickMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg py-1.5 z-40">
                    <button
                      type="button"
                      onClick={() => handleQuickAddSelect('expense')}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Wallet className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>{t(lang, 'नयाँ खर्च थप्नुहोस्', 'Add Expense')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddSelect('income')}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t(lang, 'नयाँ आम्दानी थप्नुहोस्', 'Add Income')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddSelect('bill')}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>{t(lang, 'बिल रिमाइन्डर थप्नुहोस्', 'Add Utility Bill')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddSelect('shopping')}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>{t(lang, 'किनमेल सामान थप्नुहोस्', 'Add Shopping Item')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddSelect('task')}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t(lang, 'घरायसी काम थप्नुहोस्', 'Assign Family Task')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddSelect('event')}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{t(lang, 'कार्यक्रम / जन्मदिन थप्नुहोस्', 'Add Calendar Event')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddSelect('maintenance')}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Wrench className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span>{t(lang, 'घर मर्मत टिपोट', 'Log Home Maintenance')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Demo Data Notice Bar (clearly labeled as Demo Data with 1-click removal) */}
        {data.settings.hasDemoData && (
          <div className="no-print bg-amber-50/90 dark:bg-amber-950/35 border-b border-amber-200/80 dark:border-amber-900/60 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <p className="text-amber-900 dark:text-amber-200">
              <span className="font-semibold">
                {t(lang, 'नमुना डाटा (Demo Data) सक्रिय छ:', 'Demo Data Active:')}
              </span>{' '}
              {t(
                lang,
                'तपाईं अहिले उदाहरणका लागि राखिएको नेपाली पारिवारिक डाटा हेर्दै हुनुहुन्छ।',
                'You are viewing realistic Nepali sample household entries.'
              )}
            </p>
            <button
              type="button"
              onClick={confirmRemoveDemo}
              className="inline-flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300 hover:underline whitespace-nowrap shrink-0 cursor-pointer py-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t(lang, 'नमुना डाटा हटाउनुहोस्', 'Clear Demo Data')}</span>
            </button>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6">
          {children}
        </main>

        {/* Quiet Footer */}
        <footer className="no-print w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 border-t border-slate-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Digital Home Nepal ·{' '}
            {t(
              lang,
              'स्मार्ट परिवार। स्मार्ट घर। सुन्दर जीवन।',
              'Smart Family. Smart Home. Better Living.'
            )}
          </span>
          <span>
            {t(
              lang,
              'स्थानीय ब्राउजर भण्डारण (localStorage) · बाह्य सर्भरमा डाटा जाँदैन',
              'Local browser storage only · Zero external data sharing'
            )}
          </span>
        </footer>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center h-16 px-1"
      >
        {mobilePrimaryTabs.map((id) => {
          const item = NAV_ITEMS.find((n) => n.id === id)!;
          const Icon = item.icon;
          const active = activeSection === id && !mobileMoreOpen;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelectNav(id)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
                active
                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] leading-tight truncate max-w-[64px] whitespace-nowrap">
                {lang === 'ne' ? NAV_LABELS[id].shortNe : NAV_LABELS[id].shortEn}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMoreOpen((prev) => !prev)}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
            isSecondaryActive || mobileMoreOpen
              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[11px] leading-tight whitespace-nowrap">
            {t(lang, 'थप', 'More')}
          </span>
        </button>
      </nav>

      {/* Mobile "More" Bottom Sheet Drawer */}
      {mobileMoreOpen && (
        <div className="no-print lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMoreOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 pb-8 space-y-4">
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t(lang, 'अन्य सेवाहरू', 'More Household Modules')}
              </h2>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {mobileSecondaryTabs.map((id) => {
                const item = NAV_ITEMS.find((n) => n.id === id)!;
                const Icon = item.icon;
                const active = activeSection === id;
                const count = getCountForNav(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectNav(id)}
                    className={`min-h-[48px] px-4 py-3 rounded-xl flex items-center justify-between text-sm transition-colors ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-emerald-600 font-semibold'
                        : 'bg-stone-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{NAV_LABELS[id][lang]}</span>
                    </span>
                    {count > 0 && (
                      <span className="text-xs font-mono tabular-nums opacity-80">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
