import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Edit2,
  Plus,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { useHome } from '../context/HomeContext';
import {
  diffDaysFromToday,
  formatDateReadable,
  getRelativeDueText,
  getTodayISO,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  t,
} from '../i18n/translations';
import { FamilyTask, TaskPriority, TaskStatus } from '../types';

const AVATAR_COLORS = ['#0F172A', '#059669', '#0284C7', '#BE123C', '#7C3AED', '#D97706'];

export const TasksView: React.FC = () => {
  const {
    data,
    addMember,
    addTask,
    updateTask,
    cycleTaskStatus,
    deleteTask,
    requestConfirm,
  } = useHome();

  const lang = data.settings.language;

  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');

  // Task Modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FamilyTask | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedMemberId, setAssignedMemberId] = useState('');
  const [dueDate, setDueDate] = useState(getTodayISO());
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [taskErr, setTaskErr] = useState('');

  // Quick Add Family Member Modal
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memName, setMemName] = useState('');
  const [memRole, setMemRole] = useState('');
  const [memColor, setMemColor] = useState(AVATAR_COLORS[1]);
  const [memErr, setMemErr] = useState('');

  const totalTasks = data.tasks.length;
  const completedCount = data.tasks.filter((tk) => tk.status === 'completed').length;
  const inProgressCount = data.tasks.filter((tk) => tk.status === 'in_progress').length;
  const pendingCount = data.tasks.filter((tk) => tk.status === 'pending').length;
  const completionPct =
    totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const filteredTasks = useMemo(() => {
    return data.tasks
      .filter((tk) => {
        if (memberFilter !== 'all' && tk.assignedMemberId !== memberFilter) return false;
        if (statusFilter !== 'all' && tk.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [data.tasks, memberFilter, statusFilter]);

  const openCreateTask = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setAssignedMemberId(
      memberFilter !== 'all' ? memberFilter : data.members[0]?.id || ''
    );
    setDueDate(getTodayISO());
    setPriority('medium');
    setStatus('pending');
    setTaskErr('');
    setTaskModalOpen(true);
  };

  const openEditTask = (tk: FamilyTask) => {
    setEditingTask(tk);
    setTitle(tk.title);
    setDescription(tk.description);
    setAssignedMemberId(tk.assignedMemberId);
    setDueDate(tk.dueDate);
    setPriority(tk.priority);
    setStatus(tk.status);
    setTaskErr('');
    setTaskModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTaskErr(t(lang, 'कृपया कामको शीर्षक लेख्नुहोस्।', 'Please enter task title.'));
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      assignedMemberId: assignedMemberId || data.members[0]?.id || '',
      dueDate,
      priority,
      status,
    };
    if (editingTask) {
      updateTask(editingTask.id, payload);
    } else {
      addTask(payload);
    }
    setTaskModalOpen(false);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memName.trim()) {
      setMemErr(t(lang, 'कृपया सदस्यको नाम लेख्नुहोस्।', 'Please enter member name.'));
      return;
    }
    addMember({
      name: memName.trim(),
      role: memRole.trim() || t(lang, 'परिवार सदस्य', 'Family Member'),
      avatarColor: memColor,
    });
    setMemName('');
    setMemRole('');
    setMemberModalOpen(false);
  };

  const getMember = (id: string) => data.members.find((m) => m.id === id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'परिवारका काम र जिम्मेवारी', 'Family Task Manager')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t(
              lang,
              'घरका दैनिक जिम्मेवारीहरू परिवारका सदस्यहरूबीच बाँडफाँड र प्रगति ट्र्याकिङ',
              'Assign household chores across family profiles and track completion progress'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMemErr('');
              setMemberModalOpen(true);
            }}
            className="min-h-[42px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t(lang, 'सदस्य थप्नुहोस्', 'Add Member')}</span>
          </button>
          <button
            type="button"
            onClick={openCreateTask}
            className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:opacity-90 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t(lang, 'काम तोक्नुहोस्', 'Assign Task')}</span>
          </button>
        </div>
      </div>

      {/* Progress & Completion Statistics */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t(lang, 'कुल कार्य प्रगति', 'Household Task Completion')}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {completionPct}%{' '}
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                ({completedCount}/{totalTasks} {t(lang, 'सम्पन्न', 'completed')})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs sm:text-sm tabular-nums">
            <div>
              <span className="text-slate-500 dark:text-slate-400">{t(lang, 'बाँकी:', 'Pending:')}</span>{' '}
              <span className="font-bold text-slate-900 dark:text-white">{pendingCount}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">{t(lang, 'हुँदैछ:', 'In Progress:')}</span>{' '}
              <span className="font-bold text-amber-600 dark:text-amber-400">{inProgressCount}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">{t(lang, 'सम्पन्न:', 'Done:')}</span>{' '}
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{completedCount}</span>
            </div>
          </div>
        </div>

        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>

        {/* Member Filter Cards */}
        <div className="pt-2 flex items-center gap-2.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setMemberFilter('all')}
            className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              memberFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                : 'bg-stone-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            {t(lang, 'सबै सदस्यहरू', 'All Members')} ({totalTasks})
          </button>

          {data.members.map((m) => {
            const mTasks = data.tasks.filter((tk) => tk.assignedMemberId === m.id);
            const mDone = mTasks.filter((tk) => tk.status === 'completed').length;
            const active = memberFilter === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMemberFilter(m.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm flex items-center gap-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600 font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: m.avatarColor }}
                >
                  {m.name.slice(0, 1)}
                </span>
                <span>{m.name}</span>
                <span className="font-mono text-xs opacity-75 tabular-nums">
                  {mDone}/{mTasks.length}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Task List & Status Filter */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(['all', 'pending', 'in_progress', 'completed'] as const).map((sf) => (
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
                {sf === 'all' ? t(lang, 'सबै', 'All') : TASK_STATUS_LABELS[sf][lang]}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t(
              lang,
              'स्थिति परिवर्तन गर्न कामको बायाँ आइकनमा क्लिक गर्नुहोस्',
              'Click the status icon to cycle Pending → In Progress → Completed'
            )}
          </p>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t(lang, 'कुनै काम भेटिएन।', 'No tasks match your selected filter.')}
            </p>
            <button
              type="button"
              onClick={openCreateTask}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {t(lang, '+ नयाँ काम तोक्नुहोस्', '+ Assign a New Task')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTasks.map((tk) => {
              const member = getMember(tk.assignedMemberId);
              const isOverdue =
                tk.status !== 'completed' && diffDaysFromToday(tk.dueDate) < 0;

              return (
                <div
                  key={tk.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => cycleTaskStatus(tk.id)}
                      className="min-h-[38px] min-w-[38px] -ml-1 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                      title={TASK_STATUS_LABELS[tk.status][lang]}
                    >
                      {tk.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : tk.status === 'in_progress' ? (
                        <Clock className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div
                        className={`text-sm sm:text-base font-semibold ${
                          tk.status === 'completed'
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {tk.title}
                      </div>
                      {tk.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {tk.description}
                        </p>
                      )}
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {member?.name || t(lang, 'सदस्य', 'Member')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{TASK_STATUS_LABELS[tk.status][lang]}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            tk.priority === 'high'
                              ? 'text-rose-600 dark:text-rose-400 font-medium'
                              : ''
                          }
                        >
                          {TASK_PRIORITY_LABELS[tk.priority][lang]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`tabular-nums ${
                            isOverdue
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : ''
                          }`}
                        >
                          {formatDateReadable(tk.dueDate, lang)} (
                          {getRelativeDueText(tk.dueDate, lang)})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 shrink-0">
                    <select
                      value={tk.status}
                      onChange={(e) =>
                        updateTask(tk.id, {
                          title: tk.title,
                          description: tk.description,
                          assignedMemberId: tk.assignedMemberId,
                          dueDate: tk.dueDate,
                          priority: tk.priority,
                          status: e.target.value as TaskStatus,
                        })
                      }
                      aria-label="Task Status"
                      className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200"
                    >
                      <option value="pending">{TASK_STATUS_LABELS.pending[lang]}</option>
                      <option value="in_progress">{TASK_STATUS_LABELS.in_progress[lang]}</option>
                      <option value="completed">{TASK_STATUS_LABELS.completed[lang]}</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => openEditTask(tk)}
                      aria-label="Edit Task"
                      className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: t(lang, 'काम हटाउने हो?', 'Delete Task?'),
                          message: `"${tk.title}" ${t(lang, 'हटाइनेछ।', 'will be deleted.')}`,
                          confirmLabel: t(lang, 'हटाउनुहोस्', 'Delete'),
                          danger: true,
                          onConfirm: () => deleteTask(tk.id),
                        })
                      }
                      aria-label="Delete Task"
                      className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Task Add/Edit Modal */}
      {taskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingTask
                  ? t(lang, 'काम सम्पादन गर्नुहोस्', 'Edit Family Task')
                  : t(lang, 'नयाँ घरायसी काम तोक्नुहोस्', 'Assign New Task')}
              </h3>
              <button
                type="button"
                onClick={() => setTaskModalOpen(false)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              {taskErr && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {taskErr}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'कामको शीर्षक *', 'Task Title *')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t(
                    lang,
                    'उदा: छतको पानी ट्याङ्की सफा गर्ने',
                    'e.g., Clean rooftop water tank'
                  )}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'विवरण', 'Description')}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'जिम्मेवार सदस्य', 'Assigned Member')}
                  </label>
                  <select
                    value={assignedMemberId}
                    onChange={(e) => setAssignedMemberId(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {data.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'सम्पन्न गर्ने मिति', 'Due Date')}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'प्राथमिकता', 'Priority')}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="high">{TASK_PRIORITY_LABELS.high[lang]}</option>
                    <option value="medium">{TASK_PRIORITY_LABELS.medium[lang]}</option>
                    <option value="low">{TASK_PRIORITY_LABELS.low[lang]}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t(lang, 'अवस्था', 'Status')}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="pending">{TASK_STATUS_LABELS.pending[lang]}</option>
                    <option value="in_progress">{TASK_STATUS_LABELS.in_progress[lang]}</option>
                    <option value="completed">{TASK_STATUS_LABELS.completed[lang]}</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t(lang, 'रद्द', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white cursor-pointer"
                >
                  {t(lang, 'सुरक्षित गर्नुहोस्', 'Save Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      {memberModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t(lang, 'परिवारको सदस्य थप्नुहोस्', 'Add Family Member Profile')}
              </h3>
              <button
                type="button"
                onClick={() => setMemberModalOpen(false)}
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
                  {t(lang, 'सदस्यको नाम *', 'Full Name *')}
                </label>
                <input
                  type="text"
                  value={memName}
                  onChange={(e) => setMemName(e.target.value)}
                  placeholder={t(lang, 'उदा: हजुरआमा / बहिनी', 'e.g., Suman Sharma')}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'नाता / भूमिका', 'Family Role')}
                </label>
                <input
                  type="text"
                  value={memRole}
                  onChange={(e) => setMemRole(e.target.value)}
                  placeholder={t(lang, 'उदा: हजुरबुबा / काका / छोरी', 'e.g., Grandfather / Sister')}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t(lang, 'प्रोफाइल रङ', 'Profile Color')}
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
                  onClick={() => setMemberModalOpen(false)}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t(lang, 'रद्द', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white cursor-pointer"
                >
                  {t(lang, 'सदस्य थप्नुहोस्', 'Add Member')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
