import React, { useEffect, useRef, useState } from 'react';
import {
  Code2,
  Download,
  Edit2,
  HelpCircle,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import { DEFAULT_DEVELOPER_NAME } from '../data/demoData';
import { CURRENCY_META, t } from '../i18n/translations';
import { CurrencyCode, FamilyMember, Language } from '../types';

const AVATAR_COLORS = ['#0F172A', '#059669', '#0284C7', '#BE123C', '#7C3AED', '#D97706'];

export const SettingsView: React.FC = () => {
  const {
    data,
    setActiveSection,
    updateSettings,
    addMember,
    updateMember,
    deleteMember,
    exportBackupJSON,
    importBackupJSON,
    removeDemoDataOnly,
    resetToDemoData,
    clearAllHouseholdData,
    requestConfirm,
    addToast,
  } = useHome();

  const lang = data.settings.language;
  const currency = data.settings.currency;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [householdName, setHouseholdName] = useState(data.settings.householdName);
  const [developerName, setDeveloperName] = useState(
    data.settings.developerName || DEFAULT_DEVELOPER_NAME
  );
  const [monthlyBudget, setMonthlyBudget] = useState(String(data.settings.monthlyBudget));
  const [importError, setImportError] = useState('');

  useEffect(() => {
    setHouseholdName(data.settings.householdName);
    setDeveloperName(data.settings.developerName || DEFAULT_DEVELOPER_NAME);
    setMonthlyBudget(String(data.settings.monthlyBudget));
  }, [
    data.settings.householdName,
    data.settings.developerName,
    data.settings.monthlyBudget,
  ]);

  // Member Modal State
  const [memModalOpen, setMemModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [memName, setMemName] = useState('');
  const [memRole, setMemRole] = useState('');
  const [memColor, setMemColor] = useState(AVATAR_COLORS[0]);
  const [memErr, setMemErr] = useState('');

  const handleSaveHouseholdProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(monthlyBudget);
    if (!householdName.trim() || Number.isNaN(num) || num <= 0) {
      addToast(
        t(
          lang,
          'कृपया मान्य घरको नाम र मासिक बजेट राख्नुहोस्।',
          'Please provide a valid household name and positive budget.'
        ),
        'error'
      );
      return;
    }
    updateSettings({
      householdName: householdName.trim(),
      developerName: developerName.trim() || DEFAULT_DEVELOPER_NAME,
      monthlyBudget: num,
    });
    addToast(
      t(lang, 'प्रोफाइल र डेभलपर विवरण सुरक्षित गरियो।', 'Household & developer profile saved.'),
      'success'
    );
  };

  const openAddMember = () => {
    setEditingMember(null);
    setMemName('');
    setMemRole('');
    setMemColor(AVATAR_COLORS[data.members.length % AVATAR_COLORS.length]);
    setMemErr('');
    setMemModalOpen(true);
  };

  const openEditMember = (m: FamilyMember) => {
    setEditingMember(m);
    setMemName(m.name);
    setMemRole(m.role);
    setMemColor(m.avatarColor);
    setMemErr('');
    setMemModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memName.trim()) {
      setMemErr(t(lang, 'कृपया सदस्यको नाम लेख्नुहोस्।', 'Please enter member name.'));
      return;
    }
    if (editingMember) {
      updateMember(editingMember.id, {
        name: memName.trim(),
        role: memRole.trim() || t(lang, 'परिवार सदस्य', 'Family Member'),
        avatarColor: memColor,
      });
    } else {
      addMember({
        name: memName.trim(),
        role: memRole.trim() || t(lang, 'परिवार सदस्य', 'Family Member'),
        avatarColor: memColor,
      });
    }
    setMemModalOpen(false);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const result = importBackupJSON(content);
      if (!result.ok && result.error) {
        setImportError(result.error);
      } else {
        // Sync local controlled inputs
        try {
          const parsed = JSON.parse(content);
          if (parsed?.settings) {
            setHouseholdName(parsed.settings.householdName);
            setMonthlyBudget(String(parsed.settings.monthlyBudget));
          }
        } catch {
          // Handled above
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {t(lang, 'सेटिङ्स र डाटा व्यवस्थापन', 'Settings & Household Data')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t(
            lang,
            'भाषा, मुद्रा, थिम, परिवार प्रोफाइल र सुरक्षित JSON ब्याकअप तथा रिस्टोर',
            'Customize language, currency, appearance, family profiles, and local JSON backups'
          )}
        </p>
      </div>

      {/* Household Name, Monthly Budget & Developer Name */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          {t(
            lang,
            'घर / परिवारको विवरण र डेभलपरको नाम',
            'Household Details & Developer Attribution'
          )}
        </h3>
        <form onSubmit={handleSaveHouseholdProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t(lang, 'परिवार / घरको नाम', 'Household Name')}
              </label>
              <input
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t(
                  lang,
                  `मासिक घर बजेट (${CURRENCY_META[currency].symbol})`,
                  `Monthly Household Budget (${CURRENCY_META[currency].symbol})`
                )}
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t(lang, 'डेभलपरको नाम (Developer Name)', 'Developer Name')}
              </label>
              <input
                type="text"
                value={developerName}
                onChange={(e) => setDeveloperName(e.target.value)}
                placeholder={DEFAULT_DEVELOPER_NAME}
                className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="min-h-[42px] px-5 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:opacity-90 text-white text-xs sm:text-sm font-semibold cursor-pointer"
            >
              {t(lang, 'विवरण सुरक्षित गर्नुहोस्', 'Save Profile & Settings')}
            </button>
          </div>
        </form>
      </section>

      {/* Help & AI Assistance Card */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t(
                lang,
                'सहायता तथा स्मार्ट AI परामर्श (Help & AI Assistance)',
                'Help & Smart AI Assistance'
              )}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t(
                lang,
                'एप चलाउने तरिका जान्न, रसिद स्क्यान र बजेट सीमा बुझ्न, वा घरायसी आर्थिक योजना बनाउन AI Assistance प्रयोग गर्नुहोस्।',
                'Need help using features, receipt scanning, category limits, or planning your family budget? Ask AI Assistance anytime.'
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveSection('assistant')}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t(lang, 'AI Assistance खोल्नुहोस्', 'Open AI Assistance')}</span>
        </button>
      </section>

      {/* Preferences: Language, Currency, Theme */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {t(lang, 'प्रणाली प्राथमिकताहरू', 'Display Preferences')}
        </h3>

        {/* Language */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {t(lang, 'भाषा (Language)', 'Application Language')}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                lang,
                'सम्पूूर्ण एप नेपाली वा अंग्रेजी भाषामा प्रयोग गर्नुहोस्',
                'Switch seamlessly between Nepali and English'
              )}
            </p>
          </div>
          <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
            {(['ne', 'en'] as Language[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => updateSettings({ language: l })}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  lang === l
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {l === 'ne' ? 'नेपाली (Nepali)' : 'English'}
              </button>
            ))}
          </div>
        </div>

        {/* Currency */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="max-w-lg">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {t(lang, 'मुद्रा प्रदर्शन (Currency Display)', 'Currency Display')}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {t(
                lang,
                'नोट: मुद्रा परिवर्तन गर्दा रकमको चिन्ह (रु., A$, $) मात्र बदलिन्छ। पहिले सुरक्षित गरिएका पुराना रकमहरूको विनिमय दर रूपान्तरण (Exchange Conversion) गरिँदैन।',
                'Note: Changing currency updates the display symbol only (रु., A$, $). Historical numerical amounts are never artificially exchange-rate converted.'
              )}
            </p>
          </div>
          <select
            value={currency}
            onChange={(e) => updateSettings({ currency: e.target.value as CurrencyCode })}
            className="h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white shrink-0"
          >
            {(['NPR', 'AUD', 'USD'] as CurrencyCode[]).map((code) => (
              <option key={code} value={code}>
                {lang === 'ne' ? CURRENCY_META[code].labelNe : CURRENCY_META[code].labelEn}
              </option>
            ))}
          </select>
        </div>

        {/* Light / Dark Theme */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {t(lang, 'थिम रङ (Light / Dark Theme)', 'Theme Appearance')}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                lang,
                'दिउँसो वा रातिको समयमा आँखालाई सहज हुने थिम छान्नुहोस्',
                'Choose between warm daylight canvas and deep navy dark mode'
              )}
            </p>
          </div>
          <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'light' })}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                data.settings.theme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{t(lang, 'लाइट (Light)', 'Light')}</span>
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                data.settings.theme === 'dark'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{t(lang, 'डार्क (Dark)', 'Dark')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Family Profiles Manager */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t(lang, 'परिवारका सदस्यहरूको प्रोफाइल', 'Family Member Profiles')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                lang,
                'घरायसी काम बाँडफाँडका लागि परिवारका सदस्यहरू थप्नुहोस् वा सम्पादन गर्नुहोस्',
                'Manage household members for task assignment and progress tracking'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={openAddMember}
            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t(lang, 'नयाँ सदस्य', 'Add Member')}</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.members.map((m) => (
            <div
              key={m.id}
              className="py-3.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: m.avatarColor }}
                >
                  {m.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {m.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {m.role}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditMember(m)}
                  aria-label="Edit member"
                  className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {data.members.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      requestConfirm({
                        title: t(lang, 'सदस्य हटाउने हो?', 'Remove Family Member?'),
                        message: `"${m.name}" ${t(
                          lang,
                          'हटाउँदा निजको नामका काम अर्को सदस्यमा सर्नेछ।',
                          'will be removed and any assigned tasks reassigned.'
                        )}`,
                        confirmLabel: t(lang, 'हटाउनुहोस्', 'Remove'),
                        danger: true,
                        onConfirm: () => deleteMember(m.id),
                      })
                    }
                    aria-label="Delete member"
                    className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* JSON Backup, Restore & Data Reset */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t(lang, 'ब्याकअप, रिस्टोर र डाटा रिसेट', 'Backup, Restore & Data Controls')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t(
              lang,
              'अर्को ब्राउजर वा डिभाइसमा सार्नका लागि JSON फाइल एक्सपोर्ट वा इम्पोर्ट गर्नुहोस्',
              'Export your complete household database as JSON or restore from a validated backup file'
            )}
          </p>
        </div>

        {importError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300">
            {importError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportBackupJSON}
            className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:opacity-90 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t(lang, 'JSON ब्याकअप डाउनलोड (Export)', 'Export JSON Backup')}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{t(lang, 'JSON ब्याकअप रिस्टोर (Import)', 'Restore JSON Backup')}</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          {data.settings.hasDemoData && (
            <button
              type="button"
              onClick={() =>
                requestConfirm({
                  title: t(lang, 'नमुना डाटा हटाउने हो?', 'Remove Demo Data?'),
                  message: t(
                    lang,
                    'सबै नमुना विवरणहरू हटाइनेछन्, तपाईंले राख्नुभएका विवरणहरू सुरक्षित रहनेछन्।',
                    'Sample demo records will be cleared while preserving your own entries.'
                  ),
                  confirmLabel: t(lang, 'नमुना डाटा हटाउनुहोस्', 'Remove Demo Data'),
                  danger: true,
                  onConfirm: removeDemoDataOnly,
                })
              }
              className="min-h-[40px] px-3.5 py-2 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t(lang, 'नमुना डाटा मात्र हटाउनुहोस्', 'Remove Demo Data Only')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              requestConfirm({
                title: t(lang, 'नमुना डाटा रिसेट गर्ने हो?', 'Reset to Nepali Demo Data?'),
                message: t(
                  lang,
                  'यसले हालको डाटालाई प्रतिस्थापन गरी ताजा नेपाली नमुना डाटा लोड गर्नेछ।',
                  'This will replace current entries with fresh Nepali household demo data.'
                ),
                confirmLabel: t(lang, 'नमुना डाटा लोड गर्नुहोस्', 'Load Demo Data'),
                danger: false,
                onConfirm: resetToDemoData,
              })
            }
            className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t(lang, 'नमुना डाटा पुनः लोड गर्नुहोस्', 'Reset Demo Data')}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              requestConfirm({
                title: t(lang, 'सबै घरायसी डाटा मेटाउने हो?', 'Clear All Household Data?'),
                message: t(
                  lang,
                  'सावधान: यसले आम्दानी, खर्च, बिल, किनमेल र क्यालेन्डरका सबै विवरण स्थायी रूपमा मेटाउनेछ। अघि बढ्नुअघि JSON ब्याकअप लिने सल्लाह दिइन्छ।',
                  'Warning: This permanently erases all finances, bills, shopping lists, tasks, and events from this browser.'
                ),
                confirmLabel: t(lang, 'सबै डाटा मेटाउनुहोस्', 'Clear Everything'),
                danger: true,
                onConfirm: clearAllHouseholdData,
              })
            }
            className="min-h-[40px] px-3.5 py-2 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t(lang, 'सबै डाटा मेटाउनुहोस् (Clear All)', 'Clear All Data')}</span>
          </button>
        </div>
      </section>

      {/* Local Storage & Privacy Transparency Card */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200/90 dark:border-slate-800 p-6 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          <h4 className="font-bold text-slate-900 dark:text-white">
            {t(
              lang,
              'स्थानीय भण्डारण र पूर्ण गोपनीयता (Local Storage & Privacy)',
              'Local Browser Storage & Household Privacy'
            )}
          </h4>
          <p>
            {t(
              lang,
              'Digital Home Nepal ले तपाईंको सबै घरायसी डाटा यही डिभाइस र ब्राउजरको localStorage मा सुरक्षित राख्छ। यो क्लाउड सिन्क्रोनाइजेसन होइन। तपाईंले स्मार्ट AI सहायक प्रयोग गर्दा र सहमति दिँदा मात्र संक्षिप्त सारांश AI विश्लेषणका लागि प्रयोग गरिन्छ। ब्राउजरको क्यास सफा गर्नुअघि JSON ब्याकअप डाउनलोड गरी सुरक्षित राख्नुहोला।',
              'Digital Home Nepal stores all household records locally in this browser’s localStorage on your device (not cloud sync). A concise household summary is only sent when you actively use AI Assistance with context sharing enabled. Export a JSON backup periodically before clearing browser data.'
            )}
          </p>
          <p className="pt-2 flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
            <Code2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {t(lang, 'डेभलपर:', 'Developed by:')}{' '}
              <strong>{data.settings.developerName || DEFAULT_DEVELOPER_NAME}</strong>
            </span>
          </p>
        </div>
      </section>

      {/* Add / Edit Member Modal */}
      {memModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingMember
                  ? t(lang, 'सदस्य सम्पादन गर्नुहोस्', 'Edit Family Member')
                  : t(lang, 'नयाँ परिवार सदस्य', 'Add Family Member')}
              </h3>
              <button
                type="button"
                onClick={() => setMemModalOpen(false)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMember} className="p-6 space-y-4">
              {memErr && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {memErr}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'नाम *', 'Name *')}
                </label>
                <input
                  type="text"
                  value={memName}
                  onChange={(e) => setMemName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'नाता / भूमिका', 'Role')}
                </label>
                <input
                  type="text"
                  value={memRole}
                  onChange={(e) => setMemRole(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'रङ छान्नुहोस्', 'Avatar Color')}
                </label>
                <div className="flex items-center gap-2.5">
                  {AVATAR_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setMemColor(col)}
                      className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                        memColor === col ? 'ring-2 ring-offset-2 ring-emerald-600 scale-110' : ''
                      }`}
                      style={{ backgroundColor: col }}
                      aria-label={col}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMemModalOpen(false)}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t(lang, 'रद्द', 'Cancel')}
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
    </div>
  );
};
