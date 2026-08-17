import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, Flame, Calendar, User, Tag, FileText, CheckSquare, CheckCircle2 } from 'lucide-react';

export default function TaskEditModal({ isOpen, onClose, task, onSaveTask, onSave, onConfirmPromote, existingProjects: passedProjects = ['General'] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [due, setDue] = useState('');
  const [assignee, setAssignee] = useState('');
  const [project, setProject] = useState('General');
  const [existingProjects, setExistingProjects] = useState(['General']);
  const [isCustomProject, setIsCustomProject] = useState(false);
  const [status, setStatus] = useState('todo');
  const [completedDate, setCompletedDate] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title || task.content || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'medium');
      setDue(task.due || '');
      setAssignee(task.owner || task.assignee || '');
      setProject(task.project || 'General');
      setStatus(task.status || 'todo');
      setCompletedDate(task.completed || '');
      setIsCustomProject(false);
    }
  }, [task]);

  useEffect(() => {
    if (isOpen) {
      const names = [...passedProjects];
      if (!names.includes('General')) names.unshift('General');
      if (task && task.project && !names.includes(task.project)) names.push(task.project);
      setExistingProjects(names);
    }
  }, [isOpen, task, passedProjects]);

  if (!isOpen || !task) return null;

  const handleToggleCompleted = () => {
    const isNowDone = status !== 'done';
    const newStatus = isNowDone ? 'done' : 'todo';
    setStatus(newStatus);
    if (isNowDone) {
      const todayStr = new Date().toISOString().slice(0, 10);
      setCompletedDate(completedDate || todayStr);
    } else {
      setCompletedDate('');
    }
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    onSaveTask(task.id, {
      title,
      description,
      status,
      completed: completedDate || null,
      priority,
      due: due || null,
      assignee: assignee || null,
      project
    });
    onClose();
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const taskIdDisplay = (task.source || task.id || '').replace(/^(atomic:|inline:)/, '').slice(-16);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#1e1f20] w-full max-w-xl rounded-3xl p-6 border-2 border-[#8ab4f8] shadow-2xl shadow-[#8ab4f8]/20 relative space-y-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3c4043]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#8ab4f8]/10 border border-[#8ab4f8]/30 flex items-center justify-center">
              <Edit2 className="w-4 h-4 text-[#8ab4f8]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Edit Task <span className="font-mono text-xs text-[#8ab4f8]">#{taskIdDisplay}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Update task properties and sync directly to vault .md notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-[#3c4043] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Completion Checkbox & Auto-Populated Date Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131314] px-4 py-3 rounded-2xl border border-[#3c4043]">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={status === 'done'}
              onChange={handleToggleCompleted}
              className="w-5 h-5 rounded border-[#3c4043] bg-[#1e1f20] text-[#81c995] focus:ring-[#81c995] accent-[#81c995] cursor-pointer"
            />
            <span className={`text-xs font-bold flex items-center gap-1.5 ${status === 'done' ? 'text-[#81c995] line-through' : 'text-slate-200'}`}>
              <CheckCircle2 className={`w-4 h-4 ${status === 'done' ? 'text-[#81c995]' : 'text-slate-400'}`} />
              {status === 'done' ? 'Task Marked Completed' : 'Mark Task Complete'}
            </span>
          </label>

          {/* Completion Date Input */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">Completed Date:</span>
            <input
              type="date"
              value={completedDate}
              onChange={(e) => {
                setCompletedDate(e.target.value);
                if (e.target.value && status !== 'done') {
                  setStatus('done');
                }
              }}
              className="bg-[#1e1f20] text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#81c995] cursor-pointer font-mono"
            />
            {completedDate && (
              <button
                type="button"
                onClick={() => setCompletedDate('')}
                title="Clear Completion Date"
                className="p-1.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Title Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center gap-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task Title..."
            className="w-full bg-[#131314] text-slate-100 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] focus:ring-2 focus:ring-[#8ab4f8]/30"
            autoFocus
          />
        </div>

        {/* Description Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#8ab4f8]" /> Description / Notes
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Markdown supported</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add detailed task description, notes, or sub-task execution steps..."
            rows={4}
            className="w-full bg-[#131314] text-slate-200 text-xs font-mono p-3 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] focus:ring-2 focus:ring-[#8ab4f8]/30 resize-y min-h-[90px]"
          />
        </div>

        {/* Project Selection Row */}
        <div className="space-y-1.5 bg-[#131314] p-3 rounded-2xl border border-[#3c4043]">
          <label className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#8ab4f8]" /> Project Workspace
            </span>
            {task.project && (
              <span className="text-[10px] text-slate-400 font-normal">
                Assigned: <code className="text-[#8ab4f8] font-mono">{project}</code>
              </span>
            )}
          </label>
          {!isCustomProject ? (
            <select
              value={project}
              onChange={(e) => {
                if (e.target.value === '__NEW__') {
                  setIsCustomProject(true);
                  setProject('');
                } else {
                  setProject(e.target.value);
                }
              }}
              className="w-full bg-[#1e1f20] text-slate-100 text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] cursor-pointer font-mono"
            >
              {existingProjects.map((p) => (
                <option key={p} value={p}>
                  📁 {p}
                </option>
              ))}
              <option value="__NEW__">+ Reassign to New Project...</option>
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter new project name..."
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full bg-[#1e1f20] text-slate-100 text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8]"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setIsCustomProject(false);
                  setProject(task.project || 'General');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Grid Properties: Priority, Due Date, Assignee */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-[#fdd663]" /> Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-[#131314] text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
            >
              <option value="high">High 🔥</option>
              <option value="medium">Medium 🟦</option>
              <option value="low">Low ⬜</option>
            </select>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#8ab4f8]" /> Due Date
            </label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full bg-[#131314] text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
              />
              {due && (
                <button
                  type="button"
                  onClick={() => setDue('')}
                  title="Clear Due Date"
                  className="p-2.5 text-slate-400 hover:text-slate-200 rounded-xl bg-[#131314] border border-[#3c4043]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#8ab4f8]" /> Assignee
            </label>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="e.g. Cory, Simone, agent"
              className="w-full bg-[#131314] text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#3c4043]">
          <div>
            {!task.isAtomic && onConfirmPromote ? (
              <button
                type="button"
                onClick={() => {
                  onConfirmPromote(task.id);
                  onClose();
                }}
                title="Promote: Convert this inline task into a standalone task-*.md note with YAML frontmatter per SOP"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#fdd663]/15 text-[#fdd663] border border-[#fdd663]/30 hover:bg-[#fdd663] hover:text-[#0f172a] transition-all cursor-pointer"
              >
                <span>→ Promote to Standalone Note</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400">
                Press <kbd className="px-1.5 py-0.5 rounded bg-[#131314] text-slate-300 font-mono">Ctrl+Enter</kbd> to save
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-[#131314] text-slate-300 hover:bg-[#3c4043] border border-[#3c4043] cursor-pointer transition-colors"
            >
              Cancel <kbd className="text-[10px] text-slate-400 ml-0.5">Esc</kbd>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#0f172a] shadow-lg shadow-[#8ab4f8]/30 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
