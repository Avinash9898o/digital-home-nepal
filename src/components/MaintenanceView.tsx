import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit2,
  Plus,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import {
  CURRENCY_META,
  diffDaysFromToday,
  formatCurrency,
  formatDateReadable,
  getRelativeDueText,
  getTodayISO,
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  t,
} from '../i18n/translations';
import {
  MaintenanceCategory,
  MaintenanceRecord,
  MaintenanceStatus,
} from '../types';

const MAINT_CATEGORIES = Object.keys(MAINTENANCE_CATEGORY_LABELS) as MaintenanceCategory[];
const MAINT_STATUSES = Object.keys(MAINTENANCE_STATUS_LABELS) as MaintenanceStatus[];

export const MaintenanceView: React.FC = () => {
  const {
    data,
    addMaintenance,
    updateMaintenance,
    deleteMaintenance,
    requestConfirm,
  } = useHome();

  const lang = data.settings.language;
  const currency = data.settings.currency;
  const currencySymbol = CURRENCY_META[currency].symbol;

  const [catFilter, setCatFilter] = useState<'all' | MaintenanceCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | MaintenanceStatus>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<MaintenanceRecord | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('cleaning');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState(getTodayISO());
  const [status, setStatus] = useState<MaintenanceStatus>('scheduled');
  const [notes, setNotes] = useState('');
  const [formErr, setFormErr] = useState('');

  const upcomingReminders = useMemo(
    () =>
      data.maintenance
        .filter(
          (m) =>
            m.status === 'needs_attention' ||
            (m.status !== 'completed' && diffDaysFromToday(m.nextMaintenanceDate) <= 14)
        )
        .sort((a, b) => a.nextMaintenanceDate.localeCompare(b.nextMaintenanceDate)),
    [data.maintenance]
  );

  const totalSpent = useMemo(
    () => data.maintenance.reduce((s, m) => s + m.cost, 0),
    [data.maintenance]
  );

  const filteredRecords = useMemo(() => {
    return data.maintenance
      .filter((m) => {
        if (catFilter !== 'all' && m.category !== catFilter) return false;
        if (statusFilter !== 'all' && m.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => a.nextMaintenanceDate.localeCompare(b.nextMaintenanceDate));
  }, [data.maintenance, catFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingRec(null);
    setTitle('');
    setCategory('cleaning');
    setCost('');
    const today = getTodayISO();
    const next90 = new Date();
    next90.setDate(next90.getDate() + 90);
    setDate(today);
    setNextMaintenanceDate(next90.toISOString().slice(0, 10));
    setStatus('scheduled');
    setNotes('');
    setFormErr('');
    setModalOpen(true);
  };

  const openEditModal = (rec: MaintenanceRecord) => {
    setEditingRec(rec);
    setTitle(rec.title);
    setCategory(rec.category);
    setCost(String(rec.cost));
    setDate(rec.date);
    setNextMaintenanceDate(rec.nextMaintenanceDate);
    setStatus(rec.status);
    setNotes(rec.notes);
    setFormErr('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormErr(t(lang, 'कृपया मर्मत कार्यको शीर्षक लेख्नुहोस्।', 'Please enter a title.'));
      return;
    }
    const costNum = Number(cost || '0');
    if (Number.isNaN(costNum) || costNum < 0) {
      setFormErr(t(lang, 'कृपया मान्य लागत रकम राख्नुहोस्।', 'Please enter a valid cost.'));
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      cost: costNum,
      date,
      nextMaintenanceDate,
      status,
      notes: notes.trim(),
    };

    if (editingRec) {
      updateMaintenance(editingRec.id, payload);
    } else {
      addMaintenance(payload);
    }
    setModalOpen(false);
  };

  const markServicedToday = (rec: MaintenanceRecord) => {
    const today = getTodayISO();
    const next = new Date();
    next.setDate(next.getDate() + 90);
    updateMaintenance(rec.id, {
      title: rec.title,
      category: rec.category,
      cost: rec.cost,
      date: today,
      nextMaintenanceDate: next.toISOString().slice(0, 10),
      status: 'completed',
      notes: rec.notes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'घर मर्मत तथा सर्भिसिङ', 'Home Maintenance Tracker')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t(
              lang,
              'सरसफाइ, प्लम्बिङ, बिजुली, रङरोगन, उपकरण सर्भिसिङ र कौसी बगैँचाको नियमित रेखदेख',
              'Track house cleaning, plumbing, electrical, painting, appliance servicing, gardening, and repairs'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="self-start sm:self-auto min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:opacity-90 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t(lang, 'मर्मत थप्नुहोस्', 'Add Maintenance')}</span>
        </button>
      </div>

      {/* Upcoming Maintenance Alert */}
      {upcomingReminders.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="font-bold text-amber-900 dark:text-amber-200">
              {t(
                lang,
                `आगामी मर्मत सम्झना: ${upcomingReminders.length} वटा काममा ध्यान दिनुपर्नेछ`,
                `${upcomingReminders.length} Maintenance Item${upcomingReminders.length > 1 ? 's' : ''} Due Soon or Needing Attention`
              )}
            </div>
            <p className="text-amber-800 dark:text-amber-300">
              {upcomingReminders
                .map(
                  (m) =>
                    `${m.title} (${getRelativeDueText(m.nextMaintenanceDate, lang)})`
                )
                .join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t(lang, 'जम्मा मर्मत लागत', 'Total Maintenance Spend')}
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(totalSpent, currency)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t(lang, 'तुरुन्त / १४ दिनभित्रको मर्मत', 'Due Within 14 Days')}
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {upcomingReminders.length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t(lang, 'जम्मा मर्मत रेकर्ड', 'Total Maintenance Logs')}
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {data.maintenance.length}
          </div>
        </div>
      </div>

      {/* Filters & Maintenance Log */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-x-auto">
            {(['all', ...MAINT_STATUSES] as const).map((sf) => (
              <button
                key={sf}
                type="button"
                onClick={() => setStatusFilter(sf)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === sf
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {sf === 'all' ? t(lang, 'सबै', 'All') : MAINTENANCE_STATUS_LABELS[sf][lang]}
              </button>
            ))}
          </div>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as 'all' | MaintenanceCategory)}
            className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
          >
            <option value="all">{t(lang, 'सबै मर्मत विधा', 'All Categories')}</option>
            {MAINT_CATEGORIES.map((mc) => (
              <option key={mc} value={mc}>
                {MAINTENANCE_CATEGORY_LABELS[mc][lang]}
              </option>
            ))}
          </select>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t(lang, 'कुनै घर मर्मत रेकर्ड भेटिएन।', 'No maintenance records found.')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRecords.map((rec) => {
              const dueSoon =
                rec.status !== 'completed' &&
                diffDaysFromToday(rec.nextMaintenanceDate) <= 7;

              return (
                <div
                  key={rec.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {rec.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : rec.status === 'needs_attention' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      )}
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {rec.title}
                      </h4>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {MAINTENANCE_CATEGORY_LABELS[rec.category][lang]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{MAINTENANCE_STATUS_LABELS[rec.status][lang]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {t(lang, 'पछिल्लो:', 'Last:')} {formatDateReadable(rec.date, lang)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`tabular-nums ${
                          dueSoon || rec.status === 'needs_attention'
                            ? 'text-rose-600 dark:text-rose-400 font-semibold'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {t(lang, 'अर्को मिति:', 'Next:')}{' '}
                        {formatDateReadable(rec.nextMaintenanceDate, lang)} (
                        {getRelativeDueText(rec.nextMaintenanceDate, lang)})
                      </span>
                    </div>

                    {rec.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {rec.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 shrink-0">
                    <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {formatCurrency(rec.cost, currency)}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {rec.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => markServicedToday(rec)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                        >
                          {t(lang, 'सम्पन्न भयो', 'Mark Done')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(rec)}
                        aria-label="Edit maintenance"
                        className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          requestConfirm({
                            title: t(lang, 'मर्मत विवरण हटाउने हो?', 'Delete Maintenance Record?'),
                            message: `"${rec.title}" ${t(lang, 'हटाइनेछ।', 'will be deleted.')}`,
                            confirmLabel: t(lang, 'हटाउनुहोस्', 'Delete'),
                            danger: true,
                            onConfirm: () => deleteMaintenance(rec.id),
                          })
                        }
                        aria-label="Delete maintenance"
                        className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Create / Edit Maintenance Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingRec
                  ? t(lang, 'मर्मत विवरण सम्पादन', 'Edit Maintenance Record')
                  : t(lang, 'नयाँ घर मर्मत विवरण', 'Add Maintenance Record')}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {formErr && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {formErr}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'शीर्षक *', 'Maintenance Task *')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t(
                    lang,
                    'उदा: सोलार हिटर सर्भिसिङ / धारा मर्मत',
                    'e.g., RO Water Filter Servicing'
                  )}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'मर्मत विधा', 'Category')}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {MAINT_CATEGORIES.map((mc) => (
                      <option key={mc} value={mc}>
                        {MAINTENANCE_CATEGORY_LABELS[mc][lang]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'अवस्था', 'Status')}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {MAINT_STATUSES.map((ms) => (
                      <option key={ms} value={ms}>
                        {MAINTENANCE_STATUS_LABELS[ms][lang]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, `लागत (${currencySymbol})`, `Cost (${currencySymbol})`)}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'मर्मत मिति', 'Service Date')}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'अर्को मर्मत मिति', 'Next Due Date')}
                  </label>
                  <input
                    type="date"
                    value={nextMaintenanceDate}
                    onChange={(e) => setNextMaintenanceDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'प्राविधिक / टिपोट', 'Technician / Notes')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t(
                    lang,
                    'प्राविधिकको नाम, फोन वा ग्यारेन्टी जानकारी...',
                    'Technician contact or warranty info...'
                  )}
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
