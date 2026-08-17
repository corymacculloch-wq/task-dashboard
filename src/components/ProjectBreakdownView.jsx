import React, { useState, useEffect } from 'react';
import { FolderKanban, CheckCircle2, Flame, Plus, ChevronDown, ChevronUp, Calendar, Filter, ArrowUpDown } from 'lucide-react';

export default function ProjectBreakdownView({
  tasks = [],
  onUpdateStatus,
  onOpenEdit,
  onEditTask,
  onOpenQuickTaskWithProject,
  onOpenProjectEdit
}) {
  const handleTaskEdit = onEditTask || onOpenEdit;
  const [collapsedProjects, setCollapsedProjects] = useState({});
  const [filterMap, setFilterMap] = useState({});
  const [sortMap, setSortMap] = useState({});
  const [globalProjectSort, setGlobalProjectSort] = useState('alphabetical');

  // Derive unique project list directly from tasks state (serverless compatible)
  const projectNames = Array.from(new Set(tasks.map((t) => t.project || 'General')));
  if (!projectNames.includes('General')) projectNames.unshift('General');

  const projects = projectNames.map((name) => {
    const projTasks = tasks.filter((t) => (t.project || 'General') === name);
    const completed = projTasks.filter((t) => t.status === 'done').length;
    return {
      name,
      total: projTasks.length,
      completed
    };
  });

  const toggleCollapse = (projectName) => {
    setCollapsedProjects((prev) => ({
      ...prev,
      [projectName]: !prev[projectName]
    }));
  };

  const setProjectFilter = (projectName, filter) => {
    setFilterMap((prev) => ({ ...prev, [projectName]: filter }));
  };

  const setProjectSort = (projectName, sort) => {
    setSortMap((prev) => ({ ...prev, [projectName]: sort }));
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const sortedProjects = [...projects].sort((a, b) => {
    if (globalProjectSort === 'alphabetical') {
      if (a.name === 'General') return -1;
      if (b.name === 'General') return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }
    if (globalProjectSort === 'active') {
      const activeA = a.total - a.completed;
      const activeB = b.total - b.completed;
      return activeB - activeA;
    }
    if (globalProjectSort === 'completion') {
      const pA = a.total > 0 ? a.completed / a.total : 0;
      const pB = b.total > 0 ? b.completed / b.total : 0;
      return pB - pA;
    }
    return 0;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#3c4043]">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#8ab4f8]" /> Project Workspaces Breakdown
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active initiative workspaces in <code className="text-[#8ab4f8]">1.active_projects/</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#131314] px-3 py-1.5 rounded-full border border-[#3c4043]">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span className="font-semibold text-slate-400">Order Workspaces:</span>
            <select
              value={globalProjectSort}
              onChange={(e) => setGlobalProjectSort(e.target.value)}
              className="bg-[#1e1f20] text-slate-100 text-xs font-semibold px-2 py-0.5 rounded-lg border border-[#3c4043] focus:outline-none cursor-pointer"
            >
              <option value="alphabetical">Alphabetical (A-Z)</option>
              <option value="active">Most Active Items</option>
              <option value="completion">Highest % Complete</option>
            </select>
          </div>
          <div className="text-xs text-slate-400 font-semibold bg-[#131314] px-3 py-1.5 rounded-full border border-[#3c4043]">
            {projects.length} Active Workspace Projects
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedProjects.map((proj) => {
          const rawProjTasks = tasks.filter((t) => t.project === proj.name);
          const percent = proj.total > 0 ? Math.round((proj.completed / proj.total) * 100) : 0;
          const isCollapsed = !!collapsedProjects[proj.name];
          const currentFilter = filterMap[proj.name] || 'active';
          const currentSort = sortMap[proj.name] || 'priority';

          // 1. Filter Tasks
          let filteredTasks = rawProjTasks.filter((t) => {
            if (currentFilter === 'active') return t.status !== 'done' && t.status !== 'archived';
            if (currentFilter === 'high') return t.priority === 'high';
            if (currentFilter === 'due') return !!t.due;
            if (currentFilter === 'completed') return t.status === 'done';
            return true;
          });

          // 2. Sort Tasks
          filteredTasks.sort((a, b) => {
            if (currentSort === 'priority') {
              const weight = { high: 3, medium: 2, low: 1 };
              return (weight[b.priority] || 2) - (weight[a.priority] || 2);
            }
            if (currentSort === 'due') {
              if (!a.due) return 1;
              if (!b.due) return -1;
              return a.due.localeCompare(b.due);
            }
            if (currentSort === 'title') {
              return a.title.localeCompare(b.title);
            }
            if (currentSort === 'status') {
              if (a.status === b.status) return 0;
              return a.status === 'done' ? 1 : -1;
            }
            return 0;
          });

          return (
            <div
              key={proj.name}
              className="g-surface-1 p-5 rounded-3xl border border-[#3c4043] flex flex-col justify-between space-y-4 shadow-xl transition-all"
            >
              <div>
                {/* Project Header Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(proj.name);
                      }}
                      title={isCollapsed ? 'Expand Project Card' : 'Collapse Project Card'}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#282a2d] transition-colors"
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <div
                      onClick={() => onOpenProjectEdit && onOpenProjectEdit(proj.name)}
                      title={`Click to open project settings for ${proj.name}`}
                      className="flex items-center gap-2 cursor-pointer group/title hover:bg-[#282a2d] px-2 py-1 rounded-xl transition-all"
                    >
                      <FolderKanban className="w-5 h-5 text-[#8ab4f8] group-hover/title:scale-110 transition-transform" />
                      <h3 className="text-base font-bold text-slate-100 group-hover/title:text-[#8ab4f8] transition-colors flex items-center gap-1.5">
                        {proj.name}
                        <span className="text-[10px] opacity-0 group-hover/title:opacity-100 text-[#8ab4f8] font-normal font-mono transition-opacity">✏️ Edit</span>
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenQuickTaskWithProject && onOpenQuickTaskWithProject(proj.name)}
                      title={`Add Task directly to ${proj.name}`}
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#8ab4f8]/15 text-[#8ab4f8] hover:bg-[#8ab4f8] hover:text-[#0f172a] border border-[#8ab4f8]/30 transition-all cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Add Task
                    </button>
                    <span className="text-xs font-semibold px-3 py-0.5 rounded-full g-blue-pill">
                      {percent}% Complete
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-[#131314] overflow-hidden mb-3 border border-[#3c4043]">
                  <div
                    className="h-full bg-gradient-to-r from-[#1a73e8] to-[#81c995] transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>

                {/* Project Stats Summary */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#81c995]" /> {proj.completed} / {proj.total} Completed
                    </span>
                    {proj.highPriority > 0 && (
                      <span className="flex items-center gap-1 text-[#fdd663] font-medium">
                        <Flame className="w-3.5 h-3.5" /> {proj.highPriority} High
                      </span>
                    )}
                  </div>
                </div>

                {!isCollapsed && (
                  <>
                    {/* Per-Project Filter & Sort Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#131314] border border-[#3c4043] mb-3">
                      {/* Filter Select Dropdown */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <Filter className="w-3.5 h-3.5 text-[#8ab4f8]" />
                        <span className="font-semibold text-slate-400">Filter:</span>
                        <select
                          value={currentFilter}
                          onChange={(e) => setProjectFilter(proj.name, e.target.value)}
                          className="bg-[#1e1f20] text-slate-100 text-xs font-semibold px-3 py-1 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
                        >
                          <option value="all">All Tasks</option>
                          <option value="active">Active Only</option>
                          <option value="completed">Done / Completed ✓</option>
                          <option value="high">High Priority 🔥</option>
                          <option value="due">Due Date Assigned</option>
                        </select>
                      </div>

                      {/* Sort Selector */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <ArrowUpDown className="w-3.5 h-3.5 text-[#8ab4f8]" />
                        <span className="font-semibold text-slate-400">Sort:</span>
                        <select
                          value={currentSort}
                          onChange={(e) => setProjectSort(proj.name, e.target.value)}
                          className="bg-[#1e1f20] text-slate-100 text-xs font-semibold px-3 py-1 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
                        >
                          <option value="priority">Priority</option>
                          <option value="due">Due Date</option>
                          <option value="title">Title (A-Z)</option>
                          <option value="status">Status</option>
                        </select>
                      </div>
                    </div>

                    {/* Task Rows List */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {filteredTasks.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-500 italic bg-[#131314]/50 rounded-2xl border border-[#3c4043]/40">
                          No tasks match current filter ({currentFilter})
                        </div>
                      ) : (
                        filteredTasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleTaskEdit && handleTaskEdit(t)}
                            title="Click task to open Edit View"
                            className="g-surface-2 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs border border-[#3c4043]/60 hover:border-[#8ab4f8] hover:bg-[#282a2d] transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className={`text-xs font-semibold truncate group-hover:text-[#8ab4f8] transition-colors ${
                                  t.status === 'done' ? 'line-through text-slate-500' : 'text-slate-100'
                                }`}
                              >
                                {t.title}
                              </span>
                              {t.priority === 'high' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-[#fdd663]/15 text-[#fdd663] border border-[#fdd663]/30">
                                  HIGH
                                </span>
                              )}
                              {t.due && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded flex items-center gap-1 font-mono ${
                                    t.due <= todayStr ? 'text-[#f28b82] font-bold' : 'text-slate-400'
                                  }`}
                                >
                                  <Calendar className="w-2.5 h-2.5" />
                                  {t.due}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(t.id, t.status === 'done' ? 'todo' : 'done');
                              }}
                              title={t.status === 'done' ? 'Reopen task' : 'Mark task completed'}
                              className={`text-[10px] px-3 py-1 rounded-full font-semibold border transition-all duration-200 cursor-pointer ${
                                t.status === 'done'
                                  ? 'bg-[#3c4043]/50 text-slate-400 border-[#3c4043] hover:bg-[#f28b82]/20 hover:text-[#f28b82] hover:border-[#f28b82]/40'
                                  : 'bg-[#81c995]/15 text-[#81c995] border-[#81c995]/40 hover:bg-[#81c995] hover:text-[#0f172a] hover:border-[#81c995] hover:shadow-md hover:shadow-[#81c995]/30'
                              }`}
                            >
                              {t.status === 'done' ? 'Reopen' : '✓ Complete'}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
