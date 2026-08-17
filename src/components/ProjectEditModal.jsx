import React, { useState, useEffect } from 'react';
import { X, Save, Folder, Calendar, User, FileText, Activity, AlertCircle, Loader2 } from 'lucide-react';

export default function ProjectEditModal({ isOpen, onClose, projectName, onSaveProjectDetail }) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('active');
  const [targetDate, setTargetDate] = useState('');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && projectName) {
      setIsLoading(true);
      setError(null);
      fetch(`/api/projects/detail?name=${encodeURIComponent(projectName)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.project) {
            const p = data.project;
            setTitle(p.title || `${projectName} Project`);
            setStatus(p.status || 'active');
            setTargetDate(p.target_date || '');
            setOwner(p.owner || '');
            setDescription(p.description || '');
            setBody(p.body || '');
          } else {
            setError(data.error || 'Failed to load project details');
          }
        })
        .catch((err) => {
          console.error('Error fetching project detail:', err);
          setError('Failed to connect to server');
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, projectName]);

  if (!isOpen || !projectName) return null;

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await onSaveProjectDetail(projectName, {
        title,
        status,
        target_date: targetDate || null,
        owner: owner || null,
        description,
        body
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error saving project detail');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#1e1f20] border-2 border-[#8ab4f8]/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#131314] border-b border-[#3c4043] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#8ab4f8]/15 text-[#8ab4f8] border border-[#8ab4f8]/30">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Project Workspace Settings
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                1.active_projects/{projectName}/project.md
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#282a2d] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Form */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#8ab4f8]" />
            <span className="text-xs font-semibold">Loading project data from vault...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Project Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[#8ab4f8]" /> Project Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Project title..."
                className="w-full bg-[#131314] text-slate-100 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8]"
              />
            </div>

            {/* Property Grid: Status, Target Date, Owner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#81c995]" /> Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-[#131314] text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
                >
                  <option value="active">Active 🟢</option>
                  <option value="on_hold">On Hold ⏸️</option>
                  <option value="completed">Completed Checkmark ✓</option>
                  <option value="archived">Archived 📦</option>
                </select>
              </div>

              {/* Target Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#8ab4f8]" /> Target Date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-[#131314] text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
                />
              </div>

              {/* Owner / Lead */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#8ab4f8]" /> Owner / Lead
                </label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="e.g. Cory, Simone"
                  className="w-full bg-[#131314] text-slate-200 text-xs px-3.5 py-2.5 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8]"
                />
              </div>
            </div>

            {/* Description & Objective */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#8ab4f8]" /> Description & Primary Objective
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="High-level goal or summary of this initiative..."
                rows={2}
                className="w-full bg-[#131314] text-slate-200 text-xs p-3 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] resize-y"
              />
            </div>

            {/* Project Notes Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#8ab4f8]" /> Project Background Notes & Documentation (Markdown)
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write detailed background notes, key links, constraints, or guidelines for this project..."
                rows={6}
                className="w-full bg-[#131314] text-slate-200 text-xs font-mono p-3.5 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] resize-y min-h-[140px]"
              />
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#131314] border-t border-[#3c4043] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#282a2d] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#8ab4f8] text-[#131314] hover:bg-[#a8c7fa] flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> Save Project Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
