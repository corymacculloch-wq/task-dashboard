import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Bot,
  FolderKanban,
  Table,
  Plus,
  Radio,
  CheckSquare,
  RotateCcw,
  LogOut,
  Monitor,
  Smartphone,
  ChevronDown,
  X,
  Trash2,
  CheckCircle2,
  Calendar,
  Edit3
} from 'lucide-react';

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenQuickTask,
  isWsConnected,
  taskCount,
  undoHistory = [],
  onUndoSpecific,
  onUndoLatest,
  onClearUndoHistory,
  onSignOut,
  authInfo,
  isDesktopMode,
  onToggleDesktopMode
}) {
  const [isUndoOpen, setIsUndoOpen] = useState(false);
  const undoRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (undoRef.current && !undoRef.current.contains(event.target)) {
        setIsUndoOpen(false);
      }
    }
    if (isUndoOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUndoOpen]);

  const tabs = [
    {
      id: 'cockpit',
      label: 'Daily Cockpit',
      icon: LayoutDashboard,
      tooltip: 'Daily Cockpit: Due-date timeline and active project task aggregator across the vault.'
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderKanban,
      tooltip: 'Projects: Project completion metrics, active task counts, and breakdown per vault project.'
    },
    {
      id: 'agent',
      label: 'Agent Queue',
      icon: Bot,
      tooltip: 'Agent Queue: Human-in-the-Loop delegation queue for AI agent candidate tasks [assignee:: agent].'
    },
    {
      id: 'table',
      label: 'Master Table',
      icon: Table,
      tooltip: 'Master Table: Searchable, filterable database table for bulk property editing, frontmatter inspection, and cross-project analysis.'
    }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#1e1f20] border-b border-[#2d2f31] px-4 sm:px-6 py-2.5 shadow-md w-full max-w-full">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 relative">
        {/* Left Side: Brand Logo + Mobile Controls */}
        <div className="flex items-center justify-between gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <div
              title="Task Cockpit — Real-time Obsidian Vault Sync Engine"
              className="w-8 h-8 rounded-xl bg-[#282a2d] border border-[#3c4043] flex items-center justify-center shadow-sm shrink-0"
            >
              <CheckSquare className="w-4 h-4 text-[#8ab4f8]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-slate-100 tracking-tight font-sans">
                  Task <span className="font-normal text-slate-300">Cockpit</span>
                </span>
                <span
                  title={isWsConnected ? 'Vault Synced' : 'Connecting...'}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#81c995]/10 text-[#81c995] border border-[#81c995]/20"
                >
                  <Radio className="w-2.5 h-2.5 text-[#81c995] animate-pulse" />
                  {taskCount}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onToggleDesktopMode}
              title={isDesktopMode ? 'Switch to Fluid Mobile View' : 'Switch to Desktop Scaling View'}
              className="p-1.5 rounded-xl bg-[#282a2d] border border-[#3c4043] text-slate-300 hover:text-slate-100 transition-all cursor-pointer"
            >
              {isDesktopMode ? <Monitor className="w-3.5 h-3.5 text-indigo-400" /> : <Smartphone className="w-3.5 h-3.5" />}
            </button>

            {/* Mobile Undo Button */}
            <button
              onClick={() => setIsUndoOpen(!isUndoOpen)}
              title="Undo History: View and revert recorded actions"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                undoHistory.length > 0
                  ? 'bg-[#282a2d] text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-[#282a2d] text-slate-300 border-[#3c4043]'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">Undo</span>
              {undoHistory.length > 0 && (
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-1 rounded-full">
                  {undoHistory.length}
                </span>
              )}
            </button>

            {/* Mobile + Task Button */}
            <button
              onClick={onOpenQuickTask}
              title="Create new task"
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#0f172a] text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Task</span>
            </button>
          </div>
        </div>

        {/* Center: Navigation Tabs (Scrollable on Mobile) */}
        <nav className="flex items-center gap-1.5 bg-[#131314] p-1 rounded-full border border-[#3c4043] overflow-x-auto max-w-full w-full md:w-auto shrink-0 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.tooltip}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#1a73e8] text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#282a2d]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Side on Desktop: Controls (Desktop Toggle + Undo Button + Sign Out + Far Right + Task Pill) */}
        <div className="hidden md:flex items-center gap-2 relative">
          <button
            onClick={onToggleDesktopMode}
            title={
              isDesktopMode
                ? 'Desktop Mode Active: App is zoomed to 1280px desktop width. Click to switch to Fluid Mobile View.'
                : 'Fluid Mobile Mode Active: App scales to screen width. Click to switch to Desktop Scaling Mode.'
            }
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              isDesktopMode
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                : 'bg-[#282a2d] text-slate-300 border-[#3c4043] hover:text-slate-100'
            }`}
          >
            {isDesktopMode ? <Monitor className="w-3.5 h-3.5 text-indigo-400" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{isDesktopMode ? 'Desktop' : 'Mobile'}</span>
          </button>

          {/* Undo Button with Popover Trigger */}
          <div className="relative" ref={undoRef}>
            <button
              onClick={() => setIsUndoOpen(!isUndoOpen)}
              title="Undo History: Click to view recorded actions and selectively revert"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                isUndoOpen
                  ? 'bg-[#3c4043] text-amber-300 border-amber-400 shadow-md ring-2 ring-amber-400/20'
                  : undoHistory.length > 0
                  ? 'bg-[#282a2d] text-amber-300 border-amber-500/50 hover:bg-[#3c4043] shadow-sm'
                  : 'bg-[#282a2d] text-slate-300 border-[#3c4043] hover:text-slate-100'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Undo</span>
              {undoHistory.length > 0 && (
                <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {undoHistory.length}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isUndoOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Undo History Dropdown Popover */}
            {isUndoOpen && (
              <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 bg-[#1e1f20] border border-[#3c4043] rounded-3xl shadow-2xl p-4 text-slate-100 animate-fadeIn">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#3c4043]">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-slate-100">Undo History</h4>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.2 rounded-full font-bold">
                      {undoHistory.length} recorded
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {undoHistory.length > 0 && (
                      <button
                        onClick={() => {
                          onClearUndoHistory();
                        }}
                        title="Clear all undo history"
                        className="text-[11px] text-slate-400 hover:text-rose-300 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                    <button
                      onClick={() => setIsUndoOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Revert Most Recent Button */}
                {undoHistory.length > 0 && (
                  <div className="pt-3 pb-2">
                    <button
                      onClick={() => {
                        onUndoLatest();
                      }}
                      className="w-full py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" /> Revert Most Recent Action
                      </span>
                      <span className="text-[10px] text-amber-400/80 font-mono">Ctrl+Z</span>
                    </button>
                  </div>
                )}

                {/* History Items List */}
                <div className="mt-2 max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {undoHistory.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                      <RotateCcw className="w-6 h-6 text-slate-600 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-slate-300">No actions in history</p>
                      <p className="text-[11px] text-slate-500 px-4">
                        Task status changes, property edits, and due dates will be recorded here for selective undo.
                      </p>
                    </div>
                  ) : (
                    undoHistory.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#131314] border border-[#3c4043] p-3 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-500 transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 truncate">
                            {item.type === 'status' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#81c995] shrink-0" />
                            ) : item.type === 'schedule' ? (
                              <Calendar className="w-3.5 h-3.5 text-[#8ab4f8] shrink-0" />
                            ) : (
                              <Edit3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span className="truncate">{item.description}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                            {item.project && <span className="text-slate-300 font-medium">{item.project}</span>}
                            <span>• {formatTimeAgo(item.timestamp)}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onUndoSpecific(item.id);
                          }}
                          title={`Selectively revert this change: ${item.description}`}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm"
                        >
                          Revert
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {authInfo && (
            <button
              onClick={onSignOut}
              title={`Connected to ${authInfo.owner}/${authInfo.repo}. Click to Sign Out.`}
              className="p-1.5 rounded-xl bg-[#282a2d] border border-[#3c4043] text-slate-300 hover:text-rose-300 transition-all cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}

          {/* + Task Pill at the Far Right */}
          <button
            onClick={onOpenQuickTask}
            title="Quick Task (+): Open modal to create a new task"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#0f172a] text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Task</span>
          </button>
        </div>
      </div>
    </header>
  );
}
