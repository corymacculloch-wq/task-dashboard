import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  CheckCircle2,
  Flame,
  Plus,
  ChevronDown,
  ChevronUp,
  Calendar,
  Filter,
  ArrowUpDown,
  Info,
  AlertCircle,
  Folder,
  Mail,
  ExternalLink,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  Columns,
  ChevronsUpDown,
  ChevronsDownUp,
  Search
} from 'lucide-react';

export default function ProjectBreakdownView({
  tasks = [],
  onUpdateStatus,
  onOpenEdit,
  onEditTask,
  onOpenQuickTaskWithProject,
  onOpenProjectEdit
}) {
  const handleTaskEdit = onEditTask || onOpenEdit;

  // View Layout Mode: 'accordion' (default) | 'cards' | 'split'
  const [viewLayout, setViewLayout] = useState(() => {
    try {
      return localStorage.getItem('vault_projects_layout') || 'accordion';
    } catch (e) {
      return 'accordion';
    }
  });

  // Hide Inactive Projects State (projects with 0 active tasks)
  const [hideInactive, setHideInactive] = useState(() => {
    try {
      return localStorage.getItem('vault_hide_inactive_projects') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Expand/collapse states for accordion and cards
  const [expandedAccordionProjects, setExpandedAccordionProjects] = useState({});
  const [collapsedCardsProjects, setCollapsedCardsProjects] = useState({});

  // Split view selected project
  const [selectedSplitProject, setSelectedSplitProject] = useState(null);

  // Filters & sorting
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [filterMap, setFilterMap] = useState({});
  const [sortMap, setSortMap] = useState({});
  const [globalProjectSort, setGlobalProjectSort] = useState('alphabetical');
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [showGuide, setShowGuide] = useState(false);

  // Email Correspondence state
  const [projectCorrespondence, setProjectCorrespondence] = useState({});
  const [loadingCorresp, setLoadingCorresp] = useState({});
  const [expandedCorresp, setExpandedCorresp] = useState({});

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleSetLayout = (layout) => {
    setViewLayout(layout);
    try {
      localStorage.setItem('vault_projects_layout', layout);
    } catch (e) {}
  };

  const toggleHideInactive = () => {
    setHideInactive((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vault_hide_inactive_projects', String(next));
      } catch (e) {}
      return next;
    });
  };

  const toggleAccordionProject = (projectName) => {
    setExpandedAccordionProjects((prev) => ({
      ...prev,
      [projectName]: !prev[projectName]
    }));
  };

  const toggleCardCollapse = (projectName) => {
    setCollapsedCardsProjects((prev) => ({
      ...prev,
      [projectName]: !prev[projectName]
    }));
  };

  const toggleCorresp = async (projectName) => {
    setExpandedCorresp((prev) => ({ ...prev, [projectName]: !prev[projectName] }));
    if (!projectCorrespondence[projectName]) {
      setLoadingCorresp((prev) => ({ ...prev, [projectName]: true }));
      try {
        const url = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? `/api/projects/${encodeURIComponent(projectName)}/correspondence`
          : `http://localhost:3001/api/projects/${encodeURIComponent(projectName)}/correspondence`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setProjectCorrespondence((prev) => ({ ...prev, [projectName]: data.correspondence }));
          }
        }
      } catch (err) {
        console.warn('Failed to fetch correspondence:', err);
      } finally {
        setLoadingCorresp((prev) => ({ ...prev, [projectName]: false }));
      }
    }
  };

  // Derive unique project list directly from tasks state
  const projectNames = Array.from(new Set(tasks.map((t) => t.project || 'General')));
  if (!projectNames.includes('General')) projectNames.unshift('General');

  const projects = projectNames.map((name) => {
    const projTasks = tasks.filter((t) => (t.project || 'General') === name);
    const completed = projTasks.filter((t) => t.status === 'done' || t.status === 'archived').length;
    const activeTasksCount = projTasks.filter((t) => t.status !== 'done' && t.status !== 'archived').length;
    const emailTasksCount = projTasks.filter((t) => t.email_ref).length;
    const highPriority = projTasks.filter((t) => t.priority === 'high' && t.status !== 'done' && t.status !== 'archived').length;
    return {
      name,
      total: projTasks.length,
      completed,
      activeTasksCount,
      highPriority,
      emailTasksCount
    };
  });

  const setProjectFilter = (projectName, filter) => {
    setFilterMap((prev) => ({ ...prev, [projectName]: filter }));
  };

  const setProjectSort = (projectName, sort) => {
    setSortMap((prev) => ({ ...prev, [projectName]: sort }));
  };

  // Sort projects according to global sorting preference
  const sortedProjects = [...projects].sort((a, b) => {
    if (globalProjectSort === 'alphabetical') {
      if (a.name === 'General') return -1;
      if (b.name === 'General') return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }
    if (globalProjectSort === 'active') {
      return b.activeTasksCount - a.activeTasksCount;
    }
    if (globalProjectSort === 'completion') {
      const pA = a.total > 0 ? a.completed / a.total : 0;
      const pB = b.total > 0 ? b.completed / b.total : 0;
      return pB - pA;
    }
    return 0;
  });

  const inactiveProjectsCount = projects.filter((p) => p.activeTasksCount === 0).length;

  // Filter projects by dropdown, inactive toggle, and quick text search
  const displayedProjects = sortedProjects.filter((p) => {
    if (selectedProject !== 'ALL') {
      return p.name === selectedProject;
    }
    if (hideInactive && p.activeTasksCount === 0) {
      return false;
    }
    if (projectSearchQuery.trim()) {
      return p.name.toLowerCase().includes(projectSearchQuery.toLowerCase().trim());
    }
    return true;
  });

  // Ensure valid selected project in split view
  useEffect(() => {
    if (displayedProjects.length > 0) {
      if (!selectedSplitProject || !displayedProjects.some((p) => p.name === selectedSplitProject)) {
        setSelectedSplitProject(displayedProjects[0].name);
      }
    }
  }, [displayedProjects, selectedSplitProject]);

  // Master Expand All / Collapse All for Accordion View
  const allAccordionExpanded = displayedProjects.length > 0 &&
    displayedProjects.every((p) => !!expandedAccordionProjects[p.name]);

  const handleToggleExpandAll = () => {
    if (allAccordionExpanded) {
      setExpandedAccordionProjects({});
    } else {
      const all = {};
      displayedProjects.forEach((p) => {
        all[p.name] = true;
      });
      setExpandedAccordionProjects(all);
    }
  };

  // Helper: Retrieve and sort filtered tasks for a project
  const getProjectTasks = (projectName) => {
    const rawProjTasks = tasks.filter((t) => (t.project || 'General') === projectName);
    const currentFilter = filterMap[projectName] || 'active';
    const currentSort = sortMap[projectName] || 'priority';

    let filtered = rawProjTasks.filter((t) => {
      if (currentFilter === 'active') return t.status !== 'done' && t.status !== 'archived';
      if (currentFilter === 'high') return t.priority === 'high';
      if (currentFilter === 'due') return !!t.due;
      if (currentFilter === 'completed') return t.status === 'done';
      if (currentFilter === 'gmail') return !!t.email_ref;
      return true;
    });

    filtered.sort((a, b) => {
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

    return { filteredTasks: filtered, currentFilter, currentSort, rawCount: rawProjTasks.length };
  };

  // Render correspondence timeline for a project
  const renderCorrespondenceTimeline = (projectName) => {
    const correspList = projectCorrespondence[projectName] || [];
    let stalenessBadge = null;
    if (correspList.length > 0) {
      const dates = correspList.map((c) => new Date(c.date)).filter((d) => !isNaN(d.getTime()));
      if (dates.length > 0) {
        const latestDate = new Date(Math.max(...dates));
        const daysSince = Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 30) {
          stalenessBadge = (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fdd663]/15 text-[#fdd663] border border-[#fdd663]/30">
              ⏳ Stale ({daysSince}d)
            </span>
          );
        } else {
          stalenessBadge = (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#81c995]/15 text-[#81c995] border border-[#81c995]/30">
              🟢 Active ({daysSince === 0 ? 'Today' : `${daysSince}d ago`})
            </span>
          );
        }
      }
    }

    return (
      <div className="mt-3 pt-3 border-t border-[#3c4043]/50">
        <button
          type="button"
          onClick={() => toggleCorresp(projectName)}
          className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-400 hover:text-[#8ab4f8] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span>Email Timeline ({correspList.length})</span>
            {stalenessBadge}
          </span>
          {expandedCorresp[projectName] ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {expandedCorresp[projectName] && (
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
            {loadingCorresp[projectName] ? (
              <div className="text-center py-2 text-[11px] text-slate-500 italic">
                Loading email correspondence...
              </div>
            ) : correspList.length === 0 ? (
              <div className="text-center py-2.5 text-[11px] text-slate-500 italic bg-[#131314]/40 rounded-xl">
                No correspondence logged under ## Correspondence in project.md
              </div>
            ) : (
              correspList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-[#131314] rounded-xl border border-[#3c4043]/40 flex items-center justify-between gap-3 text-xs hover:border-[#8ab4f8]/50 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#8ab4f8] hover:underline font-semibold truncate block"
                    >
                      {item.subject}
                    </a>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1">
                      <span className="font-mono bg-[#1e1f20] px-1.5 py-0.5 rounded text-slate-300">{item.date}</span>
                      <span className="truncate">From: <strong className="text-slate-200">{item.sender}</strong></span>
                    </div>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold text-[#8ab4f8] bg-[#8ab4f8]/10 hover:bg-[#8ab4f8]/20 border border-[#8ab4f8]/30 flex items-center gap-1 shrink-0"
                    title="Open email in Gmail"
                  >
                    <span>Gmail</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  // Render task list and toolbar for a project
  const renderProjectTaskContent = (projectName) => {
    const { filteredTasks, currentFilter, currentSort } = getProjectTasks(projectName);

    return (
      <div className="space-y-3">
        {/* Per-Project Filter & Sort Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#131314] border border-[#3c4043]">
          {/* Filter Select Dropdown */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <Filter className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span className="font-semibold text-slate-400">Filter:</span>
            <select
              value={currentFilter}
              onChange={(e) => setProjectFilter(projectName, e.target.value)}
              className="bg-[#1e1f20] text-slate-100 text-xs font-semibold px-3 py-1 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
            >
              <option value="active">Active Only</option>
              <option value="all">All Tasks</option>
              <option value="gmail">Gmail Linked ✉️</option>
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
              onChange={(e) => setProjectSort(projectName, e.target.value)}
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
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-[#fdd663]/15 text-[#fdd663] border border-[#fdd663]/30 shrink-0">
                      HIGH
                    </span>
                  )}
                  {t.due && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded flex items-center gap-1 font-mono shrink-0 ${
                        t.due <= todayStr ? 'text-[#f28b82] font-bold' : 'text-slate-400'
                      }`}
                    >
                      <Calendar className="w-2.5 h-2.5" />
                      {t.due}
                    </span>
                  )}
                  {t.email_ref && (
                    <a
                      href={t.email_ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title={t.email_sender ? `From: ${t.email_sender}` : 'Open email thread in Gmail'}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#f28b82] bg-[#ea4335]/15 hover:bg-[#ea4335]/25 border border-[#ea4335]/30 px-1.5 py-0.2 rounded-full transition-colors shrink-0"
                    >
                      <Mail className="w-2.5 h-2.5 text-[#ea4335]" /> Gmail ↗
                    </a>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(t.id, t.status === 'done' ? 'todo' : 'done');
                  }}
                  title={t.status === 'done' ? 'Reopen task' : 'Mark task completed'}
                  className={`text-[10px] px-3 py-1 rounded-full font-semibold border transition-all duration-200 cursor-pointer shrink-0 ${
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

        {/* Associated Email Correspondence Section */}
        {renderCorrespondenceTimeline(projectName)}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#3c4043]">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#8ab4f8]" /> Project Workspaces Breakdown
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active initiative workspaces in <code className="text-[#8ab4f8]">1.active_projects/</code>
          </p>
        </div>

        {/* Controls Bar: Layout Selector, Hide Inactive, Project Selector, Order */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Interactive View Layout Switcher */}
          <div className="flex items-center bg-[#131314] p-1 rounded-full border border-[#3c4043]">
            <button
              onClick={() => handleSetLayout('accordion')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                viewLayout === 'accordion'
                  ? 'bg-[#8ab4f8] text-[#0f172a] shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive Accordion: Click any project to expand its active tasks"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Accordion</span>
            </button>
            <button
              onClick={() => handleSetLayout('cards')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                viewLayout === 'cards'
                  ? 'bg-[#8ab4f8] text-[#0f172a] shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid Cards: Classic multi-column cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => handleSetLayout('split')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                viewLayout === 'split'
                  ? 'bg-[#8ab4f8] text-[#0f172a] shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Split View: Project list on left, active tasks on right"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
          </div>

          {/* Hide Inactive Projects Toggle Button */}
          <button
            type="button"
            onClick={toggleHideInactive}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
              hideInactive
                ? 'bg-[#ea4335]/15 text-[#f28b82] border-[#ea4335]/40 hover:bg-[#ea4335]/25 shadow-sm'
                : 'bg-[#131314] text-slate-300 border-[#3c4043] hover:border-slate-400'
            }`}
            title={hideInactive ? 'Showing active initiatives only (click to show all projects)' : 'Click to hide projects with 0 active tasks'}
          >
            {hideInactive ? <EyeOff className="w-3.5 h-3.5 text-[#f28b82]" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
            <span>{hideInactive ? `Active Only (${inactiveProjectsCount} hidden)` : `Hide Inactive (${inactiveProjectsCount})`}</span>
          </button>

          {/* Project Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#8ab4f8]/15 border border-[#8ab4f8]/40 hover:bg-[#8ab4f8]/25 rounded-full px-3 py-1.5 transition-all">
            <Folder className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-transparent text-[#8ab4f8] text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#1e1f20] text-slate-200">All Projects</option>
              {projects.map((p) => (
                <option key={p.name} value={p.name} className="bg-[#1e1f20] text-slate-200">
                  {p.name} ({p.activeTasksCount} active)
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#131314] px-3 py-1.5 rounded-full border border-[#3c4043]">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span className="font-semibold text-slate-400">Order:</span>
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

          {/* Project Count Pill */}
          <div className="text-xs text-slate-400 font-semibold bg-[#131314] px-3 py-1.5 rounded-full border border-[#3c4043]">
            {displayedProjects.length} {displayedProjects.length === 1 ? 'Project' : 'Projects'}
          </div>
        </div>
      </div>

      {/* Guide Card */}
      <div className="bg-[#1e1f20] border border-[#3c4043] rounded-3xl p-4 text-xs text-slate-300 shadow-md">
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setShowGuide(!showGuide)}
        >
          <div className="flex items-center gap-2 font-bold text-slate-100">
            <Info className="w-4 h-4 text-[#8ab4f8]" />
            <span>Workspace Discovery & Inclusion Rules</span>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span>{showGuide ? 'Hide Rules' : 'View Rules'}</span>
            {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showGuide && (
          <div className="mt-3 pt-3 border-t border-[#3c4043] space-y-3">
            <p className="text-slate-300 leading-relaxed">
              Project workspaces are dynamically populated from task notes inside <code className="text-[#8ab4f8] bg-[#131314] px-1.5 py-0.5 rounded border border-[#3c4043]">1.active_projects/</code> (e.g. atomic <code className="text-slate-200">task-*.md</code> files or checklist items in <code className="text-slate-200">project.md</code> / <code className="text-slate-200">plan.md</code>).
            </p>
            <div className="bg-[#131314] border border-[#3c4043] rounded-2xl p-3.5 space-y-2">
              <span className="font-bold text-[#f28b82] flex items-center gap-1.5 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-[#f28b82]" /> Filtering & Visibility:
              </span>
              <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside pl-1">
                <li>
                  <strong className="text-slate-100">Hide Inactive Projects:</strong> Use the <code className="text-[#f28b82]">Hide Inactive</code> toggle button above to filter out initiatives with 0 active tasks (100% completed or empty).
                </li>
                <li>
                  <strong className="text-slate-100">Interactive Accordion:</strong> Click any project row to smoothly unfold all of its active tasks, or use <code className="text-[#8ab4f8]">Expand All</code>.
                </li>
                <li>
                  <strong className="text-slate-100">Direct Workspace Editing:</strong> Click any project title or the edit icon to open project notes and settings directly.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Empty State when all projects are filtered out */}
      {displayedProjects.length === 0 && (
        <div className="p-8 text-center bg-[#1e1f20] border border-[#3c4043] rounded-3xl space-y-3">
          <FolderKanban className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Projects Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {hideInactive
              ? `All current initiatives have 0 active tasks (${inactiveProjectsCount} completed or inactive projects are currently hidden).`
              : 'No projects match your current search and filter criteria.'}
          </p>
          {hideInactive && (
            <button
              onClick={toggleHideInactive}
              className="px-4 py-1.5 bg-[#8ab4f8]/15 text-[#8ab4f8] hover:bg-[#8ab4f8] hover:text-[#0f172a] text-xs font-bold rounded-full border border-[#8ab4f8]/30 transition-all cursor-pointer"
            >
              Show All Inactive Projects
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: INTERACTIVE ACCORDION (Expand on Click)                          */}
      {/* ========================================================================= */}
      {viewLayout === 'accordion' && displayedProjects.length > 0 && (
        <div className="space-y-3">
          {/* Top Accordion Toolbar: Expand All / Collapse All + Quick Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#1e1f20] text-slate-300 border border-[#3c4043] hover:text-[#8ab4f8] hover:border-[#8ab4f8]/40 transition-all cursor-pointer"
            >
              {allAccordionExpanded ? <ChevronsDownUp className="w-3.5 h-3.5 text-[#8ab4f8]" /> : <ChevronsUpDown className="w-3.5 h-3.5 text-[#8ab4f8]" />}
              <span>{allAccordionExpanded ? 'Collapse All Projects' : 'Expand All Projects'}</span>
            </button>

            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="bg-[#131314] text-slate-100 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] w-48 sm:w-60 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Accordion Rows */}
          <div className="space-y-2.5">
            {displayedProjects.map((proj) => {
              const percent = proj.total > 0 ? Math.round((proj.completed / proj.total) * 100) : 0;
              const isExpanded = !!expandedAccordionProjects[proj.name];

              return (
                <div
                  key={proj.name}
                  className={`g-surface-1 rounded-3xl border transition-all shadow-md overflow-hidden ${
                    isExpanded ? 'border-[#8ab4f8]/50 ring-1 ring-[#8ab4f8]/20' : 'border-[#3c4043] hover:border-[#8ab4f8]/40'
                  }`}
                >
                  {/* Clickable Project Summary Header Bar */}
                  <div
                    onClick={() => toggleAccordionProject(proj.name)}
                    className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-[#282a2d]/50 transition-colors select-none"
                  >
                    {/* Left: Expand Chevron, Project Title & Badges */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="p-1 rounded-lg text-slate-400 hover:text-slate-100 transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#8ab4f8]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </span>

                      <div className="flex items-center gap-2 min-w-0">
                        <FolderKanban className="w-4 h-4 text-[#8ab4f8] shrink-0" />
                        <h3 className="font-bold text-slate-100 text-sm hover:text-[#8ab4f8] transition-colors truncate">
                          {proj.name}
                        </h3>
                      </div>

                      {/* Active Tasks Pill */}
                      {proj.activeTasksCount > 0 ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#8ab4f8]/15 text-[#8ab4f8] border border-[#8ab4f8]/30 shrink-0">
                          🔥 {proj.activeTasksCount} active
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#3c4043]/30 text-slate-500 shrink-0">
                          0 active
                        </span>
                      )}

                      {/* Completed / Total Pill */}
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block shrink-0">
                        ✓ {proj.completed}/{proj.total}
                      </span>

                      {/* High Priority Pill */}
                      {proj.highPriority > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fdd663]/15 text-[#fdd663] border border-[#fdd663]/30 hidden md:inline-flex items-center gap-1 shrink-0">
                          <Flame className="w-3 h-3 text-[#fdd663]" /> {proj.highPriority} High
                        </span>
                      )}

                      {/* Email Pill */}
                      {proj.emailTasksCount > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ea4335]/15 text-[#f28b82] border border-[#ea4335]/30 hidden md:inline-flex items-center gap-1 shrink-0">
                          <Mail className="w-3 h-3 text-[#ea4335]" /> {proj.emailTasksCount} email
                        </span>
                      )}
                    </div>

                    {/* Right: Progress bar & Action buttons */}
                    <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-24 md:w-32 h-2 rounded-full bg-[#131314] overflow-hidden border border-[#3c4043]">
                          <div
                            className="h-full bg-gradient-to-r from-[#1a73e8] to-[#81c995] transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-300 w-9 text-right font-mono">
                          {percent}%
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenQuickTaskWithProject && onOpenQuickTaskWithProject(proj.name)}
                        title={`Add Task directly to ${proj.name}`}
                        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#8ab4f8]/15 text-[#8ab4f8] hover:bg-[#8ab4f8] hover:text-[#0f172a] border border-[#8ab4f8]/30 transition-all cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Add Task</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenProjectEdit && onOpenProjectEdit(proj.name)}
                        title={`Edit project settings for ${proj.name}`}
                        className="text-[11px] text-slate-400 hover:text-[#8ab4f8] px-2 py-1 rounded-lg hover:bg-[#282a2d] transition-colors"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>

                  {/* Expanded Body: Tasks & Correspondence */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-[#3c4043]/50 bg-[#131314]/30">
                      {renderProjectTaskContent(proj.name)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CLASSIC GRID CARDS                                              */}
      {/* ========================================================================= */}
      {viewLayout === 'cards' && displayedProjects.length > 0 && (
        <div className={selectedProject === 'ALL' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6 max-w-4xl mx-auto"}>
          {displayedProjects.map((proj) => {
            const percent = proj.total > 0 ? Math.round((proj.completed / proj.total) * 100) : 0;
            const isCollapsed = !!collapsedCardsProjects[proj.name];

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
                          toggleCardCollapse(proj.name);
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
                    />
                  </div>

                  {/* Project Stats Summary */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#81c995]" /> {proj.completed} / {proj.total} Completed
                      </span>
                      {proj.activeTasksCount > 0 && (
                        <span className="text-[#8ab4f8] font-semibold text-[11px]">
                          🔥 {proj.activeTasksCount} Active
                        </span>
                      )}
                      {proj.highPriority > 0 && (
                        <span className="flex items-center gap-1 text-[#fdd663] font-medium">
                          <Flame className="w-3.5 h-3.5" /> {proj.highPriority} High
                        </span>
                      )}
                      {proj.emailTasksCount > 0 && (
                        <span className="flex items-center gap-1 text-[#f28b82] font-semibold bg-[#ea4335]/15 border border-[#ea4335]/30 px-2 py-0.5 rounded-full text-[10px]">
                          <Mail className="w-3 h-3 text-[#ea4335]" /> {proj.emailTasksCount} from Gmail
                        </span>
                      )}
                    </div>
                  </div>

                  {!isCollapsed && renderProjectTaskContent(proj.name)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: SPLIT MASTER-DETAIL COCKPIT                                       */}
      {/* ========================================================================= */}
      {viewLayout === 'split' && displayedProjects.length > 0 && (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Left Master List */}
          <div className="w-full md:w-80 shrink-0 g-surface-1 p-3.5 rounded-3xl border border-[#3c4043] space-y-2.5 shadow-xl">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                placeholder="Filter project list..."
                className="w-full bg-[#131314] text-slate-100 text-xs pl-8 pr-3 py-2 rounded-2xl border border-[#3c4043] focus:outline-none focus:border-[#8ab4f8] placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {displayedProjects.map((p) => {
                const isSelected = p.name === selectedSplitProject;
                const percent = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;

                return (
                  <div
                    key={p.name}
                    onClick={() => setSelectedSplitProject(p.name)}
                    className={`p-3 rounded-2xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#8ab4f8]/15 border-[#8ab4f8] shadow-md ring-1 ring-[#8ab4f8]/30'
                        : 'bg-[#131314]/60 border-[#3c4043]/60 hover:border-slate-400 hover:bg-[#282a2d]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderKanban className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#8ab4f8]' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#8ab4f8]' : 'text-slate-200'}`}>
                          {p.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.activeTasksCount > 0 ? 'bg-[#8ab4f8]/20 text-[#8ab4f8]' : 'bg-[#3c4043]/40 text-slate-500'
                      }`}>
                        {p.activeTasksCount} active
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[#1e1f20] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#1a73e8] to-[#81c995]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Detail Stage */}
          <div className="flex-1 w-full g-surface-1 p-6 rounded-3xl border border-[#3c4043] shadow-xl space-y-4">
            {selectedSplitProject && (() => {
              const proj = displayedProjects.find((p) => p.name === selectedSplitProject) ||
                projects.find((p) => p.name === selectedSplitProject);
              if (!proj) return null;
              const percent = proj.total > 0 ? Math.round((proj.completed / proj.total) * 100) : 0;

              return (
                <div>
                  {/* Selected Project Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#3c4043]">
                    <div className="flex items-center gap-2.5">
                      <FolderKanban className="w-6 h-6 text-[#8ab4f8]" />
                      <div>
                        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                          {proj.name}
                          <button
                            onClick={() => onOpenProjectEdit && onOpenProjectEdit(proj.name)}
                            title="Edit project settings"
                            className="text-xs text-slate-400 hover:text-[#8ab4f8] transition-colors"
                          >
                            ✏️ Edit
                          </button>
                        </h3>
                        <p className="text-xs text-slate-400">
                          {proj.activeTasksCount} active items • {proj.completed} of {proj.total} completed ({percent}%)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenQuickTaskWithProject && onOpenQuickTaskWithProject(proj.name)}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-[#8ab4f8] text-[#0f172a] hover:bg-[#8ab4f8]/90 transition-all shadow-md cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Task
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-[#131314] overflow-hidden my-3 border border-[#3c4043]">
                    <div
                      className="h-full bg-gradient-to-r from-[#1a73e8] to-[#81c995] transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Tasks & Correspondence */}
                  {renderProjectTaskContent(proj.name)}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
