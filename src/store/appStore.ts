// 全局状态管理 Store
import { create } from "zustand";
import type { ProjectDto, TaskDto, PromptEntryDto, SearchResultDto } from "../types";

/** 应用全局状态 */
interface AppState {
    // === 数据 ===
    projects: ProjectDto[];
    tasksByProject: Record<number, TaskDto[]>;
    promptEntriesByTask: Record<number, PromptEntryDto[]>;

    // === 当前选中 ===
    selectedProjectId: number | null;
    selectedTaskId: number | null;
    selectedPromptEntryId: number | null;

    // === 搜索 ===
    globalSearchKeyword: string;
    globalSearchResults: SearchResultDto[];

    // === UI 状态 ===
    isSettingsDialogOpen: boolean;
    isGlobalSearchPanelOpen: boolean;
    isLoading: boolean;

    // === Actions ===
    // 项目相关
    setProjects: (projects: ProjectDto[]) => void;
    addProject: (project: ProjectDto) => void;
    updateProject: (id: number, name: string) => void;
    removeProject: (id: number) => void;
    selectProject: (id: number | null) => void;

    // 任务相关
    setTasksForProject: (projectId: number, tasks: TaskDto[]) => void;
    addTask: (task: TaskDto) => void;
    updateTask: (id: number, updates: Partial<TaskDto>) => void;
    removeTask: (id: number) => void;
    selectTask: (id: number | null) => void;

    // 提示词相关
    setPromptsForTask: (taskId: number, prompts: PromptEntryDto[]) => void;
    addPrompt: (prompt: PromptEntryDto) => void;
    updatePrompt: (id: number, updates: Partial<PromptEntryDto>) => void;
    removePrompt: (id: number) => void;
    selectPrompt: (id: number | null) => void;

    // 搜索相关
    setSearchKeyword: (keyword: string) => void;
    setSearchResults: (results: SearchResultDto[]) => void;
    openSearchPanel: () => void;
    closeSearchPanel: () => void;

    // UI 相关
    openSettingsDialog: () => void;
    closeSettingsDialog: () => void;
    setLoading: (loading: boolean) => void;

    // 重置
    reset: () => void;
}

const initialState = {
    projects: [],
    tasksByProject: {},
    promptEntriesByTask: {},
    selectedProjectId: null,
    selectedTaskId: null,
    selectedPromptEntryId: null,
    globalSearchKeyword: "",
    globalSearchResults: [],
    isSettingsDialogOpen: false,
    isGlobalSearchPanelOpen: false,
    isLoading: false,
};

export const useAppStore = create<AppState>((set) => ({
    ...initialState,

    // === 项目 Actions ===
    setProjects: (projects) => set({ projects }),

    addProject: (project) =>
        set((state) => ({ projects: [...state.projects, project] })),

    updateProject: (id, name) =>
        set((state) => ({
            projects: state.projects.map((p) =>
                p.id === id ? { ...p, name, updated_at: new Date().toISOString() } : p
            ),
        })),

    removeProject: (id) =>
        set((state) => {
            const { [id]: _, ...restTasks } = state.tasksByProject;
            return {
                projects: state.projects.filter((p) => p.id !== id),
                tasksByProject: restTasks,
                selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
                selectedTaskId: state.selectedProjectId === id ? null : state.selectedTaskId,
                selectedPromptEntryId: state.selectedProjectId === id ? null : state.selectedPromptEntryId,
            };
        }),

    selectProject: (id) =>
        set({
            selectedProjectId: id,
            selectedTaskId: null,
            selectedPromptEntryId: null,
        }),

    // === 任务 Actions ===
    setTasksForProject: (projectId, tasks) =>
        set((state) => ({
            tasksByProject: { ...state.tasksByProject, [projectId]: tasks },
        })),

    addTask: (task) =>
        set((state) => ({
            tasksByProject: {
                ...state.tasksByProject,
                [task.project_id]: [...(state.tasksByProject[task.project_id] || []), task],
            },
        })),

    updateTask: (id, updates) =>
        set((state) => {
            const newTasksByProject: Record<number, TaskDto[]> = {};
            for (const [projectId, tasks] of Object.entries(state.tasksByProject)) {
                newTasksByProject[Number(projectId)] = tasks.map((t) =>
                    t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
                );
            }
            return { tasksByProject: newTasksByProject };
        }),

    removeTask: (id) =>
        set((state) => {
            const newTasksByProject: Record<number, TaskDto[]> = {};
            for (const [projectId, tasks] of Object.entries(state.tasksByProject)) {
                newTasksByProject[Number(projectId)] = tasks.filter((t) => t.id !== id);
            }
            const { [id]: _, ...restPrompts } = state.promptEntriesByTask;
            return {
                tasksByProject: newTasksByProject,
                promptEntriesByTask: restPrompts,
                selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
                selectedPromptEntryId: state.selectedTaskId === id ? null : state.selectedPromptEntryId,
            };
        }),

    selectTask: (id) =>
        set({
            selectedTaskId: id,
            selectedPromptEntryId: null,
        }),

    // === 提示词 Actions ===
    setPromptsForTask: (taskId, prompts) =>
        set((state) => ({
            promptEntriesByTask: { ...state.promptEntriesByTask, [taskId]: prompts },
        })),

    addPrompt: (prompt) =>
        set((state) => ({
            promptEntriesByTask: {
                ...state.promptEntriesByTask,
                [prompt.task_id]: [...(state.promptEntriesByTask[prompt.task_id] || []), prompt],
            },
        })),

    updatePrompt: (id, updates) =>
        set((state) => {
            const newPromptsByTask: Record<number, PromptEntryDto[]> = {};
            for (const [taskId, prompts] of Object.entries(state.promptEntriesByTask)) {
                newPromptsByTask[Number(taskId)] = prompts.map((p) =>
                    p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
                );
            }
            return { promptEntriesByTask: newPromptsByTask };
        }),

    removePrompt: (id) =>
        set((state) => {
            const newPromptsByTask: Record<number, PromptEntryDto[]> = {};
            for (const [taskId, prompts] of Object.entries(state.promptEntriesByTask)) {
                newPromptsByTask[Number(taskId)] = prompts.filter((p) => p.id !== id);
            }
            return {
                promptEntriesByTask: newPromptsByTask,
                selectedPromptEntryId: state.selectedPromptEntryId === id ? null : state.selectedPromptEntryId,
            };
        }),

    selectPrompt: (id) => set({ selectedPromptEntryId: id }),

    // === 搜索 Actions ===
    setSearchKeyword: (keyword) => set({ globalSearchKeyword: keyword }),
    setSearchResults: (results) => set({ globalSearchResults: results }),
    openSearchPanel: () => set({ isGlobalSearchPanelOpen: true }),
    closeSearchPanel: () => set({ isGlobalSearchPanelOpen: false, globalSearchResults: [] }),

    // === UI Actions ===
    openSettingsDialog: () => set({ isSettingsDialogOpen: true }),
    closeSettingsDialog: () => set({ isSettingsDialogOpen: false }),
    setLoading: (loading) => set({ isLoading: loading }),

    // === 重置 ===
    reset: () => set(initialState),
}));
