import React, { useState } from 'react';
import {
  Check,
  Home,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Wallet,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import { CURRENCY_META, t } from '../i18n/translations';
import { CurrencyCode, Language } from '../types';
import heroNepaliHome from '../assets/images/hero_nepali_home_1793615256246.jpg';

const HERO_IMAGE_SRC = heroNepaliHome;

export const OnboardingView: React.FC = () => {
  const {
    data,
    completeOnboardingWithDemo,
    completeOnboardingClean,
    toggleTheme,
  } = useHome();

  const [lang, setLang] = useState<Language>(data.settings.language || 'ne');
  const [currency, setCurrency] = useState<CurrencyCode>(data.settings.currency || 'NPR');
  const [householdName, setHouseholdName] = useState(
    lang === 'ne' ? 'शर्मा परिवार' : 'Sharma Family'
  );
  const [monthlyBudget, setMonthlyBudget] = useState('85000');
  const [imgFailed, setImgFailed] = useState(false);
  const [error, setError] = useState('');

  const handleLanguageSwitch = (nextLang: Language) => {
    setLang(nextLang);
    if (
      householdName === 'शर्मा परिवार' ||
      householdName === 'Sharma Family' ||
      !householdName.trim()
    ) {
      setHouseholdName(nextLang === 'ne' ? 'शर्मा परिवार' : 'Sharma Family');
    }
  };

  const parseValidatedBudget = (): number | null => {
    if (!householdName.trim()) {
      setError(
        t(
          lang,
          'कृपया परिवार वा घरको नाम लेख्नुहोस्।',
          'Please enter your household or family name.'
        )
      );
      return null;
    }
    const num = Number(monthlyBudget);
    if (Number.isNaN(num) || num <= 0) {
      setError(
        t(
          lang,
          'कृपया मान्य मासिक बजेट रकम राख्नुहोस्।',
          'Please enter a valid positive monthly budget.'
        )
      );
      return null;
    }
    setError('');
    return num;
  };

  const onStartDemo = (e: React.FormEvent) => {
    e.preventDefault();
    const budget = parseValidatedBudget();
    if (budget === null) return;
    completeOnboardingWithDemo(householdName.trim(), lang, currency, budget);
  };

  const onStartClean = () => {
    const budget = parseValidatedBudget();
    if (budget === null) return;
    completeOnboardingClean(householdName.trim(), lang, currency, budget);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Home className="w-5 h-5" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight whitespace-nowrap">
            Digital Home Nepal
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleLanguageSwitch('ne')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap min-h-[36px] ${
                lang === 'ne'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              नेपाली
            </button>
            <button
              type="button"
              onClick={() => handleLanguageSwitch('en')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap min-h-[36px] ${
                lang === 'en'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              English
            </button>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t(lang, 'थिम परिवर्तन गर्नुहोस्', 'Toggle theme')}
            className="min-h-[40px] min-w-[40px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {data.settings.theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Split Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-8 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Showcase Column */}
          <div className="lg:col-span-7 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 min-h-[340px] sm:min-h-[460px] flex flex-col justify-end">
            {!imgFailed ? (
              <img
                src={HERO_IMAGE_SRC}
                alt={t(
                  lang,
                  'आधुनिक नेपाली पारिवारिक घर र हिमाली दृश्य',
                  'Warm modern Nepali family home terrace overlooking the Himalayas'
                )}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-rose-950 flex items-center justify-center">
                <Home className="w-20 h-20 text-white/20" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/15" />

            <div className="relative z-10 p-6 sm:p-10 text-white space-y-4">
              <p className="text-xs sm:text-sm font-medium text-emerald-300 tracking-wide">
                {t(
                  lang,
                  'स्मार्ट परिवार · स्मार्ट घर · सुन्दर जीवन',
                  'Smart Family · Smart Home · Better Living'
                )}
              </p>
              <h1 className="text-2xl sm:text-4xl font-bold leading-tight max-w-xl [text-wrap:balance]">
                {t(
                  lang,
                  'नेपाली परिवारको दैनिक खर्च, बिल, किनमेल र घरायसी व्यवस्थापन एकै ठाउँमा।',
                  'Organize household finances, utility bills, shopping, chores, and family events in one calm workspace.'
                )}
              </h1>
              <p className="text-sm sm:text-base text-slate-200 max-w-xl leading-relaxed">
                {t(
                  lang,
                  'बिजुली-पानीको बिलदेखि भान्साको किनमेल, बच्चाहरूको स्कूल शुल्क र घर मर्मतको सम्झनासम्म — सरल, सुरक्षित र पूर्ण रूपमा नेपाली तथा अंग्रेजी भाषामा।',
                  'Built thoughtfully for Nepali households—track NEA & KUKL bills, monthly budgets, family tasks, and maintenance reminders with instant local privacy.'
                )}
              </p>

              <div className="pt-3 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {t(lang, 'बजेट, बिल र खर्च ट्र्याकिङ', 'Budget, Bills & Ledger')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {t(lang, 'परिवारका काम र क्यालेन्डर', 'Tasks & Family Calendar')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {t(lang, '१००% लोकल डिभाइस स्टोरेज', '100% Private Local Storage')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Setup Form Card */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between">
            <form onSubmit={onStartDemo} className="space-y-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {t(lang, 'तपाईंको घर खाता सुरु गर्नुहोस्', 'Set Up Your Household')}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {t(
                    lang,
                    'आफ्नो परिवारको नाम र प्राथमिकता छान्नुहोस्। कुनै अकाउन्ट वा लगइन आवश्यक पर्दैन।',
                    'Personalize your workspace below. No account sign-up or external cloud required.'
                  )}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="onboard-household-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {t(lang, 'घर / परिवारको नाम', 'Household Name')}
                </label>
                <input
                  id="onboard-household-name"
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder={t(lang, 'उदा: शर्मा परिवार', 'e.g., Sharma Family')}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="onboard-currency"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    {t(lang, 'मुद्रा (Currency)', 'Currency')}
                  </label>
                  <select
                    id="onboard-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {(['NPR', 'AUD', 'USD'] as CurrencyCode[]).map((code) => (
                      <option key={code} value={code}>
                        {code} ({CURRENCY_META[code].symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="onboard-budget"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    {t(
                      lang,
                      `मासिक घर बजेट (${CURRENCY_META[currency].symbol})`,
                      `Monthly Budget (${CURRENCY_META[currency].symbol})`
                    )}
                  </label>
                  <input
                    id="onboard-budget"
                    type="number"
                    min="1"
                    step="any"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    {t(
                      lang,
                      'नेपाली नमुना डाटासहित सुरु गर्नुहोस् (सिफारिस गरिएको)',
                      'Explore with Nepali Demo Data (Recommended)'
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onStartClean}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>
                    {t(
                      lang,
                      'खाली घर खाताबाट सुरु गर्नुहोस्',
                      'Start with a Clean Empty Household'
                    )}
                  </span>
                </button>
              </div>
            </form>

            {/* Privacy Note */}
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t(
                  lang,
                  'गोपनीयता र लोकल स्टोरेज जानकारी',
                  'Privacy & Local Device Storage'
                )}
              </p>
              <p>
                {t(
                  lang,
                  'तपाईंका सबै पारिवारिक विवरणहरू यही डिभाइसको ब्राउजर (localStorage) मा मात्र सुरक्षित रहन्छन्। कुनै बाह्य सर्भरमा पठाइँदैन। नमुना डाटा जुनसुकै बेला एक क्लिकमा हटाउन सकिन्छ।',
                  'All household records are stored locally in this browser (localStorage) and never transmitted externally. Demo data is clearly labeled and can be removed anytime in one click.'
                )}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
