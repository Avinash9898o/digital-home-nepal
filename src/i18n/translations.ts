import {
  BillCategory,
  CurrencyCode,
  EventCategory,
  FinanceCategory,
  Language,
  MaintenanceCategory,
  MaintenanceStatus,
  NavSection,
  PaymentMethod,
  ShoppingCategory,
  TaskPriority,
  TaskStatus,
} from '../types';

export const CURRENCY_META: Record<
  CurrencyCode,
  { symbol: string; labelNe: string; labelEn: string }
> = {
  NPR: {
    symbol: 'रु.',
    labelNe: 'नेपाली रुपैयाँ (NPR - रु.)',
    labelEn: 'Nepali Rupee (NPR - रु.)',
  },
  AUD: {
    symbol: 'A$',
    labelNe: 'अस्ट्रेलियन डलर (AUD - A$)',
    labelEn: 'Australian Dollar (AUD - A$)',
  },
  USD: {
    symbol: '$',
    labelNe: 'अमेरिकी डलर (USD - $)',
    labelEn: 'US Dollar (USD - $)',
  },
};

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_META[currency].symbol;
  const abs = Math.abs(amount);
  const formatted =
    currency === 'NPR'
      ? abs.toLocaleString('en-IN', {
          minimumFractionDigits: abs % 1 !== 0 ? 2 : 0,
          maximumFractionDigits: 2,
        })
      : abs.toLocaleString('en-US', {
          minimumFractionDigits: abs % 1 !== 0 ? 2 : 0,
          maximumFractionDigits: 2,
        });
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol} ${formatted}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function diffDaysFromToday(isoDate: string): number {
  const today = new Date(getTodayISO() + 'T00:00:00');
  const target = new Date(isoDate + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const MONTHS_SHORT_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MONTHS_NE = [
  'जनवरी',
  'फेब्रुअरी',
  'मार्च',
  'अप्रिल',
  'मे',
  'जुन',
  'जुलाई',
  'अगस्ट',
  'सेप्टेम्बर',
  'अक्टोबर',
  'नोभेम्बर',
  'डिसेम्बर',
];

export function formatDateReadable(isoDate: string, lang: Language): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  if (lang === 'ne') {
    return `${d} ${MONTHS_NE[m - 1]} ${y}`;
  }
  return `${MONTHS_SHORT_EN[m - 1]} ${d}, ${y}`;
}

export function formatMonthYear(yearMonth: string, lang: Language): string {
  if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) return yearMonth;
  const [y, m] = yearMonth.split('-').map(Number);
  if (lang === 'ne') {
    return `${MONTHS_NE[m - 1]} ${y}`;
  }
  return `${MONTHS_SHORT_EN[m - 1]} ${y}`;
}

export function getRelativeDueText(isoDate: string, lang: Language): string {
  const diff = diffDaysFromToday(isoDate);
  if (diff === 0) return lang === 'ne' ? 'आज' : 'Today';
  if (diff === 1) return lang === 'ne' ? 'भोलि' : 'Tomorrow';
  if (diff === -1) return lang === 'ne' ? 'हिजो' : 'Yesterday';
  if (diff < -1) {
    return lang === 'ne'
      ? `${Math.abs(diff)} दिन ढिलो`
      : `${Math.abs(diff)}d overdue`;
  }
  return lang === 'ne' ? `${diff} दिन बाँकी` : `In ${diff}d`;
}

export const NAV_LABELS: Record<NavSection, { ne: string; en: string; shortNe: string; shortEn: string }> = {
  dashboard: { ne: 'गृहपृष्ठ', en: 'Dashboard', shortNe: 'गृहपृष्ठ', shortEn: 'Home' },
  assistant: { ne: 'सहायता र AI सहायक', en: 'Help & AI Assistance', shortNe: 'सहायता AI', shortEn: 'Help · AI' },
  finance: { ne: 'घरको खर्च', en: 'Home Finance', shortNe: 'खर्च', shortEn: 'Finance' },
  bills: { ne: 'बिल तथा रिमाइन्डर', en: 'Bills & Reminders', shortNe: 'बिल', shortEn: 'Bills' },
  shopping: { ne: 'किनमेल सूची', en: 'Shopping', shortNe: 'किनमेल', shortEn: 'Shopping' },
  tasks: { ne: 'परिवारका काम', en: 'Family Tasks', shortNe: 'कामहरू', shortEn: 'Tasks' },
  calendar: { ne: 'पारिवारिक क्यालेन्डर', en: 'Family Calendar', shortNe: 'क्यालेन्डर', shortEn: 'Calendar' },
  maintenance: { ne: 'घर मर्मत', en: 'Home Maintenance', shortNe: 'मर्मत', shortEn: 'Maint.' },
  reports: { ne: 'रिपोर्ट', en: 'Reports', shortNe: 'रिपोर्ट', shortEn: 'Reports' },
  settings: { ne: 'सेटिङ्स', en: 'Settings', shortNe: 'सेटिङ्स', shortEn: 'Settings' },
};

export const FINANCE_CATEGORY_LABELS: Record<FinanceCategory, { ne: string; en: string }> = {
  Food: { ne: 'खाना र भान्सा', en: 'Food' },
  Rent: { ne: 'घरभाडा', en: 'Rent' },
  Education: { ne: 'शिक्षा', en: 'Education' },
  Health: { ne: 'स्वास्थ्य', en: 'Health' },
  Transport: { ne: 'यातायात', en: 'Transport' },
  Shopping: { ne: 'किनमेल', en: 'Shopping' },
  Electricity: { ne: 'बिजुली', en: 'Electricity' },
  Water: { ne: 'खानेपानी', en: 'Water' },
  Internet: { ne: 'इन्टरनेट', en: 'Internet' },
  Salary: { ne: 'तलब', en: 'Salary' },
  Business: { ne: 'व्यवसाय', en: 'Business' },
  Other: { ne: 'अन्य', en: 'Other' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { ne: string; en: string }> = {
  Cash: { ne: 'नगद', en: 'Cash' },
  'eSewa / Khalti': { ne: 'ई-सेवा / खल्ती', en: 'eSewa / Khalti' },
  'Bank Transfer': { ne: 'बैंक ट्रान्सफर', en: 'Bank Transfer' },
  Card: { ne: 'डेबिट/क्रेडिट कार्ड', en: 'Card' },
  Cheque: { ne: 'चेक', en: 'Cheque' },
};

export const BILL_CATEGORY_LABELS: Record<BillCategory, { ne: string; en: string }> = {
  electricity: { ne: 'बिजुली (NEA)', en: 'Electricity' },
  water: { ne: 'खानेपानी', en: 'Water' },
  internet: { ne: 'इन्टरनेट', en: 'Internet' },
  telephone: { ne: 'टेलिफोन / मोबाइल', en: 'Telephone' },
  rent: { ne: 'घरभाडा', en: 'Rent' },
  school_fees: { ne: 'स्कूल / कलेज शुल्क', en: 'School Fees' },
  other: { ne: 'अन्य बिल', en: 'Other' },
};

export const SHOPPING_CATEGORY_LABELS: Record<ShoppingCategory, { ne: string; en: string }> = {
  groceries: { ne: 'चामल, दाल र खाद्यान्न', en: 'Groceries & Staples' },
  vegetables: { ne: 'तरकारी तथा फलफूल', en: 'Vegetables & Fruits' },
  dairy: { ne: 'दूध, दही र बेकरी', en: 'Dairy & Bakery' },
  household: { ne: 'घर सरसफाइ र सामान', en: 'Household Supplies' },
  festival: { ne: 'पूजा र चाडपर्व सामान', en: 'Puja & Festival Items' },
  health: { ne: 'औषधि र स्वास्थ्य', en: 'Pharmacy & Care' },
  other: { ne: 'अन्य', en: 'Other' },
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, { ne: string; en: string }> = {
  high: { ne: 'उच्च प्राथमिकता', en: 'High' },
  medium: { ne: 'मध्यम', en: 'Medium' },
  low: { ne: 'सामान्य', en: 'Low' },
};

export const TASK_STATUS_LABELS: Record<TaskStatus, { ne: string; en: string }> = {
  pending: { ne: 'बाँकी', en: 'Pending' },
  in_progress: { ne: 'हुँदैछ', en: 'In Progress' },
  completed: { ne: 'सम्पन्न', en: 'Completed' },
};

export const EVENT_CATEGORY_LABELS: Record<EventCategory, { ne: string; en: string }> = {
  birthday: { ne: 'जन्मदिन', en: 'Birthday' },
  anniversary: { ne: 'वैवाहिक वार्षिकोत्सव', en: 'Anniversary' },
  school: { ne: 'स्कूल कार्यक्रम', en: 'School Event' },
  appointment: { ne: 'भेटघाट / स्वास्थ्य जाँच', en: 'Appointment' },
  festival: { ne: 'चाडपर्व / पूजा', en: 'Festival' },
  gathering: { ne: 'पारिवारिक जमघट', en: 'Family Gathering' },
};

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, { ne: string; en: string }> = {
  cleaning: { ne: 'घर तथा ट्याङ्की सरसफाइ', en: 'House Cleaning' },
  plumbing: { ne: 'धारा र प्लम्बिङ', en: 'Plumbing' },
  electricity: { ne: 'बिजुली र वायरिङ', en: 'Electricity' },
  painting: { ne: 'रङरोगन', en: 'Painting' },
  appliance: { ne: 'उपकरण सर्भिसिङ', en: 'Appliance Servicing' },
  gardening: { ne: 'बगैँचा र कौसी खेती', en: 'Gardening' },
  repairs: { ne: 'सामान्य मर्मत', en: 'Repairs' },
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, { ne: string; en: string }> = {
  scheduled: { ne: 'तालिकामा रहेको', en: 'Scheduled' },
  in_progress: { ne: 'काम भइरहेको', en: 'In Progress' },
  completed: { ne: 'सम्पन्न', en: 'Completed' },
  needs_attention: { ne: 'तुरुन्त हेर्नुपर्ने', en: 'Needs Attention' },
};

export function t(lang: Language, neText: string, enText: string): string {
  return lang === 'ne' ? neText : enText;
}
