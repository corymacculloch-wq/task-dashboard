import React, { useState } from 'react';
import {
  Circle,
  Clock,
  Ban,
  CheckCircle2,
  Filter,
  Flame,
  Bot,
  User
} from 'lucide-react';

export default function KanbanView({
  tasks,
  onUpdateStatus,
  onPromoteTask
}) {
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState('ALL');

  const projects = Array.from(new Set(tasks.map((t) => t.project)));
  const assignees = Array.from(
    new Set(tasks.map((t) => t.assignee).filter(Boolean))
  );

  const filteredTasks = tasks.filter((task) => {
    if (selectedProject !== 'ALL' && task.project !== selectedProject) return false;
    if (selectedAssignee !== 'ALL' && task.assignee !== selectedAssignee) return false;
    return true;
  });

  const columns = [
    { id: 'todo', label: 'To Do', icon: Circle, color: 'text-slate-400', border: 'border-[#3c4043]' },
    { id: 'doing', label: 'In Progress', icon: Clock, color: 'text-[#8ab4f8]', border: 'border-[#8ab4f8]/30' },
    { id: 'blocked', label: 'Blocked', icon: Ban, color: 'text-[#f28b82]', border: 'border-[#f28b82]/30' },
    { id: 'done', label: 'Completed', icon: CheckCircle2, color: 'text-[#81c995]', border: 'border-[#81c995]/30' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filters Bar */}
      <div className="g-surface-1 p-4 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Filters:</span>

          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-[#282a2d] border border-[#3c4043] text-slate-200 text-xs rounded-full px-4 py-1.5 focus:outline-none focus:border-[#8ab4f8]"
          >
            <option value="ALL">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="bg-[#282a2d] border border-[#3c4043] text-slate-200 text-xs rounded-full px-4 py-1.5 focus:outline-none focus:border-[#8ab4f8]"
          >
            <option value="ALL">All Owners ({assignees.length})</option>
            {assignees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-100">{filteredTasks.length}</span> items
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((col) => {
          const Icon = col.icon;
          const colTasks = filteredTasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className={`g-surface-1 p-4 rounded-3xl flex flex-col h-[calc(100vh-250px)] border ${col.border}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#3c4043]">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${col.color}`} />
                  <h3 className="text-sm font-bold text-slate-100">{col.label}</h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#282a2d] text-slate-300 border border-[#3c4043]">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colTasks.length === 0 ? (
                  <div className="h-32 flex items-center justify-center border border-dashed border-[#3c4043] rounded-2xl">
                    <span className="text-xs text-slate-500">No items</span>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="g-surface-2 p-4 rounded-2xl space-y-3 hover:border-[#8ab4f8]/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#131314] text-slate-300 border border-[#3c4043]">
                          {task.project}
                        </span>
                        {task.priority === 'high' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full g-yellow-pill flex items-center gap-1">
                            <Flame className="w-3 h-3" /> HIGH
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-slate-100 line-clamp-3 leading-snug">
                        {task.title}
                      </h4>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#3c4043]">
                        <div className="flex items-center gap-2">
                          {task.assignee === 'agent' ? (
                            <span className="flex items-center gap-1 text-[#c58af9] font-medium">
                              <Bot className="w-3 h-3" /> agent
                            </span>
                          ) : task.assignee ? (
                            <span className="flex items-center gap-1 text-slate-300">
                              <User className="w-3 h-3 text-slate-400" /> {task.assignee}
                            </span>
                          ) : (
                            <span>Unassigned</span>
                          )}
                        </div>

                        {task.due && <span className="text-slate-400">{task.due}</span>}
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-1">
                        {!task.isAtomic && (
                          <button
                            onClick={() => onPromoteTask(task.id)}
                            className="text-[10px] text-[#8ab4f8] hover:underline"
                          >
                            Promote
                          </button>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          {col.id !== 'todo' && (
                            <button
                              onClick={() => onUpdateStatus(task.id, 'todo')}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-[#3c4043] text-slate-200 hover:bg-[#5f6368]"
                            >
                              Todo
                            </button>
                          )}
                          {col.id !== 'doing' && (
                            <button
                              onClick={() => onUpdateStatus(task.id, 'doing')}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-[#8ab4f8]/20 text-[#8ab4f8] hover:bg-[#8ab4f8]/30 font-medium"
                            >
                              Doing
                            </button>
                          )}
                          {col.id !== 'done' && (
                            <button
                              onClick={() => onUpdateStatus(task.id, 'done')}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-[#81c995]/20 text-[#81c995] hover:bg-[#81c995]/30 font-medium"
                            >
                              Done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
