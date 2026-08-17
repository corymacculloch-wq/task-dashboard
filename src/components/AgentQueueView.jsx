import React from 'react';
import { Bot, ShieldCheck, Play, Sparkles, Tag, CheckCircle2, FileText, ArrowRight } from 'lucide-react';

export default function AgentQueueView({ tasks, onApproveAgent }) {
  const agentCandidateTasks = tasks.filter(
    (t) => (t.assignee === 'agent' || t.title.toLowerCase().includes('agent')) && t.status !== 'done'
  );

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto font-sans text-slate-100">
      {/* Header Banner */}
      <div className="bg-[#1e1f20] p-6 rounded-3xl border border-[#c58af9]/30 bg-gradient-to-r from-[#c58af9]/10 via-[#1e1f20] to-[#1e1f20] shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#c58af9]/20 border border-[#c58af9]/40 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6 text-[#c58af9]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Human-in-the-Loop Agent Work Queue</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Vault SOP Protocol 4 Governance: Autonomous agent execution requires explicit user confirmation and execution documentation.
            </p>
          </div>
        </div>
      </div>

      {/* 3-Step Workflow & How Delegation Works Card */}
      <div className="bg-[#1e1f20] border border-[#3c4043] p-5 rounded-3xl space-y-3">
        <h3 className="text-xs font-bold text-[#c58af9] uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" /> How Agent Delegation Works
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#131314] p-4 rounded-2xl border border-[#3c4043] flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#8ab4f8]/20 text-[#8ab4f8] font-bold flex items-center justify-center text-xs">1</div>
                <span className="font-bold text-slate-200">Tag Task for Agent</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Add <code className="bg-[#282a2d] px-1.5 py-0.5 rounded text-[#c58af9] font-mono text-[11px]">[assignee:: agent]</code> to an inline checklist item or set <code className="bg-[#282a2d] px-1.5 py-0.5 rounded text-[#c58af9] font-mono text-[11px]">assignee: agent</code> in YAML task frontmatter.
              </p>
            </div>
          </div>

          <div className="bg-[#131314] p-4 rounded-2xl border border-[#3c4043] flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#c58af9]/20 text-[#c58af9] font-bold flex items-center justify-center text-xs">2</div>
                <span className="font-bold text-slate-200">Review & Approve</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Candidate tasks wait here in the safety queue. Review the task scope and click <span className="text-[#c58af9] font-semibold">Approve & Delegate</span> to authorize execution.
              </p>
            </div>
          </div>

          <div className="bg-[#131314] p-4 rounded-2xl border border-[#3c4043] flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#81c995]/20 text-[#81c995] font-bold flex items-center justify-center text-xs">3</div>
                <span className="font-bold text-slate-200">Execute & Log</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Task updates to <code className="text-[#8ab4f8]">status: doing</code>, logs to <code className="text-[#c58af9]">Agent_Queue.md</code>, and generates a structured walkthrough report upon completion.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Queue */}
      <div className="bg-[#1e1f20] p-6 rounded-3xl border border-[#3c4043]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#c58af9]" />
            <h3 className="text-lg font-bold text-slate-100">Tasks Pending Approval</h3>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-[#c58af9]/20 text-[#c58af9] border border-[#c58af9]/40 font-bold">
            {agentCandidateTasks.length} candidate{agentCandidateTasks.length === 1 ? '' : 's'}
          </span>
        </div>

        {agentCandidateTasks.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-[#3c4043] rounded-2xl bg-[#131314]">
            <Bot className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-300">No Pending Agent Candidate Tasks</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              To delegate work to an AI agent, edit any task and set <code className="bg-[#282a2d] px-1.5 py-0.5 rounded text-[#c58af9] font-mono">[assignee:: agent]</code>. It will pause here for your approval.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {agentCandidateTasks.map((task) => (
              <div
                key={task.id}
                className="bg-[#131314] p-5 rounded-2xl flex flex-wrap items-center justify-between gap-6 border border-[#3c4043] hover:border-[#c58af9]/40 transition-all"
              >
                <div className="space-y-2 flex-1 min-w-[280px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#c58af9]/20 text-[#c58af9] border border-[#c58af9]/30">
                      {task.project}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Priority: <strong className="text-slate-200">{task.priority}</strong></span>
                    {task.due && <span className="text-xs text-slate-400">• Due: {task.due}</span>}
                  </div>
                  <h4 className="text-base font-semibold text-slate-100">{task.title}</h4>
                  {task.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
                  )}
                </div>

                <button
                  onClick={() => onApproveAgent(task.id)}
                  className="px-5 py-2.5 rounded-full bg-[#c58af9] hover:bg-[#d7aefb] text-[#0f172a] text-xs font-bold shadow-md flex items-center gap-2 shrink-0 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-[#0f172a]" /> Approve & Delegate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Governance Footer */}
      <div className="bg-[#131314] p-5 rounded-2xl border border-[#3c4043] text-xs text-slate-400 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#8ab4f8] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">Vault SOP Governance: </span>
          Upon clicking <span className="text-[#c58af9] font-medium">Approve & Delegate</span>, the task status updates to <code className="text-[#8ab4f8]">doing</code> and registers an entry in <code className="text-[#c58af9]">1.active_projects/Agent_Queue.md</code>. When execution completes, a walkthrough report will be generated.
        </div>
      </div>
    </div>
  );
}
