import React from 'react';
import { X, ArrowUpRight, FileCode, CheckCircle } from 'lucide-react';

export default function TaskPromotionModal({ isOpen, onClose, task, onConfirmPromote }) {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border-indigo-500/30 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-indigo-400" /> Promote to Atomic Task Note
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs text-slate-300">
          <p>
            Per <strong className="text-slate-100">Protocol 1 Triage & Promotion SOP</strong>, promoting this inline checklist item creates a standalone task note with YAML frontmatter.
          </p>

          <div className="glass-card p-3 rounded-xl border-slate-700 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold">
              <FileCode className="w-4 h-4" /> Task Details
            </div>
            <div><strong>Title:</strong> {task.title}</div>
            <div><strong>Project:</strong> {task.project}</div>
            <div><strong>Parent Plan:</strong> {task.parent_plan}</div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-200 space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-indigo-400" /> Automated SOP Actions:
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-indigo-300">
              <li>Creates standalone note: <code className="text-indigo-200">task-*.md</code></li>
              <li>Links parent item via <code className="text-indigo-200">&lt;!-- task-ref: ... --&gt;</code></li>
              <li>Syncs frontmatter status & priority</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirmPromote(task.id);
                onClose();
              }}
              className="px-5 py-2 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
            >
              Confirm Promotion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
