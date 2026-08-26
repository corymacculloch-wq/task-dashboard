import React, { useState } from 'react';
import { Clock, Flame, CheckCircle2, Bot, Sparkles, LayoutList, CalendarRange } from 'lucide-react';
import TriageFeed from './TriageFeed';
import FocusTimelineView from './FocusTimelineView';

export default function DailyCockpitView({
  tasks,
  onUpdateStatus,
  onApproveAgent,
  onPromoteTask,
  onOpenMasterTable,
  onUndo,
  onUpdateTask,
  onOpenEdit,
  onEditTask
}) {
  const handleEdit = onEditTask || onOpenEdit;
  const [cockpitMode, setCockpitMode] = useState('timeline'); // 'triage' | 'timeline' (default to focus & timeline view per user preference)

  const todayStr = new Date().toISOString().slice(0, 10);
  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived');

  const overdueOrDueToday = activeTasks.filter((t) => t.due && t.due <= todayStr);
  const highPriority = activeTasks.filter((t) => t.priority === 'high');
  const agentTasks = activeTasks.filter((t) => t.assignee === 'agent');
  const completedToday = tasks.filter((t) => t.status === 'done');

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* View Mode Toggle Pill & Summary Metrics Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#1e1f20] p-4 rounded-3xl border border-[#3c4043]">
        {/* Cockpit Mode Segmented Controls */}
        <div className="flex items-center gap-1.5 bg-[#131314] p-1.5 rounded-full border border-[#3c4043] shadow-inner">
          <button
            onClick={() => setCockpitMode('timeline')}
            title="Focus & Timeline: View active tasks sorted by due dates with smart focus recommendations"
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              cockpitMode === 'timeline'
                ? 'bg-[#8ab4f8] text-[#0f172a] shadow-md scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Focus & Timeline</span>
          </button>

          <button
            onClick={() => setCockpitMode('triage')}
            title="Rapid Triage Feed: Virtualized feed optimized for keyboard navigation (J/K/D/P)"
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              cockpitMode === 'triage'
                ? 'bg-[#8ab4f8] text-[#0f172a] shadow-md scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Rapid Triage <span className="hidden sm:inline">(J/K)</span></span>
          </button>
        </div>

        {/* Compact Metrics Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 max-w-full">
          <div className="flex items-center gap-2 bg-[#131314] px-3.5 py-1.5 rounded-full border border-[#3c4043]">
            <Clock className="w-3.5 h-3.5 text-[#f28b82]" />
            <span className="text-xs text-slate-300 font-medium">Due/Overdue:</span>
            <span className="text-xs font-bold text-[#f28b82]">{overdueOrDueToday.length}</span>
          </div>

          <div className="flex items-center gap-2 bg-[#131314] px-3.5 py-1.5 rounded-full border border-[#3c4043]">
            <Flame className="w-3.5 h-3.5 text-[#fdd663]" />
            <span className="text-xs text-slate-300 font-medium">High Priority:</span>
            <span className="text-xs font-bold text-[#fdd663]">{highPriority.length}</span>
          </div>

          <div className="flex items-center gap-2 bg-[#131314] px-3.5 py-1.5 rounded-full border border-[#3c4043]">
            <Bot className="w-3.5 h-3.5 text-[#c58af9]" />
            <span className="text-xs text-slate-300 font-medium">Agent Candidates:</span>
            <span className="text-xs font-bold text-[#c58af9]">{agentTasks.length}</span>
          </div>

          <div className="flex items-center gap-2 bg-[#131314] px-3.5 py-1.5 rounded-full border border-[#3c4043]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#81c995]" />
            <span className="text-xs text-slate-300 font-medium">Done:</span>
            <span className="text-xs font-bold text-[#81c995]">{completedToday.length}</span>
          </div>
        </div>
      </div>

      {/* Mode View Rendering */}
      {cockpitMode === 'timeline' ? (
        <FocusTimelineView
          tasks={tasks}
          onUpdateStatus={onUpdateStatus}
          onUpdateTask={onUpdateTask}
          onOpenEdit={handleEdit}
          onEditTask={handleEdit}
          onPromoteTask={onPromoteTask}
        />
      ) : (
        <TriageFeed
          tasks={tasks}
          onUpdateStatus={onUpdateStatus}
          onPromoteTask={onPromoteTask}
          onOpenMasterTable={onOpenMasterTable}
          onUndo={onUndo}
          onUpdateTask={onUpdateTask}
          onOpenEdit={handleEdit}
          onEditTask={handleEdit}
        />
      )}
    </div>
  );
}
