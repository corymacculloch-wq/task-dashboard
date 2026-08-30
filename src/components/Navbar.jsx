import React from 'react';
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
  Smartphone
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenQuickTask,
  includeArchive,
  setIncludeArchive,
  isWsConnected,
  taskCount,
  onUndo,
  undoCount = 0,
  lastUndoDescription = '',
  onSignOut,
  authInfo,
  isDesktopMode,
  onToggleDesktopMode
}) {
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
    <header className="sticky top-0 z-40 bg-[#1e1f20] border-b border-[#2d2f31] px-4 sm:px-6 py-2.5 shadow-md w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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

          {/* Quick Actions on Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onToggleDesktopMode}
              title={
                isDesktopMode
                  ? 'Desktop Mode Active: App is zoomed to 1280px desktop width.'
                  : 'Fluid Mobile Mode Active.'
              }
              className="p-1.5 rounded-xl bg-[#282a2d] border border-[#3c4043] text-slate-300 hover:text-slate-100 transition-all cursor-pointer"
            >
              {isDesktopMode ? <Monitor className="w-3.5 h-3.5 text-indigo-400" /> : <Smartphone className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onUndo}
              disabled={undoCount === 0}
              title={undoCount > 0 ? `Undo (${undoCount} action${undoCount > 1 ? 's' : ''}): ${lastUndoDescription}` : 'Nothing to undo'}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                undoCount > 0
                  ? 'bg-[#282a2d] text-amber-300 border-amber-500/40 hover:bg-[#3c4043]'
                  : 'bg-[#1e1f20] text-slate-500 border-[#3c4043] opacity-40 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px]">Undo</span>
            </button>

            <button
              onClick={onOpenQuickTask}
              title="Quick Task (+): Open modal to create a new task"
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

        {/* Right Side on Desktop: Controls (Desktop Toggle + Undo + Sign Out + Far Right + Task Pill) */}
        <div className="hidden md:flex items-center gap-2">
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

          {/* Undo Button */}
          <button
            onClick={onUndo}
            disabled={undoCount === 0}
            title={undoCount > 0 ? `Undo (${undoCount} action${undoCount > 1 ? 's' : ''}): ${lastUndoDescription}` : 'Nothing to undo'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
              undoCount > 0
                ? 'bg-[#282a2d] text-amber-300 border-amber-500/40 hover:bg-[#3c4043] shadow-sm'
                : 'bg-[#1e1f20] text-slate-500 border-[#3c4043] opacity-40 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
            {undoCount > 0 && (
              <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {undoCount}
              </span>
            )}
          </button>

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
