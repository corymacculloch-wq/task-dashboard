import React, { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, ChevronRight, Sparkles } from 'lucide-react';
import { TriageCard } from './TriageCard';
import { useTriageHotkeys } from './useTriageHotkeys';
import TaskEditModal from './TaskEditModal';

export default function TriageFeed({
  tasks,
  onUpdateStatus,
  onPromoteTask,
  onOpenMasterTable,
  onUndo,
  onUpdateTask,
  onOpenEdit
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triageSegment, setTriageSegment] = useState('inbox'); // 'inbox' | 'active' | 'done'
  const [filterProject, setFilterProject] = useState('ALL');
  const [filterPriority, setPriorityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTask, setEditingTask] = useState(null);

  const parentRef = useRef(null);
  const searchInputRef = useRef(null);

  const projects = Array.from(new Set(tasks.map((t) => t.project)));

  // Triage Feed Scoping
  const scopedTasks = tasks.filter((t) => {
    if (triageSegment === 'inbox') return t.status === 'todo' || !t.status;
    if (triageSegment === 'active') return t.status === 'doing' || t.status === 'blocked';
    if (triageSegment === 'done') return t.status === 'done';
    return true;
  });

  const filteredTasks = scopedTasks.filter((t) => {
    const matchesSearch =
      (t.title || t.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.project || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((t.assignee || t.owner || '').toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesProject = filterProject === 'ALL' || t.project === filterProject;
    const matchesPriority = filterPriority === 'ALL' || t.priority === filterPriority;

    return matchesSearch && matchesProject && matchesPriority;
  });

  const rowVirtualizer = useVirtualizer({
    count: filteredTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 145,
    overscan: 5
  });

  const handleNext = () => {
    setSelectedIndex((prev) => {
      const next = Math.min(prev + 1, Math.max(0, filteredTasks.length - 1));
      if (rowVirtualizer && filteredTasks.length > 0) {
        rowVirtualizer.scrollToIndex(next, { align: 'auto' });
      }
      return next;
    });
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      if (rowVirtualizer && filteredTasks.length > 0) {
        rowVirtualizer.scrollToIndex(next, { align: 'auto' });
      }
      return next;
    });
  };

  const currentTask = filteredTasks[selectedIndex];

  useTriageHotkeys({
    onNext: handleNext,
    onPrev: handlePrev,
    onDoing: () => currentTask && onUpdateStatus(currentTask.id, 'doing'),
    onPromote: () => currentTask && onPromoteTask(currentTask.id),
    onDone: () => currentTask && onUpdateStatus(currentTask.id, 'done'),
    onSelectCurrent: () => onOpenMasterTable && onOpenMasterTable(currentTask?.id),
    onFocusSearch: () => searchInputRef.current && searchInputRef.current.focus(),
    onUndo
  });

  return (
    <div className="flex flex-col h-[calc(100vh-170px)] bg-[#131314] text-[#e3e3e3] font-sans antialiased rounded-3xl overflow-hidden border border-[#3c4043]">
      {/* Grouped Search & Filter Toolbar (Unified Height h-9) */}
      <div className="p-4 bg-[#1e1f20] border-b border-[#3c4043] flex flex-wrap items-center justify-between gap-3">
        {/* Feed Segmented Controls */}
        <div className="flex items-center gap-1.5 bg-[#131314] p-1 rounded-full border border-[#3c4043]">
          <button
            onClick={() => { setTriageSegment('inbox'); setSelectedIndex(0); }}
            title="Triage / Inbox: Displays all un-triaged and pending tasks awaiting action."
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              triageSegment === 'inbox'
                ? 'bg-[#8ab4f8] text-[#0f172a] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Triage / Inbox ({tasks.filter((t) => t.status === 'todo' || !t.status).length})
          </button>

          <button
            onClick={() => { setTriageSegment('active'); setSelectedIndex(0); }}
            title="Active / In-Flight: Displays tasks currently in-progress ('doing') or blocked."
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              triageSegment === 'active'
                ? 'bg-[#8ab4f8] text-[#0f172a] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active / In-Flight ({tasks.filter((t) => t.status === 'doing' || t.status === 'blocked').length})
          </button>

          <button
            onClick={() => { setTriageSegment('done'); setSelectedIndex(0); }}
            title="Completed: Displays tasks marked as 'done' (completed)."
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              triageSegment === 'done'
                ? 'bg-[#81c995] text-[#0f172a] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Completed ({tasks.filter((t) => t.status === 'done').length})
          </button>
        </div>

        {/* Single Horizontal Unified Height Toolbar (h-9) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative h-9 flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search feed... (/)"
              title="Search feed: Type text or press '/' on your keyboard to filter tasks"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#1e1f20] border border-[#3c4043] text-slate-200 text-xs rounded-full pl-9 pr-3 h-9 focus:outline-none focus:border-[#8ab4f8] w-48"
            />
          </div>

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            title="Filter by Project: Filter tasks assigned to a specific project"
            className="bg-[#1e1f20] border border-[#3c4043] text-slate-200 text-xs rounded-full px-3.5 h-9 focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
          >
            <option value="ALL">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setPriorityFilter(e.target.value)}
            title="Filter by Priority: Filter tasks by urgency level (High, Medium, Low)"
            className="bg-[#1e1f20] border border-[#3c4043] text-slate-200 text-xs rounded-full px-3.5 h-9 focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <button
            onClick={() => onOpenMasterTable && onOpenMasterTable()}
            title="Master Table: Open full 600+ task database table view for bulk editing and frontmatter inspection"
            className="text-xs text-[#8ab4f8] hover:underline font-semibold flex items-center gap-1 border-l border-[#3c4043] pl-3 h-9 cursor-pointer"
          >
            Master Table <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Virtualized Triage Cards Feed */}
      <div ref={parentRef} className="flex-1 overflow-y-auto px-4 py-4">
        {filteredTasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-[#3c4043] rounded-3xl text-center p-6">
            <Sparkles className="w-8 h-8 text-[#8ab4f8] mb-2 animate-bounce" />
            <h4 className="text-sm font-semibold text-slate-200">No items in current triage scope</h4>
            <p className="text-xs text-slate-400 mt-1">
              Switch triage segments or click Master Table for full backlog.
            </p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const task = filteredTasks[virtualRow.index];
              const isSelected = virtualRow.index === selectedIndex;

              return (
                <div
                  key={task.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                  className="pb-3"
                >
                  <TriageCard
                    task={task}
                    isSelected={isSelected}
                    onPromote={onPromoteTask}
                    onDoing={(id) => onUpdateStatus(id, 'doing')}
                    onDone={(id) => onUpdateStatus(id, 'done')}
                    onSelect={() => setSelectedIndex(virtualRow.index)}
                    onOpenEdit={(taskItem) => {
                      if (onOpenEdit) onOpenEdit(taskItem);
                      setEditingTask(taskItem);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TaskEditModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        onSaveTask={onUpdateTask}
      />
    </div>
  );
}
