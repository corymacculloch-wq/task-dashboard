import React, { useState } from 'react';
import { X, Plus, AlertCircle, CheckCircle } from 'lucide-react';

const ACTION_VERBS = [
  'Call', 'Email', 'Download', 'Review', 'Inspect', 'Transfer',
  'Draft', 'Prepare', 'Verify', 'Set up', 'Complete', 'Update',
  'Reschedule', 'Process', 'Create', 'Submit', 'Pay', 'File'
];

export default function QuickTaskModal({ isOpen, onClose, onCreateTask, initialProject = 'General' }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState(initialProject);
  const [existingProjects, setExistingProjects] = useState(['General']);
  const [isCustomProject, setIsCustomProject] = useState(false);
  const [priority, setPriority] = useState('medium');
  const [due, setDue] = useState('');
  const [assignee, setAssignee] = useState('');
  const [isAtomic, setIsAtomic] = useState(true);

  React.useEffect(() => {
    if (isOpen) {
      setProject(initialProject || 'General');
      setIsCustomProject(false);
      fetch('/api/projects')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.projects)) {
            const names = data.projects.map((p) => p.name);
            if (!names.includes('General')) names.unshift('General');
            if (initialProject && !names.includes(initialProject)) names.push(initialProject);
            setExistingProjects(names);
          }
        })
        .catch((err) => console.error('Error fetching projects list:', err));
    }
  }, [isOpen, initialProject]);

  if (!isOpen) return null;

  const startsWithVerb = ACTION_VERBS.some((verb) =>
    title.trim().toLowerCase().startsWith(verb.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateTask({
      title: title.trim(),
      description: description.trim(),
      project: project.trim() || 'General',
      priority,
      due: due || null,
      assignee: assignee.trim().toLowerCase() || null,
      isAtomic
    });

    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="g-surface-1 w-full max-w-lg rounded-3xl p-6 border-[#3c4043] shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#3c4043]">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#8ab4f8]" /> Create New Task
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-[#282a2d]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Task Title (Next Physical Action)
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Review production deployment settings"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#131314] border border-[#3c4043] text-slate-100 text-sm rounded-2xl px-4 py-2.5 focus:outline-none focus:border-[#8ab4f8]"
            />
            {title && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                {startsWithVerb ? (
                  <span className="text-[#81c995] flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Starts with action verb
                  </span>
                ) : (
                  <span className="text-[#fdd663] flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Tip: Start with an action verb (Call, Email, Review, Verify, etc.)
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Goal Context
            </label>
            <textarea
              rows="2"
              placeholder="Brief details or scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#131314] border border-[#3c4043] text-slate-100 text-sm rounded-2xl px-4 py-2 focus:outline-none focus:border-[#8ab4f8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Project</label>
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
                  className="w-full bg-[#131314] border border-[#3c4043] text-slate-100 text-sm rounded-2xl px-4 py-2 focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
                >
                  {existingProjects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="__NEW__">+ Create New Project...</option>
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Enter project name..."
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="w-full bg-[#131314] border border-[#3c4043] text-slate-100 text-sm rounded-2xl px-3 py-2 focus:outline-none focus:border-[#8ab4f8]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomProject(false);
                      setProject(existingProjects[0] || 'General');
                    }}
                    title="Choose from existing projects"
                    className="p-1.5 text-slate-400 hover:text-slate-200 text-xs font-semibold"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#131314] border border-[#3c4043] text-slate-100 text-sm rounded-2xl px-4 py-2 focus:outline-none focus:border-[#8ab4f8]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High 🔥</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full bg-[#131314] border border-[#3c4043] text-slate-100 text-sm rounded-2xl px-4 py-2 focus:outline-none focus:border-[#8ab4f8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assignee</label>
              <input
                type="text"
                placeholder="cory, simone, or agent"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full bg-[#131314] border border-[#3c4043] text-slate-100 text-sm rounded-2xl px-4 py-2 focus:outline-none focus:border-[#8ab4f8]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#3c4043] flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Format Standard:</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={isAtomic}
                  onChange={() => setIsAtomic(true)}
                  className="accent-[#8ab4f8]"
                />
                Atomic File (<code className="text-[#8ab4f8]">task-*.md</code>)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  checked={!isAtomic}
                  onChange={() => setIsAtomic(false)}
                  className="accent-[#8ab4f8]"
                />
                Inline Checklist (<code className="text-[#8ab4f8]">project.md</code>)
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-[#282a2d] text-slate-300 hover:bg-[#3c4043]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full text-xs font-bold bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#0f172a] shadow-md"
            >
              Create Task Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
