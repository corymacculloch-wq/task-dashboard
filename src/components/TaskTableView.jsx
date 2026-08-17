import React, { useState, useEffect } from 'react';
import { Search, Flame, CheckCircle2, Circle, Bot, ExternalLink, Columns, Edit2, Check, Calendar, FileText, Hash, Folder, RotateCcw, ArrowUp, ArrowDown, ArrowUpDown, Layers, ChevronDown, ChevronRight } from 'lucide-react';

const AVAILABLE_COLUMNS = [
  { id: 'id', label: 'Task ID', defaultVisible: true, defaultWidth: 140 },
  { id: 'title', label: 'Task Title', defaultVisible: true, mandatory: true, defaultWidth: 280 },
  { id: 'project', label: 'Project', defaultVisible: true, defaultWidth: 140 },
  { id: 'priority', label: 'Priority', defaultVisible: true, defaultWidth: 110 },
  { id: 'due', label: 'Due Date', defaultVisible: true, defaultWidth: 110 },
  { id: 'completed', label: 'Completed Date', defaultVisible: true, defaultWidth: 130 },
  { id: 'assignee', label: 'Assignee', defaultVisible: true, defaultWidth: 120 },
  { id: 'description', label: 'Description', defaultVisible: false, defaultWidth: 240 },
  { id: 'format', label: 'Format', defaultVisible: true, defaultWidth: 110 },
  { id: 'filePath', label: 'File Path', defaultVisible: false, defaultWidth: 180 },
  { id: 'sync', label: 'Sync Status', defaultVisible: true, defaultWidth: 120 }
];

const DEFAULT_WIDTHS = AVAILABLE_COLUMNS.reduce((acc, col) => {
  acc[col.id] = col.defaultWidth;
  return acc;
}, {});

export default function TaskTableView({ tasks, onUpdateStatus, onOpenEdit }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todo');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [groupBy, setGroupBy] = useState('none');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('table_columns_config');
      return saved ? JSON.parse(saved) : AVAILABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
    } catch (e) {
      return AVAILABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
    }
  });

  const [columnWidths, setColumnWidths] = useState(() => {
    try {
      const saved = localStorage.getItem('table_column_widths');
      return saved ? { ...DEFAULT_WIDTHS, ...JSON.parse(saved) } : DEFAULT_WIDTHS;
    } catch (e) {
      return DEFAULT_WIDTHS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('table_columns_config', JSON.stringify(visibleColumns));
    } catch (e) {
      console.error('Error saving column config:', e);
    }
  }, [visibleColumns]);

  useEffect(() => {
    try {
      localStorage.setItem('table_column_widths', JSON.stringify(columnWidths));
    } catch (e) {
      console.error('Error saving column widths:', e);
    }
  }, [columnWidths]);

  const toggleColumn = (colId) => {
    if (colId === 'title') return;
    setVisibleColumns((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const isColVisible = (colId) => visibleColumns.includes(colId);

  const handleResizeStart = (colId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[colId] || DEFAULT_WIDTHS[colId] || 140;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(60, startWidth + deltaX);
      setColumnWidths((prev) => ({ ...prev, [colId]: newWidth }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const resetColumnWidths = () => {
    setColumnWidths(DEFAULT_WIDTHS);
  };

  const handleSort = (colId) => {
    if (sortConfig.key === colId) {
      if (sortConfig.direction === 'asc') {
        setSortConfig({ key: colId, direction: 'desc' });
      } else {
        setSortConfig({ key: null, direction: null });
      }
    } else {
      setSortConfig({ key: colId, direction: 'asc' });
    }
  };

  const toggleGroupCollapse = (groupKey) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const projects = Array.from(new Set(tasks.map((t) => t.project))).sort();

  // 1. Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.assignee && t.assignee.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'todo'
        ? t.status !== 'done' && t.status !== 'archived'
        : t.status === statusFilter;

    const matchPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchProject = projectFilter === 'ALL' || t.project === projectFilter;

    return matchSearch && matchStatus && matchPriority && matchProject;
  });

  // 2. Sort Tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const key = sortConfig.key;
    const direction = sortConfig.direction;

    let valA = a[key] ?? '';
    let valB = b[key] ?? '';

    if (key === 'priority') {
      const weight = { high: 3, medium: 2, low: 1 };
      valA = weight[a.priority] || 0;
      valB = weight[b.priority] || 0;
    } else if (key === 'format') {
      valA = a.isAtomic ? 'Atomic File' : 'Inline Note';
      valB = b.isAtomic ? 'Atomic File' : 'Inline Note';
    } else if (key === 'filePath') {
      valA = a.filePath || '';
      valB = b.filePath || '';
    } else if (typeof valA === 'string' && typeof valB === 'string') {
      const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return direction === 'asc' ? cmp : -cmp;
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // 3. Group Tasks
  const getGroupKey = (t) => {
    if (groupBy === 'project') return t.project || 'General';
    if (groupBy === 'priority') return (t.priority || 'medium').toUpperCase();
    if (groupBy === 'status') return (t.status || 'todo').toUpperCase();
    if (groupBy === 'format') return t.isAtomic ? 'Atomic Files' : 'Inline Notes';
    if (groupBy === 'assignee') return t.assignee || 'Unassigned';
    return 'All Tasks';
  };

  const groupedTasksMap = {};
  if (groupBy !== 'none') {
    sortedTasks.forEach((t) => {
      const gk = getGroupKey(t);
      if (!groupedTasksMap[gk]) groupedTasksMap[gk] = [];
      groupedTasksMap[gk].push(t);
    });
  }

  const renderTh = (colId, label) => {
    if (!isColVisible(colId)) return null;
    const width = columnWidths[colId] || DEFAULT_WIDTHS[colId] || 140;
    const isSorted = sortConfig.key === colId;

    return (
      <th
        key={colId}
        style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
        onClick={() => handleSort(colId)}
        className="p-3.5 relative group/th select-none font-bold text-slate-300 border-r border-[#3c4043]/40 last:border-r-0 hover:bg-[#282a2d] transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between gap-1 overflow-hidden pr-2">
          <span className="truncate" title={`Click to sort by ${label}`}>{label}</span>
          <span className="text-slate-400 flex-shrink-0">
            {isSorted ? (
              sortConfig.direction === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#8ab4f8]" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-[#8ab4f8]" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-0 group-hover/th:opacity-100 transition-opacity" />
            )}
          </span>
        </div>

        {/* Drag to Resize Handle */}
        <div
          onMouseDown={(e) => handleResizeStart(colId, e)}
          onClick={(e) => e.stopPropagation()}
          title="Drag left/right to resize column width"
          className="absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize hover:bg-[#8ab4f8] transition-colors z-20 flex items-center justify-center group-hover/th:bg-[#3c4043]/80"
        >
          <div className="w-0.5 h-4 bg-slate-500 rounded-full" />
        </div>
      </th>
    );
  };

  const renderTd = (colId, content, customClass = '') => {
    if (!isColVisible(colId)) return null;
    const width = columnWidths[colId] || DEFAULT_WIDTHS[colId] || 140;

    return (
      <td
        key={colId}
        style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
        className={`p-4 truncate border-r border-[#282a2d]/40 last:border-r-0 ${customClass}`}
      >
        {content}
      </td>
    );
  };

  const renderRow = (t) => {
    const shortId = t.id.replace(/^(atomic:|inline:)/, '');

    return (
      <tr
        key={t.id}
        onClick={() => onOpenEdit && onOpenEdit(t)}
        title="Click row to open Edit View"
        className="hover:bg-[#282a2d]/70 transition-colors cursor-pointer group"
      >
        <td className="p-4 text-center border-r border-[#282a2d]/40" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onUpdateStatus(t.id, t.status === 'done' ? 'todo' : 'done')}
            className="w-5 h-5 rounded-full border border-[#5f6368] hover:border-[#81c995] flex items-center justify-center transition-all mx-auto"
          >
            {t.status === 'done' ? (
              <CheckCircle2 className="w-4 h-4 text-[#81c995]" />
            ) : (
              <Circle className="w-4 h-4 text-transparent hover:text-[#8ab4f8]" />
            )}
          </button>
        </td>

        {/* Task ID Column */}
        {renderTd(
          'id',
          <span className="font-mono text-[11px] text-[#8ab4f8]" title={t.id}>
            #{shortId}
          </span>
        )}

        {/* Task Title Column */}
        {renderTd(
          'title',
          <div className={`line-clamp-2 font-medium group-hover:text-[#8ab4f8] transition-colors ${t.status === 'done' ? 'line-through text-slate-500' : 'text-slate-100'}`} title={t.title}>
            {t.title}
          </div>
        )}

        {/* Project Column */}
        {renderTd(
          'project',
          <span className="px-2.5 py-0.5 rounded-full bg-[#282a2d] text-slate-300 font-medium border border-[#3c4043]" title={t.project}>
            {t.project}
          </span>
        )}

        {/* Priority Column */}
        {renderTd(
          'priority',
          t.priority === 'high' ? (
            <span className="px-2 py-0.5 rounded-full g-yellow-pill font-bold flex items-center gap-1 w-fit">
              <Flame className="w-3 h-3" /> High
            </span>
          ) : (
            <span className="text-slate-400 capitalize">{t.priority}</span>
          )
        )}

        {/* Due Date Column */}
        {renderTd('due', <span className="text-slate-400 font-mono">{t.due || '—'}</span>)}

        {/* Completed Date Column */}
        {renderTd(
          'completed',
          t.completed ? (
            <span className="text-[#81c995] font-semibold font-mono">✓ {t.completed}</span>
          ) : (
            <span className="text-slate-500">—</span>
          )
        )}

        {/* Assignee Column */}
        {renderTd(
          'assignee',
          t.assignee === 'agent' ? (
            <span className="text-[#c58af9] font-medium flex items-center gap-1">
              <Bot className="w-3 h-3" /> agent
            </span>
          ) : (
            <span className="text-slate-400">{t.assignee || 'Unassigned'}</span>
          )
        )}

        {/* Description / Notes Column */}
        {renderTd(
          'description',
          <span className="text-slate-400" title={t.description}>
            {t.description || '—'}
          </span>
        )}

        {/* Format Column */}
        {renderTd(
          'format',
          t.isAtomic ? (
            <span className="text-[#8ab4f8] bg-[#8ab4f8]/10 px-2 py-0.5 rounded-full text-[10px] border border-[#8ab4f8]/20">
              Atomic File
            </span>
          ) : (
            <span className="text-slate-400 bg-[#282a2d] px-2 py-0.5 rounded-full text-[10px]">
              Inline Note
            </span>
          )
        )}

        {/* File Path Column */}
        {renderTd(
          'filePath',
          <span className="text-slate-400 font-mono text-[10px]" title={t.filePath}>
            {t.filePath ? t.filePath.replace(/^.*1\.active_projects[\\/]/, '') : '—'}
          </span>
        )}

        {/* Sync Status Column */}
        {renderTd(
          'sync',
          t.gtaskId ? (
            <a
              href="https://calendar.google.com/calendar/r/tasks"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#8ab4f8] hover:underline flex items-center gap-1 text-[11px]"
            >
              <ExternalLink className="w-3 h-3" /> Google Tasks
            </a>
          ) : (
            <span className="text-slate-500">—</span>
          )
        )}

        {/* Edit Button Column */}
        <td className="p-4 text-right w-16" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onOpenEdit && onOpenEdit(t)}
            className="p-1.5 rounded-full hover:bg-[#3c4043] text-slate-400 hover:text-slate-200 transition-colors"
            title="Edit Task Properties"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn relative">
      {/* Search & Toolbar Header */}
      <div className="g-surface-1 p-4 rounded-3xl flex flex-wrap items-center justify-between gap-4 border border-[#3c4043]">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search title, ID, project, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#131314] border border-[#3c4043] text-slate-200 text-xs rounded-full pl-11 pr-4 py-2.5 focus:outline-none focus:border-[#8ab4f8]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project Selector (Positioned Left with Accent Color Pill) */}
          <div className="flex items-center gap-1.5 bg-[#8ab4f8]/15 border border-[#8ab4f8]/40 hover:bg-[#8ab4f8]/25 rounded-full px-3.5 py-1.5 transition-all">
            <Folder className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-transparent text-[#8ab4f8] text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#1e1f20] text-slate-200">All Projects</option>
              {projects.map((p) => (
                <option key={p} value={p} className="bg-[#1e1f20] text-slate-200">{p}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#282a2d] border border-[#3c4043] text-slate-200 text-xs rounded-full px-4 py-2 focus:outline-none focus:border-[#8ab4f8] cursor-pointer font-medium"
          >
            <option value="todo">To Do (Active Tasks)</option>
            <option value="ALL">All Statuses (Inc. Completed)</option>
            <option value="doing">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Completed Only</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#282a2d] border border-[#3c4043] text-slate-200 text-xs rounded-full px-4 py-2 focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="high">High Priority 🔥</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Group By Selector (Positioned Right) */}
          <div className="flex items-center gap-1.5 bg-[#282a2d] border border-[#3c4043] hover:border-[#5f6368] rounded-full px-3.5 py-1.5 transition-all">
            <Layers className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span className="text-[11px] font-semibold text-slate-400">Group By:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="none" className="bg-[#1e1f20] text-slate-200">None (Flat Table)</option>
              <option value="project" className="bg-[#1e1f20] text-slate-200">Project Workspace</option>
              <option value="priority" className="bg-[#1e1f20] text-slate-200">Priority Level</option>
              <option value="status" className="bg-[#1e1f20] text-slate-200">Status</option>
              <option value="format" className="bg-[#1e1f20] text-slate-200">Format (Atomic vs Inline)</option>
              <option value="assignee" className="bg-[#1e1f20] text-slate-200">Assignee</option>
            </select>
          </div>

          {/* Columns Picker Toggle Button */}
          <div className="relative">
            <button
              onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
              title="Customize Table Columns & Widths"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#8ab4f8]/15 text-[#8ab4f8] hover:bg-[#8ab4f8]/25 border border-[#8ab4f8]/30 transition-all cursor-pointer"
            >
              <Columns className="w-4 h-4" />
              <span>Columns ({visibleColumns.length})</span>
            </button>

            {/* Column Picker Popover */}
            {isColumnPickerOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#1e1f20] border-2 border-[#8ab4f8] rounded-2xl p-4 shadow-2xl z-50 space-y-3 text-slate-100 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-[#3c4043]">
                  <span className="text-xs font-bold text-[#8ab4f8] uppercase tracking-wider flex items-center gap-1.5">
                    <Columns className="w-3.5 h-3.5" /> Table Columns & Layout
                  </span>
                  <button
                    onClick={() => setIsColumnPickerOpen(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-200"
                  >
                    Done
                  </button>
                </div>

                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {AVAILABLE_COLUMNS.map((col) => {
                    const checked = isColVisible(col.id);
                    return (
                      <label
                        key={col.id}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs cursor-pointer select-none transition-colors ${
                          checked ? 'bg-[#131314] text-slate-100' : 'text-slate-400 hover:bg-[#282a2d]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={col.mandatory}
                            onChange={() => toggleColumn(col.id)}
                            className="rounded border-[#3c4043] bg-[#1e1f20] text-[#8ab4f8] accent-[#8ab4f8]"
                          />
                          {col.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {columnWidths[col.id] || col.defaultWidth}px
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#3c4043] flex items-center justify-between">
                  <button
                    onClick={resetColumnWidths}
                    title="Reset all column widths to default"
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Widths
                  </button>
                  <span className="text-[10px] text-slate-500">Drag column edges to resize</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Database Table */}
      <div className="g-surface-1 rounded-3xl overflow-hidden border border-[#3c4043] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse table-fixed">
            <thead className="bg-[#1e1f20] text-slate-400 font-semibold border-b border-[#3c4043]">
              <tr>
                <th className="p-4 w-12 text-center border-r border-[#3c4043]/40">Status</th>
                {renderTh('id', 'Task ID')}
                {renderTh('title', 'Task Title')}
                {renderTh('project', 'Project')}
                {renderTh('priority', 'Priority')}
                {renderTh('due', 'Due Date')}
                {renderTh('completed', 'Completed Date')}
                {renderTh('assignee', 'Assignee')}
                {renderTh('description', 'Description')}
                {renderTh('format', 'Format')}
                {renderTh('filePath', 'File Path')}
                {renderTh('sync', 'Sync Status')}
                <th className="p-4 w-16 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#282a2d]">
              {sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="p-8 text-center text-slate-500">
                    No matching tasks found.
                  </td>
                </tr>
              ) : groupBy === 'none' ? (
                sortedTasks.map(renderRow)
              ) : (
                Object.entries(groupedTasksMap).map(([groupTitle, groupTasks]) => {
                  const isCollapsed = !!collapsedGroups[groupTitle];

                  return (
                    <React.Fragment key={groupTitle}>
                      {/* Section Header Row */}
                      <tr
                        onClick={() => toggleGroupCollapse(groupTitle)}
                        className="bg-[#18191a] hover:bg-[#202124] transition-colors cursor-pointer font-bold select-none border-t-2 border-[#3c4043]/60"
                      >
                        <td colSpan={visibleColumns.length + 2} className="p-3 text-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-[#8ab4f8]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[#8ab4f8]" />
                              )}
                              <span className="text-xs uppercase tracking-wider text-[#8ab4f8]">
                                {groupTitle}
                              </span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#282a2d] text-slate-300 font-mono border border-[#3c4043]">
                              {groupTasks.length} tasks
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Group Rows */}
                      {!isCollapsed && groupTasks.map(renderRow)}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
