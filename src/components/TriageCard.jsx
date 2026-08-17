import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Tag, User, Flame, Clock, Calendar, AlertCircle, FileText, Edit2 } from 'lucide-react';

export function TriageCard({ task, isSelected, onPromote, onDoing, onDone, onSelect, onOpenEdit }) {
  const taskIdDisplay = (task.source || task.id || '').replace(/^(atomic:|inline:)/, '').slice(-16);
  const todayStr = new Date().toISOString().slice(0, 10);

  const isOverdue = task.due && task.due < todayStr;
  const isDueToday = task.due && task.due === todayStr;

  const getPriorityStyle = (p) => {
    const priority = (p || 'medium').toLowerCase();
    if (priority === 'high') {
      return {
        bg: 'bg-[#fdd663]/10 text-[#fdd663] border-[#fdd663]/30',
        label: 'HIGH',
        icon: <Flame className="w-3 h-3 text-[#fdd663]" />
      };
    }
    if (priority === 'medium') {
      return {
        bg: 'bg-[#8ab4f8]/10 text-[#8ab4f8] border-[#8ab4f8]/20',
        label: 'MEDIUM',
        icon: null
      };
    }
    return {
      bg: 'bg-[#3c4043]/40 text-[#9aa0a6] border-[#3c4043]',
      label: 'LOW',
      icon: null
    };
  };

  const priorityStyle = getPriorityStyle(task.priority);

  return (
    <div
      onClick={(e) => {
        if (onSelect) onSelect();
        if (onOpenEdit) onOpenEdit(task);
      }}
      title="Click card to edit Title, Description, Priority, Due Date, and Assignee"
      className={`flex flex-col gap-3 p-4 rounded-xl border transition-all cursor-pointer group ${
        isSelected
          ? 'bg-[#282a2d] border-[#8ab4f8] ring-1 ring-[#8ab4f8] shadow-md shadow-[#8ab4f8]/10'
          : 'bg-[#1e1f20] border-[#3c4043]/60 hover:border-[#5f6368] hover:bg-[#282a2d]/60'
      }`}
    >
      {/* 1. Metadata Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9aa0a6]">
        {/* Left: Task ID, Project Badge, Priority Badge, Due Date Badge */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Task ID Pill */}
          <span
            title="Task ID / Source File Reference"
            className="font-mono px-1.5 py-0.5 rounded bg-[#131314] border border-[#3c4043] text-[11px] cursor-help"
          >
            {taskIdDisplay ? `#${taskIdDisplay}` : `#${task.id}`}
          </span>

          {/* Project Badge */}
          <span
            title={`Project: ${task.project || 'General'}`}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#8ab4f8]/10 text-[#8ab4f8] font-medium border border-[#8ab4f8]/20 cursor-help"
          >
            <Tag className="w-3 h-3 text-[#8ab4f8]" />
            <span>{task.project || 'General'}</span>
          </span>

          {/* Priority Badge */}
          <span
            title={`Priority Level: ${task.priority || 'medium'}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-help ${priorityStyle.bg}`}
          >
            {priorityStyle.icon}
            <span>{priorityStyle.label}</span>
          </span>

          {/* Due Date Badge */}
          {task.due ? (
            <span
              title={isOverdue ? `OVERDUE: Due ${task.due}` : isDueToday ? `DUE TODAY: ${task.due}` : `Due Date: ${task.due}`}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border cursor-help ${
                isOverdue || isDueToday
                  ? 'bg-[#f28b82]/15 text-[#f28b82] border-[#f28b82]/40 animate-pulse'
                  : 'bg-[#131314] text-[#e3e3e3] border-[#3c4043]'
              }`}
            >
              {isOverdue || isDueToday ? (
                <AlertCircle className="w-3 h-3 text-[#f28b82]" />
              ) : (
                <Calendar className="w-3 h-3 text-slate-400" />
              )}
              <span>{isDueToday ? 'Due Today' : isOverdue ? `Overdue (${task.due})` : task.due}</span>
            </span>
          ) : (
            <span
              title="No Due Date assigned"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-slate-500 bg-[#131314] border border-[#3c4043]/50 cursor-help"
            >
              <Clock className="w-2.5 h-2.5 text-slate-500" />
              <span>No Due Date</span>
            </span>
          )}

          {/* Completed Date Badge */}
          {task.completed && (
            <span
              title={`Completed Date: ${task.completed}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#81c995]/15 text-[#81c995] border border-[#81c995]/30 cursor-help"
            >
              <span>✓ Completed {task.completed}</span>
            </span>
          )}
        </div>

        {/* Right: Owner / Assignee Chip & Edit Indicator */}
        <div className="flex items-center gap-2">
          <div
            title={`Assignee / Owner: ${task.owner || task.assignee || 'Unassigned'}`}
            className="flex items-center gap-1.5 text-[11px] text-[#9aa0a6] bg-[#131314] px-2.5 py-0.5 rounded-full border border-[#3c4043] cursor-help"
          >
            <User className="w-3 h-3 text-[#8ab4f8]" />
            <span className="font-medium text-slate-300">{task.owner || task.assignee || 'Unassigned'}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenEdit) onOpenEdit(task);
            }}
            title="Edit Task Properties (Title, Description, Priority, Due Date)"
            className="p-1 rounded-full text-slate-400 hover:text-[#8ab4f8] hover:bg-[#8ab4f8]/10 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Task Title */}
      <h3 className="text-[14.5px] font-bold text-white tracking-wide leading-snug group-hover:text-[#8ab4f8] transition-colors">
        {task.title || task.content}
      </h3>

      {/* 3. Dedicated Description Section */}
      <div className="bg-[#131314]/90 p-3 rounded-xl border border-[#3c4043]/50 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8ab4f8] tracking-wider uppercase">
          <FileText className="w-3 h-3 text-[#8ab4f8]" />
          <span>Description</span>
        </div>
        {task.description && task.description.trim().length > 0 ? (
          <div className="text-[13px] leading-relaxed text-[#e3e3e3] font-normal">
            <ReactMarkdown
              components={{
                code: ({ children }) => (
                  <code
                    title="Inline Markdown Code Fragment"
                    className="bg-[#1e1f20] text-[#c58af9] px-1.5 py-0.5 rounded font-mono text-[12px] border border-[#3c4043]"
                  >
                    {children}
                  </code>
                )
              }}
            >
              {task.description}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic">
            (No description provided — click card to add)
          </div>
        )}
      </div>

      {/* 4. Button Actions Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#3c4043]/40 mt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDoing) onDoing(task.id);
            }}
            title="Doing [D]: Transitions task status to 'doing' (in-progress)."
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-[#131314] hover:bg-[#8ab4f8]/20 hover:text-[#8ab4f8] text-[#e3e3e3] border border-[#3c4043] cursor-pointer transition-colors"
          >
            <span className="text-[#8ab4f8]">↳</span> Doing <kbd className="text-[10px] text-[#9aa0a6] ml-0.5">D</kbd>
          </button>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onDone) onDone(task.id);
          }}
          title="Done [E]: Marks task as 'done' (completed) and archives it from the immediate triage feed."
          className="flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-[#81c995]/10 hover:bg-[#81c995]/20 text-[#81c995] border border-[#81c995]/30 cursor-pointer font-medium transition-colors"
        >
          <span>✓</span> Done <kbd className="text-[10px] text-[#81c995]/80 ml-0.5">E</kbd>
        </button>
      </div>
    </div>
  );
}
