import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createEmptyHouseholdData,
  createNepaliDemoData,
  DEFAULT_DEMO_CATEGORY_BUDGETS,
  DEFAULT_DEVELOPER_NAME,
} from '../data/demoData';
import {
  FINANCE_CATEGORY_LABELS,
  formatCurrency,
  formatMonthYear,
  getTodayISO,
  t,
} from '../i18n/translations';
import {
  AppData,
  BillItem,
  CalendarEvent,
  CurrencyCode,
  FamilyMember,
  FamilyTask,
  FinanceCategory,
  FinanceRecord,
  HouseholdSettings,
  Language,
  MaintenanceRecord,
  NavSection,
  PaymentMethod,
  QuickModalType,
  ShoppingItem,
  ShoppingList,
  ThemeMode,
  ToastMessage,
} from '../types';

const STORAGE_KEY = 'digital_home_nepal_v1';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface HomeContextValue {
  data: AppData;
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  quickModal: QuickModalType;
  setQuickModal: (modal: QuickModalType) => void;
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  confirmState: ConfirmOptions | null;
  requestConfirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;

  // Onboarding & Settings
  completeOnboardingWithDemo: (
    householdName: string,
    language: Language,
    currency: CurrencyCode,
    monthlyBudget: number,
    developerName?: string
  ) => void;
  completeOnboardingClean: (
    householdName: string,
    language: Language,
    currency: CurrencyCode,
    monthlyBudget: number,
    developerName?: string
  ) => void;
  updateSettings: (partial: Partial<HouseholdSettings>) => void;
  updateCategoryBudgets: (budgets: Partial<Record<FinanceCategory, number>>) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;

  // Demo & Data Management
  removeDemoDataOnly: () => void;
  resetToDemoData: () => void;
  clearAllHouseholdData: () => void;
  exportBackupJSON: () => void;
  importBackupJSON: (jsonString: string) => { ok: boolean; error?: string };

  // Members CRUD
  addMember: (member: Omit<FamilyMember, 'id'>) => void;
  updateMember: (id: string, member: Partial<FamilyMember>) => void;
  deleteMember: (id: string) => void;

  // Finance CRUD
  addFinance: (record: Omit<FinanceRecord, 'id' | 'createdAt'>) => void;
  updateFinance: (id: string, record: Omit<FinanceRecord, 'id' | 'createdAt'>) => void;
  deleteFinance: (id: string) => void;

  // Bills CRUD
  addBill: (bill: Omit<BillItem, 'id' | 'paymentHistory'>) => void;
  updateBill: (id: string, bill: Omit<BillItem, 'id' | 'paymentHistory'>) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (
    id: string,
    paymentMethod: PaymentMethod,
    paidDate: string,
    note: string,
    alsoRecordExpense: boolean
  ) => void;
  markBillUnpaid: (id: string) => void;

  // Shopping CRUD
  addShoppingList: (name: string, budget: number) => string;
  updateShoppingList: (id: string, name: string, budget: number) => void;
  deleteShoppingList: (id: string) => void;
  addShoppingItem: (listId: string, item: Omit<ShoppingItem, 'id'>) => void;
  updateShoppingItem: (listId: string, itemId: string, item: Omit<ShoppingItem, 'id'>) => void;
  toggleShoppingItem: (listId: string, itemId: string) => void;
  deleteShoppingItem: (listId: string, itemId: string) => void;
  clearPurchasedItems: (listId: string) => void;

  // Tasks CRUD
  addTask: (task: Omit<FamilyTask, 'id'>) => void;
  updateTask: (id: string, task: Omit<FamilyTask, 'id'>) => void;
  cycleTaskStatus: (id: string) => void;
  deleteTask: (id: string) => void;

  // Calendar CRUD
  addEvent: (evt: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, evt: Omit<CalendarEvent, 'id'>) => void;
  deleteEvent: (id: string) => void;

  // Maintenance CRUD
  addMaintenance: (rec: Omit<MaintenanceRecord, 'id'>) => void;
  updateMaintenance: (id: string, rec: Omit<MaintenanceRecord, 'id'>) => void;
  deleteMaintenance: (id: string) => void;
}

const HomeContext = createContext<HomeContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getInitialData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && parsed.settings && Array.isArray(parsed.finances)) {
        if (parsed.settings.categoryBudgets === undefined) {
          parsed.settings.categoryBudgets = parsed.settings.hasDemoData
            ? { ...DEFAULT_DEMO_CATEGORY_BUDGETS }
            : {};
        }
        if (!parsed.settings.developerName || !parsed.settings.developerName.trim()) {
          parsed.settings.developerName = DEFAULT_DEVELOPER_NAME;
        }
        return parsed;
      }
    }
  } catch {
    // Fallback to fresh pre-onboarding state
  }
  const initial = createNepaliDemoData();
  initial.settings.hasCompletedOnboarding = false;
  return initial;
}

function validateBackupSchema(parsed: unknown): parsed is AppData {
  if (!parsed || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;
  if (!obj.settings || typeof obj.settings !== 'object') return false;
  const s = obj.settings as Record<string, unknown>;
  if (typeof s.householdName !== 'string') return false;
  if (typeof s.monthlyBudget !== 'number' || Number.isNaN(s.monthlyBudget)) return false;
  if (!['ne', 'en'].includes(String(s.language))) return false;
  if (!['NPR', 'AUD', 'USD'].includes(String(s.currency))) return false;
  if (!['light', 'dark'].includes(String(s.theme))) return false;

  const requiredArrays = [
    'members',
    'finances',
    'bills',
    'shoppingLists',
    'tasks',
    'events',
    'maintenance',
  ];
  for (const key of requiredArrays) {
    if (!Array.isArray(obj[key])) return false;
  }
  return true;
}

export const HomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(getInitialData);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [quickModal, setQuickModal] = useState<QuickModalType>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);

  const lang = data.settings.language;

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage quota safeguard
    }
  }, [data]);

  // Sync theme & html lang attribute
  useEffect(() => {
    const root = document.documentElement;
    if (data.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.lang = data.settings.language;
  }, [data.settings.theme, data.settings.language]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = makeId('toast');
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
    const duration = type === 'warning' || type === 'error' ? 5800 : 3600;
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const requestConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(null);
  }, []);

  const completeOnboardingWithDemo = (
    householdName: string,
    language: Language,
    currency: CurrencyCode,
    monthlyBudget: number,
    developerName?: string
  ) => {
    const demo = createNepaliDemoData(
      householdName.trim() || (language === 'ne' ? 'शर्मा परिवार' : 'Sharma Family'),
      language,
      currency,
      data.settings.theme,
      monthlyBudget > 0 ? monthlyBudget : 85000,
      developerName || data.settings.developerName || DEFAULT_DEVELOPER_NAME
    );
    setData(demo);
    setActiveSection('dashboard');
    addToast(
      t(
        language,
        'स्वागत छ! नमुना डाटासहित तपाईंको डिजिटल होम तयार भयो।',
        'Welcome! Your household is ready with Nepali demo data.'
      ),
      'success'
    );
  };

  const completeOnboardingClean = (
    householdName: string,
    language: Language,
    currency: CurrencyCode,
    monthlyBudget: number,
    developerName?: string
  ) => {
    const clean = createEmptyHouseholdData(
      householdName,
      language,
      currency,
      data.settings.theme,
      monthlyBudget,
      developerName || data.settings.developerName || DEFAULT_DEVELOPER_NAME
    );
    setData(clean);
    setActiveSection('dashboard');
    addToast(
      t(
        language,
        'स्वागत छ! तपाईंको खाली घर खाता सफलतापूर्वक सुरु भयो।',
        'Welcome! Your clean household workspace is ready.'
      ),
      'success'
    );
  };

  const checkAndNotifyBudgetThreshold = useCallback(
    (
      financesList: FinanceRecord[],
      targetYearMonth: string,
      budgetAmount: number,
      langCode: Language,
      currencyCode: CurrencyCode
    ) => {
      if (!targetYearMonth || budgetAmount <= 0) return;
      const monthTotalExpense = financesList
        .filter((f) => f.type === 'expense' && f.date.startsWith(targetYearMonth))
        .reduce((sum, f) => sum + f.amount, 0);

      if (monthTotalExpense > budgetAmount * 0.8) {
        const rawPct = (monthTotalExpense / budgetAmount) * 100;
        const pctLabel =
          Math.round(rawPct) <= 80 ? rawPct.toFixed(1) : String(Math.round(rawPct));
        const monthLabel = formatMonthYear(targetYearMonth, langCode);

        if (monthTotalExpense > budgetAmount) {
          const overBy = monthTotalExpense - budgetAmount;
          addToast(
            t(
              langCode,
              `बजेट चेतावनी (${monthLabel}): मासिक खर्च ${pctLabel}% पुग्यो र बजेट सीमा ${formatCurrency(overBy, currencyCode)} ले नाघ्यो!`,
              `Budget Alert (${monthLabel}): Monthly expenses hit ${pctLabel}%, exceeding your household budget by ${formatCurrency(overBy, currencyCode)}!`
            ),
            'error'
          );
        } else {
          const remaining = budgetAmount - monthTotalExpense;
          addToast(
            t(
              langCode,
              `बजेट सावधानी (${monthLabel}): मासिक बजेटको ${pctLabel}% खर्च भइसकेको छ (${formatCurrency(remaining, currencyCode)} बाँकी)।`,
              `Budget Warning (${monthLabel}): Monthly expenses exceeded 80% of budget (${pctLabel}% used · ${formatCurrency(remaining, currencyCode)} left).`
            ),
            'warning'
          );
        }
      }
    },
    [addToast]
  );

  const checkAndNotifyCategoryBudget = useCallback(
    (
      financesList: FinanceRecord[],
      targetYearMonth: string,
      category: FinanceCategory,
      categoryBudgets: Partial<Record<FinanceCategory, number>> | undefined,
      langCode: Language,
      currencyCode: CurrencyCode
    ) => {
      const limit = categoryBudgets?.[category];
      if (!targetYearMonth || !limit || limit <= 0) return;

      const catSpent = financesList
        .filter(
          (f) =>
            f.type === 'expense' &&
            f.category === category &&
            f.date.startsWith(targetYearMonth)
        )
        .reduce((sum, f) => sum + f.amount, 0);

      // Alert when monthly category spending nears (>= 80%) or exceeds (> 100%) its set limit
      if (catSpent >= limit * 0.8) {
        const rawPct = (catSpent / limit) * 100;
        const pctLabel =
          rawPct > 80 && Math.round(rawPct) <= 80
            ? rawPct.toFixed(1)
            : String(Math.round(rawPct));
        const catName = FINANCE_CATEGORY_LABELS[category][langCode];
        const monthLabel = formatMonthYear(targetYearMonth, langCode);

        if (catSpent > limit) {
          const overBy = catSpent - limit;
          addToast(
            t(
              langCode,
              `विधा बजेट नाघ्यो (${catName} · ${monthLabel}): ${pctLabel}% खर्च भई तोकिएको सीमा ${formatCurrency(overBy, currencyCode)} ले नाघ्यो!`,
              `Category Limit Exceeded (${catName} · ${monthLabel}): Hit ${pctLabel}% of limit, over by ${formatCurrency(overBy, currencyCode)}!`
            ),
            'error'
          );
        } else {
          const left = limit - catSpent;
          addToast(
            t(
              langCode,
              `विधा बजेट सीमा नजिक (${catName} · ${monthLabel}): सीमाको ${pctLabel}% खर्च भयो (${formatCurrency(left, currencyCode)} मात्र बाँकी)।`,
              `Nearing Category Limit (${catName} · ${monthLabel}): ${pctLabel}% of ${formatCurrency(limit, currencyCode)} limit used (${formatCurrency(left, currencyCode)} left).`
            ),
            'warning'
          );
        }
      }
    },
    [addToast]
  );

  const updateSettings = (partial: Partial<HouseholdSettings>) => {
    const nextSettings = { ...data.settings, ...partial };
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
    }));
    if (
      typeof partial.monthlyBudget === 'number' &&
      partial.monthlyBudget !== data.settings.monthlyBudget
    ) {
      checkAndNotifyBudgetThreshold(
        data.finances,
        getTodayISO().slice(0, 7),
        partial.monthlyBudget,
        nextSettings.language,
        nextSettings.currency
      );
    }
  };

  const updateCategoryBudgets = (budgets: Partial<Record<FinanceCategory, number>>) => {
    const cleaned: Partial<Record<FinanceCategory, number>> = {};
    (Object.keys(budgets) as FinanceCategory[]).forEach((cat) => {
      const val = Number(budgets[cat]);
      if (!Number.isNaN(val) && val > 0) {
        cleaned[cat] = val;
      }
    });

    const prevBudgets = data.settings.categoryBudgets || {};
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        categoryBudgets: cleaned,
      },
    }));

    addToast(
      t(
        lang,
        'विधागत मासिक बजेट सीमा सुरक्षित गरियो।',
        'Category monthly budget limits saved.'
      ),
      'success'
    );

    const currentYm = getTodayISO().slice(0, 7);
    (Object.keys(cleaned) as FinanceCategory[]).forEach((cat) => {
      if (cleaned[cat] !== prevBudgets[cat]) {
        checkAndNotifyCategoryBudget(
          data.finances,
          currentYm,
          cat,
          cleaned,
          lang,
          data.settings.currency
        );
      }
    });
  };

  const toggleLanguage = () => {
    const nextLang: Language = data.settings.language === 'ne' ? 'en' : 'ne';
    updateSettings({ language: nextLang });
    addToast(
      nextLang === 'ne' ? 'भाषा नेपालीमा परिवर्तन गरियो' : 'Language switched to English',
      'info'
    );
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = data.settings.theme === 'light' ? 'dark' : 'light';
    updateSettings({ theme: nextTheme });
  };

  const removeDemoDataOnly = () => {
    setData((prev) => {
      const keptMembers = prev.members.filter((m) => !m.isDemo);
      const fallbackMembers =
        keptMembers.length > 0
          ? keptMembers
          : [
              {
                id: makeId('mem'),
                name: prev.settings.language === 'ne' ? 'गृहप्रमुख' : 'Household Lead',
                role: prev.settings.language === 'ne' ? 'अभिभावक' : 'Parent / Admin',
                avatarColor: '#059669',
                isDemo: false,
              },
            ];

      const keptLists = prev.shoppingLists
        .filter((l) => !l.isDemo)
        .map((l) => ({
          ...l,
          items: l.items.filter((i) => !i.isDemo),
        }));

      const fallbackLists =
        keptLists.length > 0
          ? keptLists
          : [
              {
                id: makeId('slist'),
                name:
                  prev.settings.language === 'ne'
                    ? 'घरायसी किनमेल सूची'
                    : 'Household Shopping List',
                budget: 5000,
                createdAt: getTodayISO(),
                isDemo: false,
                items: [],
              },
            ];

      return {
        ...prev,
        settings: { ...prev.settings, hasDemoData: false },
        members: fallbackMembers,
        finances: prev.finances.filter((f) => !f.isDemo),
        bills: prev.bills.filter((b) => !b.isDemo),
        shoppingLists: fallbackLists,
        tasks: prev.tasks.filter((tk) => !tk.isDemo),
        events: prev.events.filter((e) => !e.isDemo),
        maintenance: prev.maintenance.filter((m) => !m.isDemo),
      };
    });
    addToast(
      t(
        lang,
        'सबै नमुना (Demo) डाटा हटाइयो। अब आफ्नै विवरण राख्न सक्नुहुन्छ।',
        'All demo data removed. Your custom household entries remain intact.'
      ),
      'info'
    );
  };

  const resetToDemoData = () => {
    const fresh = createNepaliDemoData(
      data.settings.householdName,
      data.settings.language,
      data.settings.currency,
      data.settings.theme,
      data.settings.monthlyBudget,
      data.settings.developerName || DEFAULT_DEVELOPER_NAME
    );
    setData(fresh);
    addToast(
      t(lang, 'नमुना डाटा पुनः लोड गरियो।', 'Nepali demo data has been restored.'),
      'success'
    );
  };

  const clearAllHouseholdData = () => {
    const clean = createEmptyHouseholdData(
      data.settings.householdName,
      data.settings.language,
      data.settings.currency,
      data.settings.theme,
      data.settings.monthlyBudget,
      data.settings.developerName || DEFAULT_DEVELOPER_NAME
    );
    setData(clean);
    addToast(
      t(lang, 'सबै डाटा सफा गरियो।', 'All household records have been cleared.'),
      'warning'
    );
  };

  const exportBackupJSON = () => {
    const payload: AppData = {
      ...data,
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `digital-home-nepal-backup-${getTodayISO()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast(
      t(
        lang,
        'ब्याकअप JSON फाइल डाउनलोड भयो।',
        'Household backup JSON downloaded successfully.'
      ),
      'success'
    );
  };

  const importBackupJSON = (jsonString: string): { ok: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!validateBackupSchema(parsed)) {
        return {
          ok: false,
          error: t(
            lang,
            'फाइलको ढाँचा मिलेन। कृपया Digital Home Nepal बाट एक्सपोर्ट गरिएको सही JSON फाइल छान्नुहोस्।',
            'Invalid backup format. Please select a valid Digital Home Nepal JSON backup file.'
          ),
        };
      }
      const restored: AppData = {
        ...parsed,
        schemaVersion: 1,
        settings: {
          ...parsed.settings,
          hasCompletedOnboarding: true,
        },
      };
      setData(restored);
      addToast(
        t(
          restored.settings.language,
          'ब्याकअप डाटा सफलतापूर्वक रिस्टोर गरियो!',
          'Household backup restored successfully!'
        ),
        'success'
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: t(
          lang,
          'JSON फाइल पढ्न सकिएन। फाइल बिग्रिएको वा अमान्य छ।',
          'Could not parse JSON file. Please verify the file is valid JSON.'
        ),
      };
    }
  };

  // Members CRUD
  const addMember = (member: Omit<FamilyMember, 'id'>) => {
    const newMem: FamilyMember = { ...member, id: makeId('mem'), isDemo: false };
    setData((prev) => ({ ...prev, members: [...prev.members, newMem] }));
    addToast(t(lang, 'परिवारको सदस्य थपियो।', 'Family member added.'));
  };

  const updateMember = (id: string, member: Partial<FamilyMember>) => {
    setData((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === id ? { ...m, ...member, isDemo: false } : m)),
    }));
    addToast(t(lang, 'सदस्य विवरण अद्यावधिक भयो।', 'Member profile updated.'));
  };

  const deleteMember = (id: string) => {
    setData((prev) => {
      if (prev.members.length <= 1) return prev;
      const remaining = prev.members.filter((m) => m.id !== id);
      const fallbackId = remaining[0].id;
      return {
        ...prev,
        members: remaining,
        tasks: prev.tasks.map((tk) =>
          tk.assignedMemberId === id ? { ...tk, assignedMemberId: fallbackId } : tk
        ),
      };
    });
    addToast(t(lang, 'सदस्य हटाइयो।', 'Family member removed.'), 'info');
  };

  // Finance CRUD
  const addFinance = (record: Omit<FinanceRecord, 'id' | 'createdAt'>) => {
    const newRec: FinanceRecord = {
      ...record,
      id: makeId('fin'),
      createdAt: getTodayISO(),
      isDemo: false,
    };
    const nextFinances = [newRec, ...data.finances];
    setData((prev) => ({ ...prev, finances: [newRec, ...prev.finances] }));
    addToast(
      record.type === 'income'
        ? t(lang, 'आम्दानी विवरण थपियो।', 'Income record saved.')
        : t(lang, 'खर्च विवरण थपियो।', 'Expense record saved.')
    );
    if (record.type === 'expense') {
      const ym = record.date.slice(0, 7);
      checkAndNotifyCategoryBudget(
        nextFinances,
        ym,
        record.category,
        data.settings.categoryBudgets,
        lang,
        data.settings.currency
      );
      checkAndNotifyBudgetThreshold(
        nextFinances,
        ym,
        data.settings.monthlyBudget,
        lang,
        data.settings.currency
      );
    }
  };

  const updateFinance = (id: string, record: Omit<FinanceRecord, 'id' | 'createdAt'>) => {
    const nextFinances = data.finances.map((f) =>
      f.id === id ? { ...f, ...record, isDemo: false } : f
    );
    setData((prev) => ({
      ...prev,
      finances: prev.finances.map((f) =>
        f.id === id ? { ...f, ...record, isDemo: false } : f
      ),
    }));
    addToast(t(lang, 'आर्थिक विवरण अद्यावधिक भयो।', 'Finance record updated.'));
    if (record.type === 'expense') {
      const ym = record.date.slice(0, 7);
      checkAndNotifyCategoryBudget(
        nextFinances,
        ym,
        record.category,
        data.settings.categoryBudgets,
        lang,
        data.settings.currency
      );
      checkAndNotifyBudgetThreshold(
        nextFinances,
        ym,
        data.settings.monthlyBudget,
        lang,
        data.settings.currency
      );
    }
  };

  const deleteFinance = (id: string) => {
    setData((prev) => ({
      ...prev,
      finances: prev.finances.filter((f) => f.id !== id),
    }));
    addToast(t(lang, 'विवरण हटाइयो।', 'Record deleted.'), 'info');
  };

  // Bills CRUD
  const addBill = (bill: Omit<BillItem, 'id' | 'paymentHistory'>) => {
    const newBill: BillItem = {
      ...bill,
      id: makeId('bill'),
      paymentHistory:
        bill.status === 'paid'
          ? [
              {
                id: makeId('bp'),
                paidDate: getTodayISO(),
                amount: bill.amount,
                paymentMethod: 'Cash',
                note: t(lang, 'सुरुवाती भुक्तानी', 'Initial payment'),
              },
            ]
          : [],
      isDemo: false,
    };
    setData((prev) => ({ ...prev, bills: [newBill, ...prev.bills] }));
    addToast(t(lang, 'नयाँ बिल थपियो।', 'New bill added.'));
  };

  const updateBill = (id: string, bill: Omit<BillItem, 'id' | 'paymentHistory'>) => {
    setData((prev) => ({
      ...prev,
      bills: prev.bills.map((b) =>
        b.id === id ? { ...b, ...bill, isDemo: false } : b
      ),
    }));
    addToast(t(lang, 'बिल अद्यावधिक भयो।', 'Bill updated.'));
  };

  const deleteBill = (id: string) => {
    setData((prev) => ({
      ...prev,
      bills: prev.bills.filter((b) => b.id !== id),
    }));
    addToast(t(lang, 'बिल हटाइयो।', 'Bill removed.'), 'info');
  };

  const markBillPaid = (
    id: string,
    paymentMethod: PaymentMethod,
    paidDate: string,
    note: string,
    alsoRecordExpense: boolean
  ) => {
    const targetBill = data.bills.find((b) => b.id === id);
    if (!targetBill) return;

    const categoryMap: Record<BillItem['category'], FinanceRecord['category']> = {
      electricity: 'Electricity',
      water: 'Water',
      internet: 'Internet',
      telephone: 'Other',
      rent: 'Rent',
      school_fees: 'Education',
      other: 'Other',
    };

    setData((prev) => {
      const updatedBills = prev.bills.map((b) =>
        b.id === id
          ? {
              ...b,
              status: 'paid' as const,
              isDemo: false,
              paymentHistory: [
                {
                  id: makeId('bp'),
                  paidDate,
                  amount: b.amount,
                  paymentMethod,
                  note,
                },
                ...b.paymentHistory,
              ],
            }
          : b
      );

      const updatedFinances = alsoRecordExpense
        ? [
            {
              id: makeId('fin'),
              title: `${targetBill.billName} (${targetBill.provider})`,
              amount: targetBill.amount,
              type: 'expense' as const,
              category: categoryMap[targetBill.category],
              date: paidDate,
              paymentMethod,
              note: note || t(lang, 'बिल भुक्तानीबाट स्वतः थपिएको', 'Recorded from Bill Manager'),
              createdAt: getTodayISO(),
              isDemo: false,
            },
            ...prev.finances,
          ]
        : prev.finances;

      return {
        ...prev,
        bills: updatedBills,
        finances: updatedFinances,
      };
    });

    addToast(
      alsoRecordExpense
        ? t(lang, 'बिल भुक्तानी भयो र खर्चमा पनि जोडियो!', 'Bill marked paid & logged in expenses!')
        : t(lang, 'बिल भुक्तानी सम्पन्न भयो!', 'Bill marked as paid!')
    );

    if (alsoRecordExpense) {
      const simulatedFinances: FinanceRecord[] = [
        {
          id: 'temp-bill-exp',
          title: `${targetBill.billName} (${targetBill.provider})`,
          amount: targetBill.amount,
          type: 'expense',
          category: categoryMap[targetBill.category],
          date: paidDate,
          paymentMethod,
          note: note || '',
          createdAt: getTodayISO(),
        },
        ...data.finances,
      ];
      const mappedCat = categoryMap[targetBill.category];
      const ym = paidDate.slice(0, 7);
      checkAndNotifyCategoryBudget(
        simulatedFinances,
        ym,
        mappedCat,
        data.settings.categoryBudgets,
        lang,
        data.settings.currency
      );
      checkAndNotifyBudgetThreshold(
        simulatedFinances,
        ym,
        data.settings.monthlyBudget,
        lang,
        data.settings.currency
      );
    }
  };

  const markBillUnpaid = (id: string) => {
    setData((prev) => ({
      ...prev,
      bills: prev.bills.map((b) => (b.id === id ? { ...b, status: 'unpaid' as const } : b)),
    }));
    addToast(t(lang, 'बिल पुनः बाँकी (Unpaid) मा राखियो।', 'Bill status reverted to unpaid.'), 'info');
  };

  // Shopping CRUD
  const addShoppingList = (name: string, budget: number): string => {
    const id = makeId('slist');
    const newList: ShoppingList = {
      id,
      name,
      budget,
      createdAt: getTodayISO(),
      items: [],
      isDemo: false,
    };
    setData((prev) => ({
      ...prev,
      shoppingLists: [...prev.shoppingLists, newList],
    }));
    addToast(t(lang, 'नयाँ किनमेल सूची बन्यो।', 'New shopping list created.'));
    return id;
  };

  const updateShoppingList = (id: string, name: string, budget: number) => {
    setData((prev) => ({
      ...prev,
      shoppingLists: prev.shoppingLists.map((l) =>
        l.id === id ? { ...l, name, budget, isDemo: false } : l
      ),
    }));
    addToast(t(lang, 'किनमेल सूची अद्यावधिक भयो।', 'Shopping list updated.'));
  };

  const deleteShoppingList = (id: string) => {
    setData((prev) => {
      const filtered = prev.shoppingLists.filter((l) => l.id !== id);
      return { ...prev, shoppingLists: filtered };
    });
    addToast(t(lang, 'किनमेल सूची हटाइयो।', 'Shopping list deleted.'), 'info');
  };

  const addShoppingItem = (listId: string, item: Omit<ShoppingItem, 'id'>) => {
    const newItem: ShoppingItem = { ...item, id: makeId('si'), isDemo: false };
    setData((prev) => ({
      ...prev,
      shoppingLists: prev.shoppingLists.map((l) =>
        l.id === listId ? { ...l, items: [...l.items, newItem] } : l
      ),
    }));
    addToast(t(lang, 'सामान सूचीमा थपियो।', 'Item added to shopping list.'));
  };

  const updateShoppingItem = (
    listId: string,
    itemId: string,
    item: Omit<ShoppingItem, 'id'>
  ) => {
    setData((prev) => ({
      ...prev,
      shoppingLists: prev.shoppingLists.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) =>
                i.id === itemId ? { ...i, ...item, isDemo: false } : i
              ),
            }
          : l
      ),
    }));
    addToast(t(lang, 'सामान अद्यावधिक भयो।', 'Shopping item updated.'));
  };

  const toggleShoppingItem = (listId: string, itemId: string) => {
    setData((prev) => ({
      ...prev,
      shoppingLists: prev.shoppingLists.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) =>
                i.id === itemId ? { ...i, purchased: !i.purchased } : i
              ),
            }
          : l
      ),
    }));
  };

  const deleteShoppingItem = (listId: string, itemId: string) => {
    setData((prev) => ({
      ...prev,
      shoppingLists: prev.shoppingLists.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.filter((i) => i.id !== itemId) }
          : l
      ),
    }));
    addToast(t(lang, 'सामान हटाइयो।', 'Item removed.'), 'info');
  };

  const clearPurchasedItems = (listId: string) => {
    setData((prev) => ({
      ...prev,
      shoppingLists: prev.shoppingLists.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.filter((i) => !i.purchased) }
          : l
      ),
    }));
    addToast(t(lang, 'किनिसकेका सामानहरू सूचीबाट हटाइयो।', 'Cleared purchased items.'), 'info');
  };

  // Tasks CRUD
  const addTask = (task: Omit<FamilyTask, 'id'>) => {
    const newTask: FamilyTask = {
      ...task,
      id: makeId('task'),
      completedAt: task.status === 'completed' ? getTodayISO() : undefined,
      isDemo: false,
    };
    setData((prev) => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
    addToast(t(lang, 'नयाँ घरायसी काम थपियो।', 'Family task added.'));
  };

  const updateTask = (id: string, task: Omit<FamilyTask, 'id'>) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tk) =>
        tk.id === id
          ? {
              ...tk,
              ...task,
              completedAt:
                task.status === 'completed'
                  ? tk.completedAt || getTodayISO()
                  : undefined,
              isDemo: false,
            }
          : tk
      ),
    }));
    addToast(t(lang, 'काम अद्यावधिक भयो।', 'Task updated.'));
  };

  const cycleTaskStatus = (id: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tk) => {
        if (tk.id !== id) return tk;
        const nextStatus =
          tk.status === 'pending'
            ? 'in_progress'
            : tk.status === 'in_progress'
              ? 'completed'
              : 'pending';
        return {
          ...tk,
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? getTodayISO() : undefined,
        };
      }),
    }));
  };

  const deleteTask = (id: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((tk) => tk.id !== id),
    }));
    addToast(t(lang, 'काम हटाइयो।', 'Task removed.'), 'info');
  };

  // Calendar CRUD
  const addEvent = (evt: Omit<CalendarEvent, 'id'>) => {
    const newEvt: CalendarEvent = { ...evt, id: makeId('evt'), isDemo: false };
    setData((prev) => ({ ...prev, events: [...prev.events, newEvt] }));
    addToast(t(lang, 'क्यालेन्डर कार्यक्रम थपियो।', 'Calendar event saved.'));
  };

  const updateEvent = (id: string, evt: Omit<CalendarEvent, 'id'>) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === id ? { ...e, ...evt, isDemo: false } : e)),
    }));
    addToast(t(lang, 'कार्यक्रम अद्यावधिक भयो।', 'Calendar event updated.'));
  };

  const deleteEvent = (id: string) => {
    setData((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== id),
    }));
    addToast(t(lang, 'कार्यक्रम हटाइयो।', 'Event removed.'), 'info');
  };

  // Maintenance CRUD
  const addMaintenance = (rec: Omit<MaintenanceRecord, 'id'>) => {
    const newRec: MaintenanceRecord = { ...rec, id: makeId('maint'), isDemo: false };
    setData((prev) => ({ ...prev, maintenance: [newRec, ...prev.maintenance] }));
    addToast(t(lang, 'घर मर्मत विवरण थपियो।', 'Maintenance log added.'));
  };

  const updateMaintenance = (id: string, rec: Omit<MaintenanceRecord, 'id'>) => {
    setData((prev) => ({
      ...prev,
      maintenance: prev.maintenance.map((m) =>
        m.id === id ? { ...m, ...rec, isDemo: false } : m
      ),
    }));
    addToast(t(lang, 'मर्मत विवरण अद्यावधिक भयो।', 'Maintenance record updated.'));
  };

  const deleteMaintenance = (id: string) => {
    setData((prev) => ({
      ...prev,
      maintenance: prev.maintenance.filter((m) => m.id !== id),
    }));
    addToast(t(lang, 'मर्मत विवरण हटाइयो।', 'Maintenance record removed.'), 'info');
  };

  return (
    <HomeContext.Provider
      value={{
        data,
        activeSection,
        setActiveSection,
        quickModal,
        setQuickModal,
        toasts,
        addToast,
        dismissToast,
        confirmState,
        requestConfirm,
        closeConfirm,
        completeOnboardingWithDemo,
        completeOnboardingClean,
        updateSettings,
        updateCategoryBudgets,
        toggleLanguage,
        toggleTheme,
        removeDemoDataOnly,
        resetToDemoData,
        clearAllHouseholdData,
        exportBackupJSON,
        importBackupJSON,
        addMember,
        updateMember,
        deleteMember,
        addFinance,
        updateFinance,
        deleteFinance,
        addBill,
        updateBill,
        deleteBill,
        markBillPaid,
        markBillUnpaid,
        addShoppingList,
        updateShoppingList,
        deleteShoppingList,
        addShoppingItem,
        updateShoppingItem,
        toggleShoppingItem,
        deleteShoppingItem,
        clearPurchasedItems,
        addTask,
        updateTask,
        cycleTaskStatus,
        deleteTask,
        addEvent,
        updateEvent,
        deleteEvent,
        addMaintenance,
        updateMaintenance,
        deleteMaintenance,
      }}
    >
      {children}
    </HomeContext.Provider>
  );
};

export function useHome(): HomeContextValue {
  const ctx = useContext(HomeContext);
  if (!ctx) {
    throw new Error('useHome must be used inside HomeProvider');
  }
  return ctx;
}
