import React from 'react';
import {
  LayoutDashboard,
  Kanban,
  Bot,
  FolderKanban,
  Table,
  Plus,
  Radio,
  Archive,
  CheckSquare,
  RotateCcw,
  LogOut,
  Github,
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
      tooltip: 'Daily Cockpit: Rapid-triage feed optimized for keyboard navigation (J/K/D/P/E) and sub-second task sorting.'
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderKanban,
      tooltip: 'Projects: Project completion metrics, active task counts, and breakdown per vault project.'
    },
    {
      id: 'kanban',
      label: 'Kanban Board',
      icon: Kanban,
      tooltip: 'Kanban Board: Visual drag-and-drop status lanes (Todo, Doing, Blocked, Done).'
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
    <header className="sticky top-0 z-40 bg-[#1e1f20] border-b border-[#2d2f31] px-6 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Google Workspace Brand Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Google Tasks / Product Multi-color Icon Emblem */}
            <div
              title="Task Cockpit — Real-time Obsidian Vault Sync Engine"
              className="w-9 h-9 rounded-xl bg-[#282a2d] border border-[#3c4043] flex items-center justify-center shadow-sm cursor-help"
            >
              <CheckSquare className="w-5 h-5 text-[#8ab4f8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-100 tracking-tight font-sans">
                  Task <span className="font-normal text-slate-300">Cockpit</span>
                </span>
                <span
                  title="Workspace view active"
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#8ab4f8]/10 text-[#8ab4f8] border border-[#8ab4f8]/20"
                >
                  Workspace
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span
                  title={isWsConnected ? 'WebSocket connection active: live syncing with vault .md files' : 'Connecting to WebSocket server...'}
                  className="flex items-center gap-1.5 cursor-help"
                >
                  <Radio className={`w-3 h-3 ${isWsConnected ? 'text-[#81c995] animate-pulse' : 'text-[#fdd663]'}`} />
                  {isWsConnected ? 'Vault Synced' : 'Connecting...'}
                </span>
                <span>•</span>
                <span title="Total number of tasks currently loaded from 1.active_projects/">{taskCount} Tasks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Google Material 3 Navigation Rail / Tabs */}
        <nav className="flex items-center gap-1.5 bg-[#131314] p-1.5 rounded-full border border-[#3c4043] shadow-inner overflow-x-auto max-w-full shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.tooltip}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1a73e8] text-white shadow-lg shadow-[#1a73e8]/50 ring-2 ring-[#8ab4f8] font-bold scale-[1.04]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#282a2d]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white animate-pulse' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#81c995] animate-ping ml-0.5"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Google Primary FAB & Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Desktop Scale View Toggle Button */}
          <button
            onClick={onToggleDesktopMode}
            title={
              isDesktopMode
                ? 'Desktop Scaling Mode Active: App is zoomed to 1280px desktop width. Click to switch to Fluid Mobile View.'
                : 'Fluid Mobile Mode Active: App scales to screen width. Click to switch to Desktop Scaling Mode.'
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              isDesktopMode
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                : 'bg-[#282a2d] text-slate-400 border-[#3c4043] hover:text-slate-200'
            }`}
          >
            {isDesktopMode ? <Monitor className="w-3.5 h-3.5 text-indigo-400" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{isDesktopMode ? 'Desktop Mode' : 'Mobile View'}</span>
          </button>
          {/* Undo Action Button */}
          <button
            onClick={onUndo}
            disabled={undoCount === 0}
            title={
              undoCount > 0
                ? `Undo (Z / Ctrl+Z): Revert "${lastUndoDescription}"`
                : 'Undo (Z / Ctrl+Z): No actions to undo'
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              undoCount > 0
                ? 'bg-[#8ab4f8]/15 text-[#8ab4f8] border-[#8ab4f8]/40 hover:bg-[#8ab4f8]/25 shadow-sm'
                : 'bg-[#131314] text-slate-500 border-[#3c4043]/50 opacity-50 cursor-not-allowed'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${undoCount > 0 ? 'text-[#8ab4f8]' : 'text-slate-500'}`} />
            <span>Undo</span>
            {undoCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-[#8ab4f8] text-[#0f172a] font-bold">
                {undoCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIncludeArchive(!includeArchive)}
            title="Toggle Archive: Show or hide archived tasks from the vault history."
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              includeArchive
                ? 'bg-[#fdd663]/15 text-[#fdd663] border-[#fdd663]/30'
                : 'bg-[#282a2d] text-slate-400 border-[#3c4043] hover:text-slate-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {includeArchive ? 'Archive Included' : 'Archive Hidden'}
          </button>

          {/* Google Material 3 Floating Action Button (FAB) */}
          <button
            onClick={onOpenQuickTask}
            title="Quick Task (+): Open modal to create a new atomic task note or inline checklist item with SOP-compliant YAML frontmatter."
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#0f172a] text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Quick Task
          </button>

          {authInfo && (
            <button
              onClick={onSignOut}
              title={`Connected to ${authInfo.owner}/${authInfo.repo}. Click to Sign Out.`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900 border border-slate-700 text-slate-300 hover:text-rose-300 hover:border-rose-500/50 transition-all cursor-pointer"
            >
              <Github className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline font-mono text-[11px]">{authInfo.repo}</span>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
