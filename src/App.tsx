import { useEffect, useState } from "react";
import {
  FolderKanban,
  ListTodo,
  FileText,
  Plus,
  Trash2,
  Copy,
  Edit3,
  Settings,
  ChevronRight,
  ChevronDown,
  Bot,
  PanelLeftClose,
  PanelLeft,
  Home,
  Sun,
  Moon,
  ArrowUpDown,
} from "lucide-react";
import { ProjectApi, TaskApi, PromptApi } from "./tauri-api";
import { useAppStore } from "./store";
import { GlobalSearch, SettingsDialog, ToastContainer, toast } from "./components";
import type { SearchResultDto } from "./types";

function App() {
  const {
    projects,
    setProjects,
    addProject,
    updateProject,
    removeProject,
    selectedProjectId,
    selectProject,
    tasksByProject,
    setTasksForProject,
    addTask,
    updateTask,
    removeTask,
    selectedTaskId,
    selectTask,
    promptEntriesByTask,
    setPromptsForTask,
    addPrompt,
    updatePrompt,
    removePrompt,
    selectedPromptEntryId,
    selectPrompt,
  } = useAppStore();

  const [newProjectName, setNewProjectName] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"created" | "updated">("created");

  // UI 状态
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [addingTaskForProject, setAddingTaskForProject] = useState<number | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme");
    return (saved as "dark" | "light") || "dark";
  });

  // 列宽状态（支持持久化）
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("sidebarWidth");
    return saved ? parseInt(saved, 10) : 288; // 默认 w-72 = 288px
  });
  const [promptListWidth, setPromptListWidth] = useState(() => {
    const saved = localStorage.getItem("promptListWidth");
    return saved ? parseInt(saved, 10) : 320; // 默认 w-80 = 320px
  });

  // 列宽限制
  const SIDEBAR_MIN = 200;
  const SIDEBAR_MAX = 400;
  const SIDEBAR_DEFAULT = 288;
  const PROMPT_LIST_MIN = 240;
  const PROMPT_LIST_MAX = 500;
  const PROMPT_LIST_DEFAULT = 320;

  // 拖拽状态
  const [resizing, setResizing] = useState<"sidebar" | "promptList" | null>(null);

  // 处理拖拽
  const handleMouseDown = (column: "sidebar" | "promptList") => (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(column);
  };

  // 拖拽过程中更新宽度
  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizing === "sidebar") {
        const newWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, e.clientX));
        setSidebarWidth(newWidth);
      } else if (resizing === "promptList") {
        const sidebarOffset = sidebarOpen ? sidebarWidth : 0;
        const newWidth = Math.max(PROMPT_LIST_MIN, Math.min(PROMPT_LIST_MAX, e.clientX - sidebarOffset));
        setPromptListWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      // 保存到 localStorage
      if (resizing === "sidebar") {
        localStorage.setItem("sidebarWidth", String(sidebarWidth));
      } else if (resizing === "promptList") {
        localStorage.setItem("promptListWidth", String(promptListWidth));
      }
      setResizing(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, sidebarWidth, promptListWidth, sidebarOpen]);

  // 双击重置宽度
  const handleDoubleClick = (column: "sidebar" | "promptList") => () => {
    if (column === "sidebar") {
      setSidebarWidth(SIDEBAR_DEFAULT);
      localStorage.setItem("sidebarWidth", String(SIDEBAR_DEFAULT));
    } else {
      setPromptListWidth(PROMPT_LIST_DEFAULT);
      localStorage.setItem("promptListWidth", String(PROMPT_LIST_DEFAULT));
    }
  };

  // 主题样式配置
  const isDark = theme === "dark";
  const styles = {
    // 主容器
    container: isDark
      ? "bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-white"
      : "bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900",
    // 头部
    header: isDark
      ? "border-zinc-700/50 bg-zinc-900/80"
      : "border-slate-200 bg-white/90 shadow-sm",
    // 面包屑
    breadcrumb: isDark
      ? "bg-zinc-900/50 border-zinc-700/30"
      : "bg-slate-50 border-slate-200",
    breadcrumbText: isDark ? "text-zinc-400" : "text-slate-500",
    breadcrumbHover: isDark ? "hover:text-white" : "hover:text-slate-900",
    // 侧边栏
    sidebar: isDark
      ? "border-zinc-700/50 bg-zinc-900/50"
      : "border-slate-200 bg-white",
    sidebarBorder: isDark ? "border-zinc-700/30" : "border-slate-200",
    // 输入框
    input: isDark
      ? "bg-zinc-800/50 border-zinc-700 focus:border-blue-500 text-white placeholder-zinc-500"
      : "bg-white border-slate-300 focus:border-blue-500 text-slate-900 placeholder-slate-400",
    // 列表项
    listItem: isDark ? "hover:bg-zinc-800/50" : "hover:bg-slate-100",
    listItemActive: isDark ? "bg-blue-600/20" : "bg-blue-100",
    listItemActiveTask: isDark ? "bg-green-600/20" : "bg-green-100",
    listItemActivePrompt: isDark ? "bg-purple-600/20" : "bg-purple-100",
    // 按钮
    buttonHover: isDark ? "hover:bg-zinc-700" : "hover:bg-slate-200",
    buttonSecondary: isDark ? "bg-zinc-700 hover:bg-zinc-600" : "bg-slate-200 hover:bg-slate-300",
    // 图标/文字
    icon: isDark ? "text-zinc-400" : "text-slate-500",
    iconMuted: isDark ? "text-zinc-500" : "text-slate-400",
    textMuted: isDark ? "text-zinc-400" : "text-slate-500",
    textSecondary: isDark ? "text-zinc-300" : "text-slate-700",
    // 提示词列表
    promptList: isDark
      ? "border-zinc-700/50 bg-zinc-900/30"
      : "border-slate-200 bg-slate-50",
    // 内容区
    contentArea: isDark
      ? "bg-zinc-800/50 border-zinc-700/50"
      : "bg-white border-slate-200 shadow-sm",
    // 标签
    tag: isDark ? "bg-blue-600/30 text-blue-300" : "bg-blue-100 text-blue-700",
    modelTag: isDark ? "bg-zinc-700 text-zinc-300" : "bg-slate-200 text-slate-700",
  };

  // 编辑状态
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTaskName, setEditingTaskName] = useState("");
  const [editingPromptId, setEditingPromptId] = useState<number | null>(null);
  const [editingPromptContent, setEditingPromptContent] = useState("");
  const [editingPromptTitle, setEditingPromptTitle] = useState("");
  const [editingPromptTags, setEditingPromptTags] = useState("");
  const [editingPromptModel, setEditingPromptModel] = useState("");

  // 加载项目列表
  useEffect(() => {
    loadProjects();
  }, []);

  // 当选中项目变化时，自动展开并加载任务
  useEffect(() => {
    if (selectedProjectId) {
      setExpandedProjects((prev) => new Set([...prev, selectedProjectId]));
      if (!tasksByProject[selectedProjectId]) {
        loadTasks(selectedProjectId);
      }
    }
  }, [selectedProjectId]);

  // 当选中任务变化时，加载提示词
  useEffect(() => {
    if (selectedTaskId && !promptEntriesByTask[selectedTaskId]) {
      loadPrompts(selectedTaskId);
    }
  }, [selectedTaskId]);

  async function loadProjects() {
    try {
      const data = await ProjectApi.list();
      setProjects(data);
    } catch (e) {
      toast.error("加载项目失败");
      console.error(e);
    }
  }

  async function loadTasks(projectId: number) {
    try {
      const data = await TaskApi.list(projectId);
      setTasksForProject(projectId, data);
    } catch (e) {
      toast.error("加载任务失败");
      console.error(e);
    }
  }

  async function loadPrompts(taskId: number) {
    try {
      const data = await PromptApi.list({ taskId });
      setPromptsForTask(taskId, data);
    } catch (e) {
      toast.error("加载提示词失败");
      console.error(e);
    }
  }

  function parseTags(tagStr: string): string[] {
    return tagStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  // 项目 CRUD
  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    setLoading(true);
    try {
      const project = await ProjectApi.create(newProjectName);
      addProject(project);
      setNewProjectName("");
      selectProject(project.id);
      toast.success("项目创建成功");
    } catch (e) {
      toast.error("创建项目失败");
      console.error(e);
    }
    setLoading(false);
  }

  async function handleUpdateProject(id: number) {
    if (!editingProjectName.trim()) return;
    try {
      await ProjectApi.update(id, editingProjectName);
      updateProject(id, editingProjectName);
      setEditingProjectId(null);
      toast.success("项目已更新");
    } catch (e) {
      toast.error("更新项目失败");
      console.error(e);
    }
  }

  async function handleDeleteProject(id: number) {
    if (!confirm("确定要删除此项目吗？所有相关任务和提示词也会被删除。")) return;
    try {
      await ProjectApi.remove(id);
      removeProject(id);
      toast.success("项目已删除");
    } catch (e) {
      toast.error("删除项目失败");
      console.error(e);
    }
  }

  // 任务 CRUD
  async function handleCreateTask() {
    if (!newTaskName.trim() || !selectedProjectId) return;
    setLoading(true);
    try {
      const task = await TaskApi.create(selectedProjectId, newTaskName, newTaskDescription || undefined);
      addTask(task);
      setNewTaskName("");
      setNewTaskDescription("");
      selectTask(task.id);
      toast.success("任务创建成功");
    } catch (e: any) {
      toast.error(`创建任务失败: ${e?.message || e}`);
      console.error(e);
    }
    setLoading(false);
  }

  async function handleUpdateTask(id: number) {
    if (!editingTaskName.trim()) return;
    try {
      await TaskApi.update(id, editingTaskName);
      updateTask(id, { name: editingTaskName });
      setEditingTaskId(null);
      toast.success("任务已更新");
    } catch (e) {
      toast.error("更新任务失败");
      console.error(e);
    }
  }

  async function handleDeleteTask(id: number) {
    if (!confirm("确定要删除此任务吗？")) return;
    try {
      await TaskApi.remove(id);
      removeTask(id);
      toast.success("任务已删除");
    } catch (e) {
      toast.error("删除任务失败");
      console.error(e);
    }
  }

  // 提示词更新和删除
  async function handleUpdatePrompt(id: number) {
    if (!editingPromptContent.trim()) return;
    try {
      const tags = parseTags(editingPromptTags);
      await PromptApi.update({
        id,
        content: editingPromptContent,
        title: editingPromptTitle || undefined,
        tags: tags.length > 0 ? tags : undefined,
        model: editingPromptModel || undefined,
      });
      updatePrompt(id, {
        content: editingPromptContent,
        title: editingPromptTitle || undefined,
        tags: tags.length > 0 ? tags : undefined,
        model: editingPromptModel || undefined,
      });
      // 静默保存，不显示提示
    } catch (e) {
      toast.error("保存失败");
      console.error(e);
    }
  }

  async function handleDeletePrompt(id: number) {
    if (!confirm("确定要删除此提示词吗？")) return;
    try {
      await PromptApi.remove(id);
      removePrompt(id);
      toast.success("提示词已删除");
    } catch (e) {
      toast.error("删除提示词失败");
      console.error(e);
    }
  }

  async function handleCopyPrompt(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("已复制到剪贴板");
    } catch (e) {
      toast.error("复制失败");
      console.error(e);
    }
  }

  async function handleSearchResult(result: SearchResultDto) {
    selectProject(result.project_id);
    if (!tasksByProject[result.project_id]) {
      await loadTasks(result.project_id);
    }
    selectTask(result.task_id);
    if (!promptEntriesByTask[result.task_id]) {
      await loadPrompts(result.task_id);
    }
    selectPrompt(result.prompt_id);
  }

  function toggleProjectExpand(projectId: number) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
        // 展开时加载任务（如果尚未加载）
        if (!tasksByProject[projectId]) {
          loadTasks(projectId);
        }
      }
      return next;
    });
  }

  const currentTasks = selectedProjectId ? tasksByProject[selectedProjectId] || [] : [];
  const currentPrompts = selectedTaskId ? promptEntriesByTask[selectedTaskId] || [] : [];

  const filteredPrompts = currentPrompts
    .sort((a, b) => {
      if (sortBy === "updated") {
        // 按修改时间排序（新的在前），如果没有修改时间则用创建时间
        const aTime = a.updated_at || a.created_at;
        const bTime = b.updated_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }
      // 按创建时间排序（新的在前）
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const selectedPrompt = filteredPrompts.find((p) => p.id === selectedPromptEntryId) ||
    currentPrompts.find((p) => p.id === selectedPromptEntryId);



  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedTask = currentTasks.find((t) => t.id === selectedTaskId);
  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${styles.container}`}>
      {/* 顶部导航栏 */}
      <header className={`flex items-center justify-between px-4 py-2 border-b backdrop-blur-sm ${styles.header}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-lg transition-colors ${styles.buttonHover}`}
            title={sidebarOpen ? "收起侧边栏" : "展开侧边栏"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className={`w-5 h-5 ${styles.icon}`} />
            ) : (
              <PanelLeft className={`w-5 h-5 ${styles.icon}`} />
            )}
          </button>
          <img src="/logo.svg" alt="PromptLog" className="w-8 h-8" />
          <h1 className={`text-lg font-semibold bg-clip-text text-transparent ${isDark ? "bg-gradient-to-r from-white to-zinc-400" : "bg-gradient-to-r from-slate-900 to-slate-600"
            }`}>
            PromptLog
          </h1>
        </div>

        <GlobalSearch onSelectResult={handleSearchResult} isDark={isDark} />

        <div className="flex items-center gap-1">
          {/* 主题切换按钮 */}
          <button
            onClick={() => {
              const newTheme = theme === "dark" ? "light" : "dark";
              setTheme(newTheme);
              localStorage.setItem("theme", newTheme);
            }}
            className={`p-2 rounded-lg transition-colors ${styles.buttonHover}`}
            title={isDark ? "切换到浅色主题" : "切换到深色主题"}
          >
            {isDark ? (
              <Sun className={`w-5 h-5 ${styles.icon}`} />
            ) : (
              <Moon className={`w-5 h-5 ${styles.icon}`} />
            )}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className={`p-2 rounded-lg transition-colors ${styles.buttonHover}`}
          >
            <Settings className={`w-5 h-5 ${styles.icon}`} />
          </button>
        </div>
      </header>

      {/* 面包屑导航 */}
      <div className={`flex items-center gap-2 px-4 py-2 border-b text-sm ${styles.breadcrumb}`}>
        <button
          onClick={() => { selectProject(null); selectTask(null); selectPrompt(null); }}
          className={`flex items-center gap-1 ${styles.breadcrumbText} ${styles.breadcrumbHover} transition-colors`}
        >
          <Home className="w-4 h-4" />
        </button>
        {selectedProject && (
          <>
            <ChevronRight className={`w-4 h-4 ${styles.iconMuted}`} />
            <button
              onClick={() => { selectTask(null); selectPrompt(null); }}
              className="text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
            >
              <FolderKanban className="w-4 h-4" />
              {selectedProject.name}
            </button>
          </>
        )}
        {selectedTask && (
          <>
            <ChevronRight className={`w-4 h-4 ${styles.iconMuted}`} />
            <button
              onClick={() => selectPrompt(null)}
              className="text-green-600 hover:text-green-500 flex items-center gap-1 transition-colors"
            >
              <ListTodo className="w-4 h-4" />
              {selectedTask.name}
            </button>
          </>
        )}
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 - 项目/任务树 */}
        {sidebarOpen && (
          <div
            className={`border-r flex flex-col overflow-hidden ${styles.sidebar}`}
            style={{ width: sidebarWidth }}
          >
            {/* 新建项目 */}
            <div className={`p-3 border-b ${styles.sidebarBorder}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="新建项目..."
                  className={`flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${styles.input}`}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                />
                <button
                  onClick={handleCreateProject}
                  disabled={loading || !newProjectName.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 text-white flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 项目/任务树形列表 */}
            <div className="flex-1 overflow-y-auto">
              {projects.map((project) => (
                <div key={project.id}>
                  {/* 项目项 */}
                  <div
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors group relative ${selectedProjectId === project.id ? styles.listItemActive : styles.listItem
                      }`}
                  >
                    <button
                      onClick={() => toggleProjectExpand(project.id)}
                      className={`p-0.5 rounded flex-shrink-0 ${styles.buttonHover}`}
                    >
                      {expandedProjects.has(project.id) ? (
                        <ChevronDown className={`w-4 h-4 ${styles.iconMuted}`} />
                      ) : (
                        <ChevronRight className={`w-4 h-4 ${styles.iconMuted}`} />
                      )}
                    </button>
                    <FolderKanban className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    {editingProjectId === project.id ? (
                      <input
                        type="text"
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        className={`flex-1 px-2 py-0.5 rounded text-sm ${styles.input}`}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleUpdateProject(project.id);
                          }
                          if (e.key === "Escape") setEditingProjectId(null);
                        }}
                        onBlur={() => handleUpdateProject(project.id)}
                      />
                    ) : (
                      <span
                        className="flex-1 text-sm truncate"
                        onClick={() => {
                          selectProject(project.id);
                          setExpandedProjects((prev) => new Set([...prev, project.id]));
                        }}
                      >
                        {project.name}
                      </span>
                    )}
                    {/* 悬停时显示的按钮 - 使用绝对定位和渐变遮罩 */}
                    <div
                      className={`absolute right-0 top-0 bottom-0 flex items-center gap-0.5 pr-2 pl-6 opacity-0 group-hover:opacity-100 transition-opacity ${isDark
                        ? "bg-gradient-to-l from-zinc-800 via-zinc-800 to-transparent"
                        : selectedProjectId === project.id
                          ? "bg-gradient-to-l from-blue-100 via-blue-100 to-transparent"
                          : "bg-gradient-to-l from-white via-white to-transparent"
                        }`}
                    >
                      {/* 新建任务按钮 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectProject(project.id);
                          setExpandedProjects((prev) => new Set([...prev, project.id]));
                          setAddingTaskForProject(project.id);
                          setNewTaskName("");
                        }}
                        className={`p-1 rounded ${styles.buttonHover}`}
                        title="新建任务"
                      >
                        <Plus className="w-3 h-3 text-green-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProjectId(project.id);
                          setEditingProjectName(project.name);
                        }}
                        className={`p-1 rounded ${styles.buttonHover}`}
                        title="编辑"
                      >
                        <Edit3 className={`w-3 h-3 ${styles.icon}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className={`p-1 rounded ${styles.buttonHover}`}
                        title="删除"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* 任务列表（展开时显示） */}
                  {expandedProjects.has(project.id) && (
                    <div className={`ml-4 border-l ${styles.sidebarBorder}`}>
                      {(tasksByProject[project.id] || []).map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            selectProject(project.id);
                            selectTask(task.id);
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors group relative ${selectedTaskId === task.id ? styles.listItemActiveTask : styles.listItem
                            }`}
                        >
                          <ListTodo className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          {editingTaskId === task.id ? (
                            <input
                              type="text"
                              value={editingTaskName}
                              onChange={(e) => setEditingTaskName(e.target.value)}
                              className={`flex-1 px-2 py-0.5 rounded text-xs ${styles.input}`}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleUpdateTask(task.id);
                                }
                                if (e.key === "Escape") setEditingTaskId(null);
                              }}
                              onBlur={() => handleUpdateTask(task.id)}
                            />
                          ) : (
                            <span className={`flex-1 text-sm truncate ${styles.textSecondary}`}>{task.name}</span>
                          )}
                          {/* 悬停时显示的按钮 - 使用绝对定位和渐变遮罩 */}
                          <div
                            className={`absolute right-0 top-0 bottom-0 flex items-center gap-0.5 pr-2 pl-4 opacity-0 group-hover:opacity-100 transition-opacity ${isDark
                              ? "bg-gradient-to-l from-zinc-800 via-zinc-800 to-transparent"
                              : selectedTaskId === task.id
                                ? "bg-gradient-to-l from-green-100 via-green-100 to-transparent"
                                : "bg-gradient-to-l from-white via-white to-transparent"
                              }`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTaskId(task.id);
                                setEditingTaskName(task.name);
                              }}
                              className={`p-0.5 rounded ${styles.buttonHover}`}
                              title="编辑"
                            >
                              <Edit3 className={`w-3 h-3 ${styles.icon}`} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                              className={`p-0.5 rounded ${styles.buttonHover}`}
                              title="删除"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {/* 新建任务输入框 */}
                      {addingTaskForProject === project.id && (
                        <div className="px-3 py-2">
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={newTaskName}
                              onChange={(e) => setNewTaskName(e.target.value)}
                              placeholder="输入任务名称..."
                              className={`flex-1 px-2 py-1 border rounded text-xs focus:outline-none focus:border-green-500 ${styles.input}`}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newTaskName.trim()) {
                                  handleCreateTask();
                                  setAddingTaskForProject(null);
                                }
                                if (e.key === "Escape") {
                                  setAddingTaskForProject(null);
                                  setNewTaskName("");
                                }
                              }}
                              onBlur={() => {
                                if (!newTaskName.trim()) {
                                  setAddingTaskForProject(null);
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                if (newTaskName.trim()) {
                                  handleCreateTask();
                                  setAddingTaskForProject(null);
                                }
                              }}
                              disabled={loading || !newTaskName.trim()}
                              className="p-1 bg-green-600 hover:bg-green-500 rounded transition-colors disabled:opacity-50 text-white"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* 侧边栏拖拽把手 - 仅在侧边栏打开时显示 */}
        {sidebarOpen && (
          <div
            className={`w-1 cursor-col-resize group flex-shrink-0 ${resizing === "sidebar" ? (isDark ? "bg-blue-500" : "bg-blue-400") : ""
              }`}
            onMouseDown={handleMouseDown("sidebar")}
            onDoubleClick={handleDoubleClick("sidebar")}
          >
            <div className={`w-full h-full transition-colors ${isDark ? "hover:bg-blue-500/50" : "hover:bg-blue-400/50"
              }`} />
          </div>
        )}

        {/* 右侧主内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 提示词列表 */}
          {selectedTaskId && (
            <div
              className={`border-r flex flex-col ${styles.promptList}`}
              style={{ width: promptListWidth }}
            >
              {/* 工具栏 */}
              <div className={`p-3 border-b ${styles.sidebarBorder}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm flex items-center gap-2 ${styles.textMuted}`}>
                    <FileText className="w-4 h-4" />
                    提示词列表
                  </span>
                  {/* 新建提示词按钮 */}
                  <button
                    onClick={async () => {
                      if (!selectedTaskId) return;
                      setLoading(true);
                      try {
                        const prompt = await PromptApi.create({
                          taskId: selectedTaskId,
                          content: " ",
                          title: "新提示词",
                        });
                        addPrompt(prompt);
                        selectPrompt(prompt.id);
                        toast.success("已创建新提示词");
                      } catch (e) {
                        toast.error("创建失败");
                        console.error(e);
                      }
                      setLoading(false);
                    }}
                    disabled={loading}
                    className={`p-1.5 rounded text-green-500 transition-colors ${styles.buttonHover}`}
                    title="新建提示词"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {/* 排序按钮 */}
                  <button
                    onClick={() => {
                      const newSort = sortBy === "created" ? "updated" : "created";
                      setSortBy(newSort);
                      toast.success(newSort === "created" ? "按创建时间排序" : "按修改时间排序");
                    }}
                    className={`p-1.5 rounded transition-colors flex items-center gap-1 ${styles.buttonHover}`}
                    title={sortBy === "created" ? "当前：创建时间（点击切换）" : "当前：修改时间（点击切换）"}
                  >
                    <ArrowUpDown className={`w-3.5 h-3.5 ${styles.iconMuted}`} />
                    <span className={`text-xs ${styles.textMuted}`}>
                      {sortBy === "created" ? "创建" : "修改"}
                    </span>
                  </button>
                </div>
              </div>

              {/* 提示词列表 */}
              <div className="flex-1 overflow-y-auto">
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    onClick={() => selectPrompt(prompt.id)}
                    className={`p-3 border-b cursor-pointer transition-colors group relative ${styles.sidebarBorder} ${selectedPromptEntryId === prompt.id ? styles.listItemActivePrompt : styles.listItem
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {prompt.title && (
                          <div className="text-sm font-medium mb-1 truncate">{prompt.title}</div>
                        )}
                        <div className={`text-xs line-clamp-2 ${styles.textMuted}`}>{prompt.content || "空内容"}</div>
                      </div>
                      {/* 删除按钮 - 悬停时显示 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePrompt(prompt.id);
                        }}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ml-2 ${styles.buttonHover}`}
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                    <div className={`text-xs mt-1 ${styles.iconMuted}`}>
                      {sortBy === "created"
                        ? `创建: ${new Date(prompt.created_at).toLocaleString()}`
                        : `修改: ${new Date(prompt.updated_at || prompt.created_at).toLocaleString()}`}
                    </div>
                  </div>
                ))}
                {filteredPrompts.length === 0 && (
                  <div className={`p-4 text-center text-sm ${styles.textMuted}`}>
                    暂无提示词，点击上方 + 创建
                  </div>
                )}
              </div>
            </div>
          )}
          {/* 提示词列表拖拽把手 */}
          {selectedTaskId && (
            <div
              className={`w-1 cursor-col-resize group flex-shrink-0 ${resizing === "promptList" ? (isDark ? "bg-blue-500" : "bg-blue-400") : ""
                }`}
              onMouseDown={handleMouseDown("promptList")}
              onDoubleClick={handleDoubleClick("promptList")}
            >
              <div className={`w-full h-full transition-colors ${isDark ? "hover:bg-blue-500/50" : "hover:bg-blue-400/50"
                }`} />
            </div>
          )}

          {/* 主内容/编辑区 */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* 提示词编辑区（类似笔记软件，直接可编辑） */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedPrompt ? (
                <div className="max-w-4xl mx-auto space-y-4">
                  {/* 顶部工具栏 */}
                  <div className="flex items-center justify-between">
                    <div className={`text-xs ${styles.textMuted}`}>
                      {new Date(selectedPrompt.created_at).toLocaleString()}
                      {selectedPrompt.updated_at !== selectedPrompt.created_at && (
                        <span className="ml-2">（已编辑）</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopyPrompt(selectedPrompt.content)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors text-white"
                      title="复制内容 (Cmd+C)"
                    >
                      <Copy className="w-4 h-4" />
                      复制
                    </button>
                  </div>

                  {/* 标题输入 */}
                  <input
                    type="text"
                    value={editingPromptId === selectedPrompt.id ? editingPromptTitle : (selectedPrompt.title || "")}
                    onChange={(e) => setEditingPromptTitle(e.target.value)}
                    onFocus={() => {
                      if (editingPromptId !== selectedPrompt.id) {
                        setEditingPromptId(selectedPrompt.id);
                        setEditingPromptTitle(selectedPrompt.title || "");
                        setEditingPromptContent(selectedPrompt.content);
                        setEditingPromptTags(selectedPrompt.tags?.join(", ") || "");
                        setEditingPromptModel(selectedPrompt.model || "");
                      }
                    }}
                    onBlur={() => {
                      if (editingPromptId === selectedPrompt.id) {
                        handleUpdatePrompt(selectedPrompt.id);
                      }
                    }}
                    placeholder="输入标题..."
                    className={`w-full text-xl font-semibold bg-transparent border-none outline-none ${isDark ? "text-white placeholder-zinc-600" : "text-slate-900 placeholder-slate-400"
                      }`}
                  />

                  {/* 元数据行 */}
                  <div className="flex gap-3 flex-wrap">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg ${styles.contentArea}`}>
                      <Bot className={`w-4 h-4 ${styles.iconMuted}`} />
                      <input
                        type="text"
                        value={editingPromptId === selectedPrompt.id ? editingPromptModel : (selectedPrompt.model || "")}
                        onChange={(e) => setEditingPromptModel(e.target.value)}
                        onFocus={() => {
                          if (editingPromptId !== selectedPrompt.id) {
                            setEditingPromptId(selectedPrompt.id);
                            setEditingPromptTitle(selectedPrompt.title || "");
                            setEditingPromptContent(selectedPrompt.content);
                            setEditingPromptTags(selectedPrompt.tags?.join(", ") || "");
                            setEditingPromptModel(selectedPrompt.model || "");
                          }
                        }}
                        onBlur={() => {
                          if (editingPromptId === selectedPrompt.id) {
                            handleUpdatePrompt(selectedPrompt.id);
                          }
                        }}
                        placeholder="模型"
                        className={`w-28 bg-transparent text-sm focus:outline-none ${styles.textSecondary}`}
                      />
                    </div>
                  </div>

                  {/* 内容编辑区 */}
                  <textarea
                    value={editingPromptId === selectedPrompt.id
                      ? editingPromptContent
                      : (selectedPrompt.content.trim() ? selectedPrompt.content : "")}
                    onChange={(e) => setEditingPromptContent(e.target.value)}
                    onFocus={() => {
                      if (editingPromptId !== selectedPrompt.id) {
                        setEditingPromptId(selectedPrompt.id);
                        setEditingPromptTitle(selectedPrompt.title || "");
                        // 如果内容只有空格，聚焦时清空让用户直接输入
                        const content = selectedPrompt.content.trim() ? selectedPrompt.content : "";
                        setEditingPromptContent(content);
                        setEditingPromptTags(selectedPrompt.tags?.join(", ") || "");
                        setEditingPromptModel(selectedPrompt.model || "");
                      }
                    }}
                    onBlur={() => {
                      if (editingPromptId === selectedPrompt.id) {
                        // 如果内容为空，保存时用空格（后端需要非空）
                        if (!editingPromptContent.trim()) {
                          setEditingPromptContent(" ");
                        }
                        handleUpdatePrompt(selectedPrompt.id);
                      }
                    }}
                    placeholder="输入提示词内容..."
                    className={`w-full min-h-[400px] p-4 border rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500/50 font-mono leading-relaxed ${styles.contentArea} ${isDark ? "text-zinc-200" : "text-slate-800"
                      }`}
                  />
                </div>
              ) : selectedTaskId ? (
                <div className={`flex flex-col items-center justify-center h-full ${styles.textMuted}`}>
                  <FileText className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg">选择或创建一个提示词</p>
                  <p className="text-sm mt-2">点击左侧列表中的 + 按钮创建新提示词</p>
                </div>
              ) : selectedProjectId ? (
                <div className={`flex flex-col items-center justify-center h-full ${styles.textMuted}`}>
                  <ListTodo className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg">选择或创建一个任务</p>
                </div>
              ) : (
                <div className={`flex flex-col items-center justify-center h-full ${styles.textMuted}`}>
                  <FolderKanban className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg">选择或创建一个项目开始</p>
                  <p className="text-sm mt-2">使用左侧导航栏管理您的提示词</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} isDark={isDark} />
      <ToastContainer />
    </div >
  );
}

export default App;
