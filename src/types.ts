export type Language = 'ne' | 'en';
export type CurrencyCode = 'NPR' | 'AUD' | 'USD';
export type ThemeMode = 'light' | 'dark';

export type NavSection =
  | 'dashboard'
  | 'assistant'
  | 'finance'
  | 'bills'
  | 'shopping'
  | 'tasks'
  | 'calendar'
  | 'maintenance'
  | 'reports'
  | 'settings';

export type FinanceType = 'income' | 'expense';

export type FinanceCategory =
  | 'Food'
  | 'Rent'
  | 'Education'
  | 'Health'
  | 'Transport'
  | 'Shopping'
  | 'Electricity'
  | 'Water'
  | 'Internet'
  | 'Salary'
  | 'Business'
  | 'Other';

export type PaymentMethod =
  | 'Cash'
  | 'eSewa / Khalti'
  | 'Bank Transfer'
  | 'Card'
  | 'Cheque';

export interface FinanceRecord {
  id: string;
  title: string;
  amount: number;
  type: FinanceType;
  category: FinanceCategory;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  note: string;
  createdAt: string;
  isDemo?: boolean;
}

export type BillCategory =
  | 'electricity'
  | 'water'
  | 'internet'
  | 'telephone'
  | 'rent'
  | 'school_fees'
  | 'other';

export interface BillPaymentEntry {
  id: string;
  paidDate: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: PaymentMethod;
  note: string;
}

export interface BillItem {
  id: string;
  provider: string;
  billName: string;
  category: BillCategory;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'paid' | 'unpaid';
  notes: string;
  paymentHistory: BillPaymentEntry[];
  isDemo?: boolean;
}

export type ShoppingCategory =
  | 'groceries'
  | 'vegetables'
  | 'dairy'
  | 'household'
  | 'festival'
  | 'health'
  | 'other';

export interface ShoppingItem {
  id: string;
  product: string;
  quantity: string;
  estimatedPrice: number;
  category: ShoppingCategory;
  purchased: boolean;
  isDemo?: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  budget: number;
  createdAt: string;
  items: ShoppingItem[];
  isDemo?: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  isDemo?: boolean;
}

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface FamilyTask {
  id: string;
  title: string;
  description: string;
  assignedMemberId: string;
  dueDate: string; // YYYY-MM-DD
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: string;
  isDemo?: boolean;
}

export type EventCategory =
  | 'birthday'
  | 'anniversary'
  | 'school'
  | 'appointment'
  | 'festival'
  | 'gathering';

export type CalendarSourceType = 'verified_gregorian' | 'manual_festival';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (Gregorian ISO)
  time?: string;
  category: EventCategory;
  sourceType: CalendarSourceType;
  location: string;
  notes: string;
  isDemo?: boolean;
}

export type MaintenanceCategory =
  | 'cleaning'
  | 'plumbing'
  | 'electricity'
  | 'painting'
  | 'appliance'
  | 'gardening'
  | 'repairs';

export type MaintenanceStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'needs_attention';

export interface MaintenanceRecord {
  id: string;
  title: string;
  category: MaintenanceCategory;
  cost: number;
  date: string; // YYYY-MM-DD
  nextMaintenanceDate: string; // YYYY-MM-DD
  status: MaintenanceStatus;
  notes: string;
  isDemo?: boolean;
}

export interface HouseholdSettings {
  householdName: string;
  developerName?: string;
  monthlyBudget: number;
  categoryBudgets?: Partial<Record<FinanceCategory, number>>;
  language: Language;
  currency: CurrencyCode;
  theme: ThemeMode;
  hasCompletedOnboarding: boolean;
  hasDemoData: boolean;
}

export interface AppData {
  schemaVersion: number;
  exportedAt?: string;
  settings: HouseholdSettings;
  members: FamilyMember[];
  finances: FinanceRecord[];
  bills: BillItem[];
  shoppingLists: ShoppingList[];
  tasks: FamilyTask[];
  events: CalendarEvent[];
  maintenance: MaintenanceRecord[];
}

export type QuickModalType =
  | null
  | 'expense'
  | 'income'
  | 'bill'
  | 'shopping'
  | 'task'
  | 'event'
  | 'maintenance';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}
