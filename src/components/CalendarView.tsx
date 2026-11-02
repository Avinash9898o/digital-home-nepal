import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Info,
  MapPin,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import {
  EVENT_CATEGORY_LABELS,
  formatDateReadable,
  formatMonthYear,
  getRelativeDueText,
  getTodayISO,
  t,
} from '../i18n/translations';
import { CalendarEvent, CalendarSourceType, EventCategory } from '../types';

const EVENT_CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[];

const WEEKDAYS_NE = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC = () => {
  const {
    data,
    addEvent,
    updateEvent,
    deleteEvent,
    requestConfirm,
  } = useHome();

  const lang = data.settings.language;
  const todayISO = getTodayISO();

  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [cursorYearMonth, setCursorYearMonth] = useState<string>(todayISO.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [catFilter, setCatFilter] = useState<'all' | EventCategory>('all');

  // Event Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvt, setEditingEvt] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO);
  const [time, setTime] = useState('');
  const [category, setCategory] = useState<EventCategory>('birthday');
  const [sourceType, setSourceType] = useState<CalendarSourceType>('verified_gregorian');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [formErr, setFormErr] = useState('');

  const [year, month] = cursorYearMonth.split('-').map(Number);

  const changeMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setCursorYearMonth(ym);
  };

  const jumpToToday = () => {
    setCursorYearMonth(todayISO.slice(0, 7));
    setSelectedDate(todayISO);
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return data.events
      .filter((e) => (catFilter === 'all' ? true : e.category === catFilter))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.events, catFilter]);

  // Month grid cells
  const calendarCells = useMemo(() => {
    const firstDayIdx = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: { iso: string | null; dayNum: number | null }[] = [];

    for (let i = 0; i < firstDayIdx; i++) {
      cells.push({ iso: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ iso, dayNum: d });
    }
    return cells;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((ev) => {
      const arr = map.get(ev.date) || [];
      arr.push(ev);
      map.set(ev.date, arr);
    });
    return map;
  }, [filteredEvents]);

  const selectedDateEvents = eventsByDate.get(selectedDate) || [];

  const openAddModal = (prefillDate?: string) => {
    setEditingEvt(null);
    setTitle('');
    setDate(prefillDate || selectedDate || todayISO);
    setTime('');
    setCategory('gathering');
    setSourceType('verified_gregorian');
    setLocation('');
    setNotes('');
    setFormErr('');
    setModalOpen(true);
  };

  const openEditModal = (ev: CalendarEvent) => {
    setEditingEvt(ev);
    setTitle(ev.title);
    setDate(ev.date);
    setTime(ev.time || '');
    setCategory(ev.category);
    setSourceType(ev.sourceType);
    setLocation(ev.location);
    setNotes(ev.notes);
    setFormErr('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormErr(t(lang, 'कृपया कार्यक्रमको नाम लेख्नुहोस्।', 'Please enter event title.'));
      return;
    }
    if (!date) {
      setFormErr(t(lang, 'कृपया मिति छान्नुहोस्।', 'Please select a valid date.'));
      return;
    }

    const payload = {
      title: title.trim(),
      date,
      time: time || undefined,
      category,
      sourceType: category === 'festival' ? 'manual_festival' : sourceType,
      location: location.trim(),
      notes: notes.trim(),
    };

    if (editingEvt) {
      updateEvent(editingEvt.id, payload);
    } else {
      addEvent(payload);
    }
    setSelectedDate(date);
    setCursorYearMonth(date.slice(0, 7));
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'पारिवारिक क्यालेन्डर र कार्यक्रम', 'Family Calendar')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t(
              lang,
              'जन्मदिन, वैवाहिक वर्षगाँठ, स्कूल कार्यक्रम, डाक्टर भेटघाट र पारिवारिक जमघट',
              'Organize birthdays, anniversaries, school events, appointments, festivals, and gatherings'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t(lang, 'मासिक पात्रो', 'Month')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'agenda'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t(lang, 'कार्यसूची (Agenda)', 'Agenda')}
            </button>
          </div>

          <button
            type="button"
            onClick={() => openAddModal()}
            className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:opacity-90 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t(lang, 'कार्यक्रम थप्नुहोस्', 'Add Event')}</span>
          </button>
        </div>
      </div>

      {/* Calendar Honesty & Verification Notice */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
        <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {t(
            lang,
            'पात्रो पारदर्शिता: यो क्यालेन्डर प्रमाणित ग्रेगोरियन (ई.सं.) मितिमा आधारित छ। अनुमानित वा काल्पनिक बिक्रम सम्बत् मिति देखाइँदैन, र चाडपर्वका प्रविष्टिहरूलाई "प्रयोगकर्ताद्वारा राखिएको चाडपर्व टिपोट" को रूपमा स्पष्ट छुट्याइएको छ।',
            'Calendar Integrity: Dates follow verified Gregorian calendar days without fabricating Bikram Sambat conversions. Festival notes entered manually are clearly distinguished from standard verified calendar dates.'
          )}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous Month"
            className="min-h-[38px] min-w-[38px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-[140px] text-center text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {formatMonthYear(cursorYearMonth, lang)}
          </div>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Next Month"
            className="min-h-[38px] min-w-[38px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={jumpToToday}
            className="min-h-[38px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            {t(lang, 'आज', 'Today')}
          </button>
        </div>

        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value as 'all' | EventCategory)}
          className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
        >
          <option value="all">{t(lang, 'सबै प्रकारका कार्यक्रम', 'All Event Types')}</option>
          {EVENT_CATEGORIES.map((ec) => (
            <option key={ec} value={ec}>
              {EVENT_CATEGORY_LABELS[ec][lang]}
            </option>
          ))}
        </select>
      </div>

      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Month Grid */}
          <section className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {(lang === 'ne' ? WEEKDAYS_NE : WEEKDAYS_EN).map((wd) => (
                <div
                  key={wd}
                  className="py-2 text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {wd}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarCells.map((cell, idx) => {
                if (!cell.iso || !cell.dayNum) {
                  return <div key={`empty-${idx}`} className="h-16 sm:h-24" />;
                }
                const dayEvents = eventsByDate.get(cell.iso) || [];
                const isToday = cell.iso === todayISO;
                const isSelected = cell.iso === selectedDate;

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelectedDate(cell.iso!)}
                    className={`h-16 sm:h-24 p-1.5 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : isToday
                          ? 'border-slate-400 dark:border-slate-600 bg-stone-50 dark:bg-slate-800/50'
                          : 'border-slate-100 dark:border-slate-800/80 hover:bg-stone-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs sm:text-sm font-mono tabular-nums ${
                          isToday
                            ? 'font-bold text-emerald-700 dark:text-emerald-400'
                            : 'font-medium text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-bold">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 overflow-hidden w-full">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-[10px] sm:text-[11px] leading-tight truncate text-slate-700 dark:text-slate-200 font-medium"
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Selected Day Panel */}
          <section className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {formatDateReadable(selectedDate, lang)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {getRelativeDueText(selectedDate, lang)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openAddModal(selectedDate)}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                + {t(lang, 'थप्नुहोस्', 'Add')}
              </button>
            </div>

            {selectedDateEvents.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                {t(
                  lang,
                  'यस मितिमा कुनै कार्यक्रम दर्ता भएको छैन।',
                  'No events scheduled for this date.'
                )}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedDateEvents.map((ev) => (
                  <div key={ev.id} className="py-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {ev.title}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(ev)}
                          aria-label="Edit event"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            requestConfirm({
                              title: t(lang, 'कार्यक्रम हटाउने हो?', 'Delete Event?'),
                              message: `"${ev.title}" ${t(lang, 'हटाइनेछ।', 'will be deleted.')}`,
                              confirmLabel: t(lang, 'हटाउनुहोस्', 'Delete'),
                              danger: true,
                              onConfirm: () => deleteEvent(ev.id),
                            })
                          }
                          aria-label="Delete event"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {EVENT_CATEGORY_LABELS[ev.category][lang]}
                      {ev.time ? ` · ${ev.time}` : ''} ·{' '}
                      <span
                        className={
                          ev.sourceType === 'manual_festival'
                            ? 'text-amber-700 dark:text-amber-400 font-medium'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }
                      >
                        {ev.sourceType === 'manual_festival'
                          ? t(lang, 'प्रयोगकर्ताद्वारा राखिएको टिपोट', 'User-entered festival note')
                          : t(lang, 'प्रमाणित ग्रेगोरियन मिति', 'Verified Gregorian date')}
                      </span>
                    </div>

                    {ev.location && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{ev.location}</span>
                      </div>
                    )}
                    {ev.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {ev.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Agenda View */
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          {filteredEvents.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              {t(lang, 'कुनै पारिवारिक कार्यक्रम भेटिएन।', 'No family events recorded.')}
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {ev.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatDateReadable(ev.date, lang)}
                        {ev.time ? ` (${ev.time})` : ''}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{EVENT_CATEGORY_LABELS[ev.category][lang]}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          ev.sourceType === 'manual_festival'
                            ? 'text-amber-700 dark:text-amber-400 font-medium'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }
                      >
                        {ev.sourceType === 'manual_festival'
                          ? t(lang, 'प्रयोगकर्ताद्वारा राखिएको चाडपर्व टिपोट', 'User-entered festival note')
                          : t(lang, 'प्रमाणित ग्रेगोरियन मिति', 'Verified Gregorian date')}
                      </span>
                    </div>
                    {(ev.location || ev.notes) && (
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {ev.location}
                        {ev.location && ev.notes ? ' — ' : ''}
                        {ev.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {getRelativeDueText(ev.date, lang)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditModal(ev)}
                      aria-label="Edit event"
                      className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: t(lang, 'कार्यक्रम हटाउने हो?', 'Delete Event?'),
                          message: `"${ev.title}" ${t(lang, 'हटाइनेछ।', 'will be deleted.')}`,
                          confirmLabel: t(lang, 'हटाउनुहोस्', 'Delete'),
                          danger: true,
                          onConfirm: () => deleteEvent(ev.id),
                        })
                      }
                      aria-label="Delete event"
                      className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Create / Edit Event Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingEvt
                  ? t(lang, 'कार्यक्रम सम्पादन', 'Edit Calendar Event')
                  : t(lang, 'नयाँ पारिवारिक कार्यक्रम', 'Add Calendar Event')}
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
                  {t(lang, 'कार्यक्रमको नाम *', 'Event Title *')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t(
                    lang,
                    'उदा: आर्याको जन्मदिन / दन्त परीक्षण',
                    'e.g., Aarya Birthday / Dental Checkup'
                  )}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'मिति (ग्रेगोरियन ई.सं.) *', 'Date (Gregorian) *')}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'समय (ऐच्छिक)', 'Time (Optional)')}
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'प्रकार', 'Category')}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const nextCat = e.target.value as EventCategory;
                      setCategory(nextCat);
                      if (nextCat === 'festival') {
                        setSourceType('manual_festival');
                      }
                    }}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {EVENT_CATEGORIES.map((ec) => (
                      <option key={ec} value={ec}>
                        {EVENT_CATEGORY_LABELS[ec][lang]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'स्रोत वर्गीकरण', 'Date Verification Type')}
                  </label>
                  <select
                    value={category === 'festival' ? 'manual_festival' : sourceType}
                    onChange={(e) => setSourceType(e.target.value as CalendarSourceType)}
                    disabled={category === 'festival'}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white disabled:opacity-70"
                  >
                    <option value="verified_gregorian">
                      {t(lang, 'प्रमाणित ग्रेगोरियन मिति', 'Verified Gregorian Date')}
                    </option>
                    <option value="manual_festival">
                      {t(lang, 'प्रयोगकर्ताको चाडपर्व टिपोट', 'Manual Festival / Cultural Note')}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'स्थान', 'Location')}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t(lang, 'उदा: घरमै, बानेश्वर', 'e.g., Family Home, Baneshwor')}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'टिपोट', 'Notes')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  {t(lang, 'सुरक्षित गर्नुहोस्', 'Save Event')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
