import React, { useState } from 'react';
import {
  Clock,
  Flame,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Check,
  Edit3,
  Search,
  CalendarDays,
  XCircle,
  Folder,
  Tag
} from 'lucide-react';

export default function DailyCockpitView({
  tasks = [],
  onUpdateStatus,
  onUpdateTask,
  onOpenEdit,
  onEditTask,
  onPromoteTask
}) {
  const handleEdit = onEditTask || onOpenEdit;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('ALL');
  const [showCompleted, setShowCompleted] = useState(false);

  const todayObj = new Date();
  const todayStr = todayObj.toISOString().slice(0, 10);

  // Quick date helper functions
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const getNextMondayStr = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() + ((7 - day + 1) % 7 || 7);
    d.setDate(diff);
    return d.toISOString().slice(0, 10);
  };

  const getDaysDiff = (dueStr) => {
    if (!dueStr) return 0;
    const due = new Date(dueStr);
    const today = new Date(todayStr);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatRelativeDate = (dueStr) => {
    if (!dueStr) return '';
    const diff = getDaysDiff(dueStr);
    if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''} overdue`;
    if (diff === 0) return 'Due Today';
    if (diff === 1) return 'Tomorrow';
    if (diff > 1 && diff <= 7) return `In ${diff} days`;
    return dueStr;
  };

  const projects = Array.from(new Set(tasks.map((t) => t.project).filter(Boolean)));

  // Filter tasks
  const eligibleTasks = tasks.filter((t) => {
    if (!showCompleted && t.status === 'done') return false;
    if (t.status === 'archived') return false;

    const matchesSearch =
      (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.project || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((t.assignee || '').toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesProject = filterProject === 'ALL' || t.project === filterProject;

    return matchesSearch && matchesProject;
  });

  // Grouping tasks by due date timelines
  const overdueTasks = eligibleTasks
    .filter((t) => t.status !== 'done' && t.due && t.due < todayStr)
    .sort((a, b) => (a.due > b.due ? 1 : -1));

  const dueTodayTasks = eligibleTasks
    .filter((t) => t.status !== 'done' && t.due && t.due === todayStr)
    .sort((a, b) => (a.priority === 'high' ? -1 : 1));

  const sevenDaysLaterStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  const dueThisWeekTasks = eligibleTasks
    .filter((t) => t.status !== 'done' && t.due && t.due > todayStr && t.due <= sevenDaysLaterStr)
    .sort((a, b) => (a.due > b.due ? 1 : -1));

  const dueLaterTasks = eligibleTasks
    .filter((t) => t.status !== 'done' && t.due && t.due > sevenDaysLaterStr)
    .sort((a, b) => (a.due > b.due ? 1 : -1));

  const unscheduledTasks = eligibleTasks.filter((t) => t.status !== 'done' && !t.due);

  const handleQuickSchedule = (taskId, dateStr) => {
    if (onUpdateTask) {
      onUpdateTask(taskId, { due: dateStr });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100 font-sans pb-12">
      {/* Search & Filter Toolbar */}
      <div className="bg-[#1e1f20] border border-[#3c4043] p-4 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative h-9 flex items-center w-full sm:w-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter timeline..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#131314] border border-[#3c4043] text-slate-200 text-xs rounded-full pl-9 pr-3 h-9 focus:outline-none focus:border-[#8ab4f8] w-full sm:w-56"
            />
          </div>

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-[#131314] border border-[#3c4043] text-slate-200 text-xs rounded-full px-3.5 h-9 focus:outline-none focus:border-[#8ab4f8] cursor-pointer max-w-full"
          >
            <option value="ALL">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none border-l border-[#3c4043] pl-3 h-9">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded accent-[#8ab4f8] w-4 h-4 cursor-pointer"
            />
            <span>Show Completed</span>
          </label>
        </div>

        {/* Timeline Quick Metrics Badges */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {overdueTasks.length > 0 && (
            <span className="bg-[#f28b82]/15 text-[#f28b82] border border-[#f28b82]/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              {overdueTasks.length} Overdue
            </span>
          )}
          <span className="bg-[#fdd663]/15 text-[#fdd663] border border-[#fdd663]/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {dueTodayTasks.length} Due Today
          </span>
          <span className="bg-[#8ab4f8]/15 text-[#8ab4f8] border border-[#8ab4f8]/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {dueThisWeekTasks.length} Due This Week
          </span>
        </div>
      </div>

      {/* 🚨 OVERDUE TASKS GROUP */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#3c4043] pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#f28b82]/20 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-[#f28b82]" />
            </div>
            <h3 className="text-sm font-bold text-[#f28b82]">
              Overdue Tasks ({overdueTasks.length})
            </h3>
          </div>
          {overdueTasks.filter((t) => t.priority === 'high').length > 0 && (
            <span className="text-xs font-bold bg-[#f28b82] text-[#0f172a] px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              <Flame className="w-3 h-3 fill-[#0f172a]" />
              {overdueTasks.filter((t) => t.priority === 'high').length} High Priority Callout
            </span>
          )}
        </div>

        {overdueTasks.length === 0 ? (
          <div className="p-4 bg-[#131314] border border-[#3c4043] rounded-2xl text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#81c995]" />
            <span>No overdue tasks! You're completely caught up.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {overdueTasks.map((task) => (
              <TimelineTaskCard
                key={task.id}
                task={task}
                isOverdue
                onUpdateStatus={onUpdateStatus}
                onUpdateTask={onUpdateTask}
                onOpenEdit={handleEdit}
                onQuickSchedule={handleQuickSchedule}
                formatRelativeDate={formatRelativeDate}
              />
            ))}
          </div>
        )}
      </section>

      {/* ☀️ DUE TODAY GROUP */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#3c4043] pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#fdd663]/20 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-[#fdd663]" />
            </div>
            <h3 className="text-sm font-bold text-[#fdd663]">
              Due Today ({dueTodayTasks.length})
            </h3>
          </div>
        </div>

        {dueTodayTasks.length === 0 ? (
          <div className="p-4 bg-[#131314] border border-[#3c4043] rounded-2xl text-xs text-slate-400">
            No tasks scheduled specifically for today.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {dueTodayTasks.map((task) => (
              <TimelineTaskCard
                key={task.id}
                task={task}
                isToday
                onUpdateStatus={onUpdateStatus}
                onUpdateTask={onUpdateTask}
                onOpenEdit={handleEdit}
                onQuickSchedule={handleQuickSchedule}
                formatRelativeDate={formatRelativeDate}
              />
            ))}
          </div>
        )}
      </section>

      {/* 📅 DUE THIS WEEK GROUP */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#3c4043] pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#8ab4f8]/20 flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5 text-[#8ab4f8]" />
            </div>
            <h3 className="text-sm font-bold text-[#8ab4f8]">
              Upcoming This Week ({dueThisWeekTasks.length})
            </h3>
          </div>
        </div>

        {dueThisWeekTasks.length === 0 ? (
          <div className="p-4 bg-[#131314] border border-[#3c4043] rounded-2xl text-xs text-slate-400">
            No tasks scheduled for the rest of this week.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {dueThisWeekTasks.map((task) => (
              <TimelineTaskCard
                key={task.id}
                task={task}
                onUpdateStatus={onUpdateStatus}
                onUpdateTask={onUpdateTask}
                onOpenEdit={handleEdit}
                onQuickSchedule={handleQuickSchedule}
                formatRelativeDate={formatRelativeDate}
              />
            ))}
          </div>
        )}
      </section>

      {/* 🗓️ DUE LATER GROUP */}
      {dueLaterTasks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#3c4043] pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-300">
                Scheduled Later ({dueLaterTasks.length})
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {dueLaterTasks.map((task) => (
              <TimelineTaskCard
                key={task.id}
                task={task}
                onUpdateStatus={onUpdateStatus}
                onUpdateTask={onUpdateTask}
                onOpenEdit={handleEdit}
                onQuickSchedule={handleQuickSchedule}
                formatRelativeDate={formatRelativeDate}
              />
            ))}
          </div>
        </section>
      )}

      {/* 📥 UNSCHEDULED BACKLOG GROUP */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#3c4043] pb-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-300">
              Unscheduled Backlog ({unscheduledTasks.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Use quick scheduler to set due dates</span>
        </div>

        {unscheduledTasks.length === 0 ? (
          <div className="p-4 bg-[#131314] border border-[#3c4043] rounded-2xl text-xs text-slate-400">
            All active tasks have assigned due dates!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {unscheduledTasks.slice(0, 20).map((task) => (
              <TimelineTaskCard
                key={task.id}
                task={task}
                isUnscheduled
                onUpdateStatus={onUpdateStatus}
                onUpdateTask={onUpdateTask}
                onOpenEdit={handleEdit}
                onQuickSchedule={handleQuickSchedule}
                formatRelativeDate={formatRelativeDate}
              />
            ))}
            {unscheduledTasks.length > 20 && (
              <div className="p-3 text-center text-xs text-slate-400 bg-[#131314] rounded-2xl border border-[#3c4043]">
                + {unscheduledTasks.length - 20} more unscheduled items in backlog
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// Sub-component: Individual Timeline Card with Quick Scheduler
function TimelineTaskCard({
  task,
  isOverdue = false,
  isToday = false,
  isUnscheduled = false,
  onUpdateStatus,
  onUpdateTask,
  onOpenEdit,
  onQuickSchedule,
  formatRelativeDate
}) {
  const [showScheduler, setShowScheduler] = useState(false);
  const isHighPriority = task.priority === 'high';

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  const nextMonStr = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() + ((7 - day + 1) % 7 || 7);
    d.setDate(diff);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
        isOverdue && isHighPriority
          ? 'bg-[#f28b82]/10 border-[#f28b82]/60 shadow-md shadow-[#f28b82]/10'
          : isOverdue
          ? 'bg-[#f28b82]/5 border-[#f28b82]/30'
          : isToday
          ? 'bg-[#fdd663]/5 border-[#fdd663]/30'
          : 'bg-[#131314] border-[#3c4043] hover:border-slate-500'
      }`}
    >
      {/* Title & Details */}
      <div className="flex items-center gap-3 flex-1 min-w-[280px]">
        {/* Status Checkbox */}
        <button
          onClick={() => onUpdateStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
            task.status === 'done'
              ? 'bg-[#81c995] border-[#81c995] text-[#0f172a]'
              : 'border-[#3c4043] hover:border-[#8ab4f8] text-transparent'
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              onClick={() => onOpenEdit && onOpenEdit(task)}
              title="Click to open task editor modal"
              className="text-xs font-semibold text-slate-100 hover:text-[#8ab4f8] cursor-pointer transition-colors"
            >
              {task.title}
            </span>

            {/* Badges */}
            {isOverdue && isHighPriority && (
              <span className="bg-[#f28b82] text-[#0f172a] text-[10px] font-bold px-2 py-0.2 rounded-full flex items-center gap-1">
                <Flame className="w-3 h-3 fill-[#0f172a]" /> HIGH PRIORITY OVERDUE
              </span>
            )}
            {isOverdue && !isHighPriority && (
              <span className="bg-[#f28b82]/20 text-[#f28b82] text-[10px] font-bold px-2 py-0.2 rounded-full">
                Overdue
              </span>
            )}
            {isHighPriority && !isOverdue && (
              <span className="bg-[#fdd663]/20 text-[#fdd663] text-[10px] font-bold px-2 py-0.2 rounded-full">
                High Priority
              </span>
            )}
            {task.assignee === 'agent' && (
              <span className="bg-[#c58af9]/20 text-[#c58af9] text-[10px] font-bold px-2 py-0.2 rounded-full">
                Agent Task
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
            <span className="font-medium text-slate-300">{task.project}</span>
            {task.due && (
              <span className={`font-semibold ${isOverdue ? 'text-[#f28b82]' : 'text-slate-400'}`}>
                • {formatRelativeDate(task.due)} ({task.due})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls & Quick Scheduler */}
      <div className="flex items-center gap-2">
        {/* Status Select */}
        <select
          value={task.status || 'todo'}
          onChange={(e) => onUpdateStatus(task.id, e.target.value)}
          className="bg-[#1e1f20] border border-[#3c4043] text-slate-300 text-[11px] rounded-full px-2.5 py-1 focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
        >
          <option value="todo">Todo</option>
          <option value="doing">Doing</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </select>

        {/* Quick Scheduler Toggle Button */}
        <div className="relative">
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            title="Quick Schedule: Assign due date (Today, Tomorrow, Next Mon)"
            className="px-2.5 py-1 bg-[#1e1f20] hover:bg-[#282a2d] border border-[#3c4043] text-slate-300 hover:text-white text-[11px] font-medium rounded-full flex items-center gap-1 transition-all cursor-pointer"
          >
            <Calendar className="w-3 h-3 text-[#8ab4f8]" />
            <span>{task.due ? 'Reschedule' : 'Schedule'}</span>
          </button>

          {/* Quick Scheduler Popover */}
          {showScheduler && (
            <div className="absolute right-0 top-8 z-30 bg-[#1e1f20] border border-[#3c4043] p-2 rounded-2xl shadow-2xl flex flex-col gap-1 w-44 animate-fadeIn">
              <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5">Quick Schedule</span>
              <button
                onClick={() => {
                  onQuickSchedule(task.id, todayStr);
                  setShowScheduler(false);
                }}
                className="text-left text-xs px-2.5 py-1.5 hover:bg-[#8ab4f8]/20 text-slate-200 hover:text-[#8ab4f8] rounded-xl transition-all font-semibold flex items-center justify-between cursor-pointer"
              >
                <span>Today</span>
                <span className="text-[10px] text-slate-400">({todayStr.slice(5)})</span>
              </button>
              <button
                onClick={() => {
                  onQuickSchedule(task.id, tomorrowStr);
                  setShowScheduler(false);
                }}
                className="text-left text-xs px-2.5 py-1.5 hover:bg-[#8ab4f8]/20 text-slate-200 hover:text-[#8ab4f8] rounded-xl transition-all font-semibold flex items-center justify-between cursor-pointer"
              >
                <span>Tomorrow</span>
                <span className="text-[10px] text-slate-400">({tomorrowStr.slice(5)})</span>
              </button>
              <button
                onClick={() => {
                  onQuickSchedule(task.id, nextMonStr);
                  setShowScheduler(false);
                }}
                className="text-left text-xs px-2.5 py-1.5 hover:bg-[#8ab4f8]/20 text-slate-200 hover:text-[#8ab4f8] rounded-xl transition-all font-semibold flex items-center justify-between cursor-pointer"
              >
                <span>Next Monday</span>
                <span className="text-[10px] text-slate-400">({nextMonStr.slice(5)})</span>
              </button>

              {/* Custom Date Input */}
              <div className="px-2 py-1 border-t border-[#3c4043] mt-1">
                <span className="text-[10px] text-slate-400 block mb-1">Pick Specific Date:</span>
                <input
                  type="date"
                  value={task.due || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      onQuickSchedule(task.id, e.target.value);
                      setShowScheduler(false);
                    }
                  }}
                  className="bg-[#131314] border border-[#3c4043] text-slate-200 text-[11px] rounded-lg px-2 py-1 w-full focus:outline-none focus:border-[#8ab4f8]"
                />
              </div>

              {task.due && (
                <button
                  onClick={() => {
                    onQuickSchedule(task.id, null);
                    setShowScheduler(false);
                  }}
                  className="text-left text-xs px-2.5 py-1.5 hover:bg-[#f28b82]/20 text-[#f28b82] rounded-xl transition-all font-semibold flex items-center gap-1 border-t border-[#3c4043] mt-1 cursor-pointer"
                >
                  <XCircle className="w-3 h-3" /> Clear Due Date
                </button>
              )}
            </div>
          )}
        </div>

        {/* Edit Button */}
        <button
          onClick={() => onOpenEdit && onOpenEdit(task)}
          title="Edit task properties"
          className="p-1.5 hover:bg-[#1e1f20] text-slate-400 hover:text-slate-200 rounded-full transition-all cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
