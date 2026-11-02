import React, { useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Check,
  CheckSquare,
  Code2,
  CreditCard,
  Edit2,
  HelpCircle,
  Home,
  LayoutDashboard,
  Menu,
  Moon,
  Plus,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import { DEFAULT_DEVELOPER_NAME } from '../data/demoData';
import { diffDaysFromToday, NAV_LABELS, t } from '../i18n/translations';
import { NavSection, QuickModalType } from '../types';

const NAV_ITEMS: { id: NavSection; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'assistant', icon: Sparkles },
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
    updateSettings,
    addToast,
    removeDemoDataOnly,
    requestConfirm,
  } = useHome();

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [editingDevName, setEditingDevName] = useState(false);
  const [draftDevName, setDraftDevName] = useState('');

  const lang = data.settings.language;
  const developerName = data.settings.developerName?.trim() || DEFAULT_DEVELOPER_NAME;

  const saveInlineDevName = () => {
    const cleaned = draftDevName.trim() || DEFAULT_DEVELOPER_NAME;
    updateSettings({ developerName: cleaned });
    setEditingDevName(false);
    addToast(
      t(lang, 'डेभलपरको नाम सुरक्षित गरियो।', 'Developer name updated.'),
      'success'
    );
  };

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
    'assistant',
    'tasks',
    'calendar',
    'maintenance',
    'reports',
    'settings',
  ];
  const isSecondaryActive = mobileSecondaryTabs.includes(activeSection);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:w-64 xl:w-72 shrink-0 flex-col border-r border-stone-200/85 dark:border-slate-800/90 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 h-screen">
        {/* Brand */}
        <div className="h-16 px-5 border-b border-stone-200/80 dark:border-slate-800 flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 text-white flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
            <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-bl-md" aria-hidden="true" />
            <Home className="w-4 h-4 text-amber-200 relative z-10" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
              Digital Home Nepal
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium truncate">
              {data.settings.householdName}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main Navigation">
          {NAV_ITEMS.map(({ id, icon: Icon }) => {
            const active = activeSection === id;
            const count = getCountForNav(id);
            const isAI = id === 'assistant';
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectNav(id)}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-sm flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-stone-100/90 dark:hover:bg-slate-800/70 font-medium'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active
                        ? 'text-amber-200'
                        : isAI
                          ? 'text-amber-500 dark:text-amber-400'
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
                        ? 'text-emerald-100'
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

        {/* Sidebar Help (AI Assistance) & Developer Credit Footer */}
        <div className="p-4 border-t border-stone-200/80 dark:border-slate-800 space-y-3">
          <button
            type="button"
            onClick={() => handleSelectNav('assistant')}
            className="w-full min-h-[38px] px-3 py-2 rounded-xl border border-amber-200/90 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-950/50 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 truncate">
              <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">
                {t(lang, 'सहायता · AI Assistance', 'Help · AI Assistance')}
              </span>
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          </button>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            {editingDevName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={draftDevName}
                  onChange={(e) => setDraftDevName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveInlineDevName();
                    if (e.key === 'Escape') setEditingDevName(false);
                  }}
                  autoFocus
                  aria-label={t(lang, 'डेभलपरको नाम', 'Developer Name')}
                  className="flex-1 h-8 px-2.5 rounded-lg border border-emerald-500 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={saveInlineDevName}
                  aria-label={t(lang, 'सुरक्षित गर्नुहोस्', 'Save developer name')}
                  className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                  <Code2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {t(lang, 'डेभलपर:', 'Developer:')}{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {developerName}
                    </strong>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDraftDevName(developerName);
                    setEditingDevName(true);
                  }}
                  title={t(lang, 'डेभलपर नाम बदल्नुहोस्', 'Edit developer name')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col pb-20 lg:pb-0">
        {/* Top Workspace Bar (3-zone contract: Breadcrumb Left — Actions Right) */}
        <header className="no-print h-14 sm:h-16 px-4 sm:px-8 border-b border-stone-200/85 dark:border-slate-800/90 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-20">
          {/* Zone 1: Contextual Breadcrumb / Brand on mobile */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="lg:hidden relative w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-700 to-teal-700 text-white flex items-center justify-center shrink-0 overflow-hidden">
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-bl-sm" aria-hidden="true" />
              <Home className="w-4 h-4 text-amber-200 relative z-10" />
            </div>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                {data.settings.householdName}
              </span>
              <span className="hidden sm:inline text-stone-300 dark:text-slate-700" aria-hidden="true">
                /
              </span>
              <h1 className="font-bold text-slate-900 dark:text-white truncate whitespace-nowrap">
                {NAV_LABELS[activeSection][lang]}
              </h1>
            </div>
          </div>

          {/* Zone 3: Help (AI Assistance), Language, Theme & Primary Quick Add */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectNav('assistant')}
              className={`min-h-[40px] px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === 'assistant'
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : 'border-amber-200/90 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-950/50 text-amber-900 dark:text-amber-300'
              }`}
              title={t(
                lang,
                'सहायता र AI Assistance खोल्नुहोस्',
                'Open Help & AI Assistance'
              )}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="inline sm:hidden">{t(lang, 'सहायता', 'Help')}</span>
              <span className="hidden sm:inline">
                {t(lang, 'सहायता · AI सहायक', 'Help · AI Assistance')}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              className="min-h-[40px] px-3 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/90 dark:bg-slate-800/70 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title={t(lang, 'भाषा बदल्नुहोस्', 'Switch Language')}
            >
              {lang === 'ne' ? 'EN / नेपाली' : 'नेपाली / EN'}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t(lang, 'थिम बदल्नुहोस्', 'Toggle Light/Dark Theme')}
              className="min-h-[40px] min-w-[40px] rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/90 dark:bg-slate-800/70 hover:bg-stone-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shrink-0 cursor-pointer"
            >
              {data.settings.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setQuickMenuOpen((prev) => !prev)}
                className="min-h-[40px] px-3.5 sm:px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
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
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 shadow-lg py-1.5 z-40">
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

        {/* Footer with Developer Attribution & Help (AI Assistance) */}
        <footer className="no-print w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 border-t border-stone-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Digital Home Nepal
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {t(lang, 'डेभलपर:', 'Developer:')}{' '}
              <strong className="text-slate-900 dark:text-white">{developerName}</strong>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => handleSelectNav('assistant')}
              className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>
                {t(
                  lang,
                  'सहायता चाहिन्छ? AI Assistance खोल्नुहोस्',
                  'Need Help? Open AI Assistance'
                )}
              </span>
            </button>
            <span className="hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span>
              {t(lang, 'लोकल स्टोरेज (localStorage)', 'Local device storage')}
            </span>
          </div>
        </footer>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-stone-200 dark:border-slate-800 grid grid-cols-5 items-center h-16 px-1"
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
          <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl border-t border-stone-200 dark:border-slate-800 p-5 pb-8 space-y-4">
            <div className="w-10 h-1.5 bg-stone-300 dark:bg-slate-700 rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t(lang, 'अन्य सेवाहरू', 'More Household Modules')}
              </h2>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-stone-100 dark:hover:bg-slate-800"
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
                    className={`min-h-[48px] px-4 py-3 rounded-xl flex items-center justify-between text-sm transition-all ${
                      active
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold'
                        : 'bg-stone-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 ${
                          !active && id === 'assistant' ? 'text-amber-500 dark:text-amber-400' : ''
                        }`}
                      />
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
