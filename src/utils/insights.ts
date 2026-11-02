import {
  diffDaysFromToday,
  FINANCE_CATEGORY_LABELS,
  formatCurrency,
  getTodayISO,
} from '../i18n/translations';
import { AppData, FinanceCategory, Language, NavSection } from '../types';

export interface SmartInsight {
  id: string;
  severity: 'urgent' | 'warning' | 'positive' | 'info';
  title: string;
  suggestion: string;
  targetSection: NavSection;
  actionLabel: string;
}

export function generateLocalHouseholdInsights(
  data: AppData,
  lang: Language
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { currency, monthlyBudget } = data.settings;
  const currentMonth = getTodayISO().slice(0, 7);

  // 1. Overdue & Upcoming Unpaid Bills
  const unpaidBills = data.bills.filter((b) => b.status === 'unpaid');
  const overdueBills = unpaidBills.filter((b) => diffDaysFromToday(b.dueDate) < 0);
  const dueSoonBills = unpaidBills.filter((b) => {
    const d = diffDaysFromToday(b.dueDate);
    return d >= 0 && d <= 5;
  });

  if (overdueBills.length > 0) {
    const overdueSum = overdueBills.reduce((acc, b) => acc + b.amount, 0);
    insights.push({
      id: 'ins-overdue-bills',
      severity: 'urgent',
      title:
        lang === 'ne'
          ? `${overdueBills.length} वटा बिलको म्याद नाघिसकेको छ (${formatCurrency(overdueSum, currency)})`
          : `${overdueBills.length} overdue bill${overdueBills.length > 1 ? 's' : ''} (${formatCurrency(overdueSum, currency)})`,
      suggestion:
        lang === 'ne'
          ? `जरिवानाबाट बच्न "${overdueBills[0].billName}" लगायतका बाँकी बिलहरू समयमै भुक्तानी गर्नुहोस्।`
          : `Settle "${overdueBills[0].billName}" soon to avoid late fees or service disruption.`,
      targetSection: 'bills',
      actionLabel: lang === 'ne' ? 'बिल तिर्नुहोस्' : 'Review Bills',
    });
  } else if (dueSoonBills.length > 0) {
    const soonSum = dueSoonBills.reduce((acc, b) => acc + b.amount, 0);
    insights.push({
      id: 'ins-upcoming-bills',
      severity: 'warning',
      title:
        lang === 'ne'
          ? `आगामी ५ दिनभित्र ${dueSoonBills.length} वटा बिल तिर्नुपर्नेछ`
          : `${dueSoonBills.length} bill${dueSoonBills.length > 1 ? 's' : ''} due within 5 days`,
      suggestion:
        lang === 'ne'
          ? `कुल ${formatCurrency(soonSum, currency)} बराबरको बिल समयमै भुक्तानी गर्दा छुट (रिबेट) पाउन सकिन्छ।`
          : `Prepare ${formatCurrency(soonSum, currency)} for upcoming utility payments to stay ahead.`,
      targetSection: 'bills',
      actionLabel: lang === 'ne' ? 'बिल हेर्नुहोस्' : 'View Bills',
    });
  }

  // 2. Monthly Budget Utilization & High Spending Category
  const monthExpenses = data.finances.filter(
    (f) => f.type === 'expense' && f.date.startsWith(currentMonth)
  );
  const totalMonthExpense = monthExpenses.reduce((s, f) => s + f.amount, 0);

  if (monthlyBudget > 0) {
    const pct = Math.round((totalMonthExpense / monthlyBudget) * 100);
    if (totalMonthExpense > monthlyBudget) {
      const overBy = totalMonthExpense - monthlyBudget;
      insights.push({
        id: 'ins-budget-overrun',
        severity: 'urgent',
        title:
          lang === 'ne'
            ? `यस महिनाको बजेट ${formatCurrency(overBy, currency)} ले नाघेको छ (${pct}%)`
            : `Monthly budget exceeded by ${formatCurrency(overBy, currency)} (${pct}%)`,
        suggestion:
          lang === 'ne'
            ? 'अत्यावश्यक बाहेकका किनमेल अर्को महिनालाई सारेर खर्च सन्तुलनमा राख्ने प्रयास गर्नुहोस्।'
            : 'Consider pausing non-essential purchases for the remainder of the month.',
        targetSection: 'finance',
        actionLabel: lang === 'ne' ? 'खर्च विश्लेषण' : 'Inspect Spending',
      });
    } else if (totalMonthExpense > monthlyBudget * 0.8) {
      const exactPct =
        pct <= 80
          ? ((totalMonthExpense / monthlyBudget) * 100).toFixed(1)
          : String(pct);
      insights.push({
        id: 'ins-budget-near',
        severity: 'warning',
        title:
          lang === 'ne'
            ? `मासिक बजेटको ${exactPct}% खर्च भइसकेको छ (८०% सीमा पार)`
            : `Monthly expenses exceeded 80% (${exactPct}% of budget used)`,
        suggestion:
          lang === 'ne'
            ? `अब यस महिनाका लागि ${formatCurrency(monthlyBudget - totalMonthExpense, currency)} मात्र बाँकी छ। दैनिक खर्चमा ध्यान दिनुहोला।`
            : `${formatCurrency(monthlyBudget - totalMonthExpense, currency)} remaining in this month's budget.`,
        targetSection: 'finance',
        actionLabel: lang === 'ne' ? 'बजेट हेर्नुहोस्' : 'Check Budget',
      });
    } else if (totalMonthExpense > 0) {
      insights.push({
        id: 'ins-budget-healthy',
        severity: 'positive',
        title:
          lang === 'ne'
            ? `बजेट सन्तुलित छ: ${pct}% मात्र खर्च भएको छ`
            : `Healthy budget pace: ${pct}% used this month`,
        suggestion:
          lang === 'ne'
            ? `मासिक बजेटमध्ये ${formatCurrency(monthlyBudget - totalMonthExpense, currency)} सुरक्षित छ। बचत कोषमा रकम छुट्याउन उत्तम समय!`
            : `You still have ${formatCurrency(monthlyBudget - totalMonthExpense, currency)} available within your monthly target.`,
        targetSection: 'finance',
        actionLabel: lang === 'ne' ? 'आम्दानी-खर्च' : 'View Finance',
      });
    }
  }

  // Top Spending Category
  if (monthExpenses.length > 0) {
    const byCat: Partial<Record<FinanceCategory, number>> = {};
    for (const exp of monthExpenses) {
      byCat[exp.category] = (byCat[exp.category] || 0) + exp.amount;
    }
    const sorted = Object.entries(byCat).sort((a, b) => (b[1] || 0) - (a[1] || 0));
    if (sorted.length > 0) {
      const [topCat, topAmt] = sorted[0] as [FinanceCategory, number];
      const share = Math.round((topAmt / totalMonthExpense) * 100);
      const catLabel = FINANCE_CATEGORY_LABELS[topCat][lang];
      if (share >= 35) {
        insights.push({
          id: 'ins-top-category',
          severity: 'info',
          title:
            lang === 'ne'
              ? `सबैभन्दा बढी खर्च "${catLabel}" मा (${share}%)`
              : `Highest spending in ${catLabel} (${share}% of month)`,
          suggestion:
            lang === 'ne'
              ? `यस महिना "${catLabel}" मा ${formatCurrency(topAmt, currency)} खर्च भएको छ। थोकमा सामान किन्दा वा योजना बनाउँदा बचत हुन सक्छ।`
              : `${formatCurrency(topAmt, currency)} spent on ${catLabel} this month. Planning ahead can help optimize recurring costs.`,
          targetSection: 'reports',
          actionLabel: lang === 'ne' ? 'रिपोर्ट हेर्नुहोस्' : 'See Breakdown',
        });
      }
    }
  }

  // 3. Urgent / Today's Family Tasks
  const activeTasks = data.tasks.filter((t) => t.status !== 'completed');
  const dueTodayOrLate = activeTasks.filter((t) => diffDaysFromToday(t.dueDate) <= 0);
  if (dueTodayOrLate.length > 0) {
    insights.push({
      id: 'ins-tasks-today',
      severity: 'warning',
      title:
        lang === 'ne'
          ? `आज वा म्याद नाघेका ${dueTodayOrLate.length} वटा घरायसी काम बाँकी छन्`
          : `${dueTodayOrLate.length} household task${dueTodayOrLate.length > 1 ? 's' : ''} due today or overdue`,
      suggestion:
        lang === 'ne'
          ? `प्रमुख काम: "${dueTodayOrLate[0].title}" — परिवारका सदस्यहरूबीच समन्वय गरी पूरा गर्नुहोस्।`
          : `Next up: "${dueTodayOrLate[0].title}". Check off completed chores to keep family momentum.`,
      targetSection: 'tasks',
      actionLabel: lang === 'ne' ? 'कामहरू हेर्नुहोस्' : 'Open Tasks',
    });
  }

  // 4. Pending Home Maintenance
  const urgentMaint = data.maintenance.filter(
    (m) =>
      m.status === 'needs_attention' ||
      (m.status !== 'completed' && diffDaysFromToday(m.nextMaintenanceDate) <= 7)
  );
  if (urgentMaint.length > 0) {
    insights.push({
      id: 'ins-maint-alert',
      severity: 'warning',
      title:
        lang === 'ne'
          ? `घर मर्मत सम्झना: "${urgentMaint[0].title}"`
          : `Maintenance due soon: "${urgentMaint[0].title}"`,
      suggestion:
        lang === 'ne'
          ? 'समयमै सर्भिसिङ गर्दा ठूला मर्मत खर्च र अचानक बिग्रिने समस्याबाट जोगिन सकिन्छ।'
          : 'Timely servicing prevents costly emergency repairs later.',
      targetSection: 'maintenance',
      actionLabel: lang === 'ne' ? 'मर्मत तालिका' : 'View Maintenance',
    });
  }

  // 5. Shopping Estimates vs Shopping Budget
  const pendingShoppingStats = data.shoppingLists.reduce(
    (acc, list) => {
      const unpurchased = list.items.filter((i) => !i.purchased);
      const est = unpurchased.reduce((s, i) => s + i.estimatedPrice, 0);
      const totalListEst = list.items.reduce((s, i) => s + i.estimatedPrice, 0);
      return {
        pendingCount: acc.pendingCount + unpurchased.length,
        pendingAmount: acc.pendingAmount + est,
        overBudgetLists:
          totalListEst > list.budget && list.budget > 0
            ? acc.overBudgetLists + 1
            : acc.overBudgetLists,
      };
    },
    { pendingCount: 0, pendingAmount: 0, overBudgetLists: 0 }
  );

  if (pendingShoppingStats.pendingCount > 0) {
    insights.push({
      id: 'ins-shopping-est',
      severity: pendingShoppingStats.overBudgetLists > 0 ? 'warning' : 'info',
      title:
        lang === 'ne'
          ? `किनमेल सूचीमा ${pendingShoppingStats.pendingCount} सामान बाँकी (अनुमानित ${formatCurrency(pendingShoppingStats.pendingAmount, currency)})`
          : `${pendingShoppingStats.pendingCount} unpurchased items (est. ${formatCurrency(pendingShoppingStats.pendingAmount, currency)})`,
      suggestion:
        pendingShoppingStats.overBudgetLists > 0
          ? lang === 'ne'
            ? 'कुनै किनमेल सूचीको अनुमानित रकम तोकिएको बजेटभन्दा बढी छ। बजार जानुअघि सूची पुनरावलोकन गर्नुहोस्।'
            : 'One of your shopping lists exceeds its target budget. Review quantities before heading to the market.'
          : lang === 'ne'
            ? 'बजार जानुअघि सूची जाँच्दा अनावश्यक सामान किन्ने बानी घट्छ र समय बचत हुन्छ।'
            : 'Reviewing your list before visiting the market prevents impulse purchases.',
      targetSection: 'shopping',
      actionLabel: lang === 'ne' ? 'किनमेल सूची' : 'Open Shopping',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'ins-all-clear',
      severity: 'positive',
      title:
        lang === 'ne'
          ? 'सबै घरायसी काम र बिलहरू अद्यावधिक छन्!'
          : 'All household bills and tasks are on track!',
      suggestion:
        lang === 'ne'
          ? 'नियमित आम्दानी, खर्च र बिलहरू टिपोट गर्दै जाँदा पारिवारिक आर्थिक योजना अझ प्रभावकारी बन्छ।'
          : 'Keep logging your daily expenses and events for accurate monthly reports.',
      targetSection: 'finance',
      actionLabel: lang === 'ne' ? 'नयाँ रेकर्ड थप्नुहोस्' : 'Add Record',
    });
  }

  return insights;
}
