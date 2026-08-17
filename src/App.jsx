import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DailyCockpitView from './components/DailyCockpitView';
import KanbanView from './components/KanbanView';
import AgentQueueView from './components/AgentQueueView';
import ProjectBreakdownView from './components/ProjectBreakdownView';
import TaskTableView from './components/TaskTableView';
import QuickTaskModal from './components/QuickTaskModal';
import TaskPromotionModal from './components/TaskPromotionModal';
import TaskEditModal from './components/TaskEditModal';
import ProjectEditModal from './components/ProjectEditModal';
import AuthModal from './components/AuthModal';
import { RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchAllTasksFromGitHub, commitFileToGitHub } from './services/githubClient';
import { serializeTaskToMarkdown } from './utils/vaultParserBrowser';

export default function App() {
  const [activeTab, setActiveTab] = useState('cockpit');
  const [tasks, setTasks] = useState([]);
  const [includeArchive, setIncludeArchive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Authentication State
  const [authInfo, setAuthInfo] = useState(() => {
    const token = localStorage.getItem('vault_github_pat');
    const owner = localStorage.getItem('vault_github_owner') || 'corymacculloch-wq';
    const repo = localStorage.getItem('vault_github_repo') || 'Vault';
    return token ? { token, owner, repo } : null;
  });

  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [quickTaskProject, setQuickTaskProject] = useState('General');
  const [promoteTaskItem, setPromoteTaskItem] = useState(null);
  const [editingTaskItem, setEditingTaskItem] = useState(null);
  const [editingProjectName, setEditingProjectName] = useState(null);

  const [notification, setNotification] = useState(null);
  const [undoToast, setUndoToast] = useState(null);
  const [undoStack, setUndoStack] = useState(() => {
    try {
      const saved = sessionStorage.getItem('undoStack');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenQuickTaskWithProject = (projName) => {
    setQuickTaskProject(projName || 'General');
    setIsQuickTaskOpen(true);
  };

  // Fetch tasks from GitHub REST API
  const fetchTasksFromGitHub = async () => {
    if (!authInfo?.token) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const fetchedTasks = await fetchAllTasksFromGitHub(authInfo.token, authInfo.owner, authInfo.repo);
      setTasks(fetchedTasks);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching tasks from GitHub:', err);
      setFetchError(err.message || 'Failed to fetch vault tasks from GitHub.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authInfo?.token) {
      fetchTasksFromGitHub();
    }
  }, [authInfo]);

  useEffect(() => {
    try {
      sessionStorage.setItem('undoStack', JSON.stringify(undoStack.slice(-20)));
    } catch (e) {
      console.error('Error saving undo stack:', e);
    }
  }, [undoStack]);

  const handleSignOut = () => {
    localStorage.removeItem('vault_github_pat');
    setAuthInfo(null);
    setTasks([]);
  };

  // 1. Optimistic Status Change (Kanban / Checkboxes)
  const handleUpdateStatus = async (id, newStatus) => {
    const existingTask = tasks.find((t) => t.id === id);
    if (!existingTask) return;

    const prevStatus = existingTask.status || 'todo';
    if (prevStatus === newStatus) return;

    // Optimistic UI Update (0ms)
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    showNotification(`Updated status to "${newStatus}" (committing to GitHub...)`);

    try {
      const updatedFrontmatter = {
        ...existingTask.frontmatter,
        status: newStatus,
        updated: new Date().toISOString().slice(0, 10)
      };

      const markdownContent = serializeTaskToMarkdown(updatedFrontmatter, existingTask.content || '');
      const commitMsg = `Update task status "${existingTask.title}" to ${newStatus}`;

      const res = await commitFileToGitHub(
        authInfo.token,
        authInfo.owner,
        authInfo.repo,
        existingTask.filePath,
        existingTask.sha,
        markdownContent,
        commitMsg
      );

      // Update task sha in state
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, sha: res.sha } : t))
      );

      showNotification(`Committed: "${existingTask.title}" marked as ${newStatus}`);
    } catch (err) {
      console.error('GitHub Commit Error:', err);
      // Revert optimistic update on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: prevStatus } : t))
      );
      showNotification(`Error committing update to GitHub: ${err.message}`);
    }
  };

  // 2. Optimistic Task Details Edit
  const handleUpdateTask = async (id, updates) => {
    const existingTask = tasks.find((t) => t.id === id);
    if (!existingTask) return;

    // Optimistic UI Update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    showNotification(`Updating properties for "${updates.title || existingTask.title}"...`);

    try {
      const updatedFrontmatter = {
        ...existingTask.frontmatter,
        title: updates.title || existingTask.title,
        priority: updates.priority || existingTask.priority,
        assignee: updates.assignee || existingTask.assignee,
        due: updates.due || existingTask.due,
        project: updates.project || existingTask.project,
        updated: new Date().toISOString().slice(0, 10)
      };

      const markdownContent = serializeTaskToMarkdown(updatedFrontmatter, updates.content || existingTask.content || '');
      const commitMsg = `Update task properties "${updates.title || existingTask.title}"`;

      const res = await commitFileToGitHub(
        authInfo.token,
        authInfo.owner,
        authInfo.repo,
        existingTask.filePath,
        existingTask.sha,
        markdownContent,
        commitMsg
      );

      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, sha: res.sha } : t))
      );

      showNotification(`Committed properties for "${updates.title || existingTask.title}"`);
    } catch (err) {
      console.error('GitHub Commit Error:', err);
      showNotification(`Error committing task edit: ${err.message}`);
    }
  };

  // 3. Create New Task
  const handleCreateTask = async (newTaskData) => {
    const taskSlug = (newTaskData.title || 'new-task')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const filename = `task-${taskSlug}-${Date.now().toString().slice(-4)}.md`;
    const projectName = newTaskData.project || 'General';
    const filePath = `1.active_projects/${projectName}/${filename}`;

    const frontmatter = {
      type: 'Task',
      id: filename.replace('.md', ''),
      title: newTaskData.title,
      status: newTaskData.status || 'todo',
      priority: newTaskData.priority || 'medium',
      assignee: newTaskData.assignee || 'human',
      due: newTaskData.due || '',
      project: projectName,
      created: new Date().toISOString().slice(0, 10)
    };

    const markdownContent = serializeTaskToMarkdown(frontmatter, newTaskData.description || '* Task created via Vault Task Cockpit.');

    showNotification(`Creating new task "${newTaskData.title}" on GitHub...`);

    try {
      const res = await commitFileToGitHub(
        authInfo.token,
        authInfo.owner,
        authInfo.repo,
        filePath,
        null,
        markdownContent,
        `Create task "${newTaskData.title}" in project ${projectName}`
      );

      const createdTask = {
        id: frontmatter.id,
        filePath,
        sha: res.sha,
        ...frontmatter,
        content: newTaskData.description || ''
      };

      setTasks((prev) => [createdTask, ...prev]);
      showNotification(`Committed new task: "${newTaskData.title}"`);
    } catch (err) {
      console.error('GitHub Create Task Error:', err);
      showNotification(`Error creating task on GitHub: ${err.message}`);
    }
  };

  // Render Auth Modal if not authenticated
  if (!authInfo) {
    return <AuthModal onAuthenticate={setAuthInfo} />;
  }

  // Compute unique active project names from tasks for dropdown selectors
  const existingProjects = Array.from(
    new Set(tasks.map((t) => t.project || 'General'))
  );
  if (!existingProjects.includes('General')) existingProjects.unshift('General');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickTask={() => handleOpenQuickTaskWithProject('General')}
        includeArchive={includeArchive}
        setIncludeArchive={setIncludeArchive}
        isWsConnected={!isLoading}
        taskCount={tasks.length}
        onUndo={() => {}}
        undoCount={undoStack.length}
        lastUndoDescription={undoToast?.description || ''}
        onSignOut={handleSignOut}
        authInfo={authInfo}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Loading Bar */}
        {isLoading && (
          <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between text-indigo-300 text-sm animate-pulse">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Fetching vault tasks from GitHub ({authInfo.owner}/{authInfo.repo})...</span>
            </div>
          </div>
        )}

        {/* Fetch Error Banner */}
        {fetchError && (
          <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-rose-200 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button
              onClick={fetchTasksFromGitHub}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {activeTab === 'cockpit' && (
          <DailyCockpitView
            tasks={tasks}
            onUpdateStatus={handleUpdateStatus}
            onEditTask={setEditingTaskItem}
            onPromoteTask={setPromoteTaskItem}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectBreakdownView
            tasks={tasks}
            onUpdateStatus={handleUpdateStatus}
            onEditTask={setEditingTaskItem}
            onOpenQuickTaskWithProject={handleOpenQuickTaskWithProject}
            onOpenProjectEdit={setEditingProjectName}
          />
        )}

        {activeTab === 'kanban' && (
          <KanbanView
            tasks={tasks}
            onUpdateStatus={handleUpdateStatus}
            onEditTask={setEditingTaskItem}
          />
        )}

        {activeTab === 'agent' && (
          <AgentQueueView
            tasks={tasks}
            onApproveAgentTask={(id) => handleUpdateTask(id, { assignee: 'human' })}
            onEditTask={setEditingTaskItem}
          />
        )}

        {activeTab === 'table' && (
          <TaskTableView
            tasks={tasks}
            onUpdateStatus={handleUpdateStatus}
            onEditTask={setEditingTaskItem}
          />
        )}
      </main>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 border border-indigo-500/40 text-slate-100 rounded-xl shadow-2xl flex items-center gap-3 text-sm animate-bounce">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span>{notification}</span>
        </div>
      )}

      {/* Modals */}
      {isQuickTaskOpen && (
        <QuickTaskModal
          isOpen={isQuickTaskOpen}
          onClose={() => setIsQuickTaskOpen(false)}
          onCreateTask={handleCreateTask}
          initialProject={quickTaskProject}
          existingProjects={existingProjects}
        />
      )}

      {editingTaskItem && (
        <TaskEditModal
          task={editingTaskItem}
          isOpen={!!editingTaskItem}
          onClose={() => setEditingTaskItem(null)}
          onSave={(updates) => handleUpdateTask(editingTaskItem.id, updates)}
          existingProjects={existingProjects}
        />
      )}
    </div>
  );
}
