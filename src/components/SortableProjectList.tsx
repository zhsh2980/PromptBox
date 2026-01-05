// 可排序项目列表组件
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    ChevronDown,
    ChevronRight,
    FolderKanban,
    ListTodo,
    Plus,
    Pencil,
    Trash2,
    GripVertical,
} from "lucide-react";
import type { ProjectDto, TaskDto } from "../types";

interface SortableProjectItemProps {
    project: ProjectDto;
    isSelected: boolean;
    isExpanded: boolean;
    isEditing: boolean;
    editingName: string;
    tasks: TaskDto[];
    selectedTaskId: number | null;
    editingTaskId: number | null;
    editingTaskName: string;
    styles: Record<string, string>;
    isDark: boolean;
    onToggleExpand: () => void;
    onSelect: () => void;
    onStartEdit: () => void;
    onEditNameChange: (name: string) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onDelete: () => void;
    onAddTask: () => void;
    onSelectTask: (taskId: number) => void;
    onStartEditTask: (taskId: number, name: string) => void;
    onEditTaskNameChange: (name: string) => void;
    onSaveTaskEdit: (taskId: number) => void;
    onCancelTaskEdit: () => void;
    onDeleteTask: (taskId: number) => void;
    onTasksReorder: (newOrder: number[]) => void;
}

// 可排序的任务项
function SortableTaskItem({
    task,
    isSelected,
    isEditing,
    editingName,
    styles,
    isDark,
    onSelect,
    onStartEdit,
    onEditNameChange,
    onSaveEdit,
    onCancelEdit,
    onDelete,
}: {
    task: TaskDto;
    isSelected: boolean;
    isEditing: boolean;
    editingName: string;
    styles: Record<string, string>;
    isDark: boolean;
    onSelect: () => void;
    onStartEdit: () => void;
    onEditNameChange: (name: string) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onDelete: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer transition-colors group relative ${isSelected ? styles.listItemActiveTask : styles.listItem
                }`}
            onClick={onSelect}
        >
            {/* 拖拽手柄 */}
            <button
                {...attributes}
                {...listeners}
                className={`p-0.5 cursor-grab active:cursor-grabbing rounded opacity-0 group-hover:opacity-100 transition-opacity ${styles.buttonHover}`}
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className={`w-3 h-3 ${styles.iconMuted}`} />
            </button>

            <ListTodo className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />

            {isEditing ? (
                <input
                    type="text"
                    value={editingName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    className={`flex-1 px-2 py-0.5 rounded text-xs ${styles.input}`}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            onSaveEdit();
                        }
                        if (e.key === "Escape") onCancelEdit();
                    }}
                    onBlur={onSaveEdit}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span className={`flex-1 text-sm truncate ${styles.textSecondary}`}>
                    {task.name}
                </span>
            )}

            {/* 悬停操作按钮 */}
            <div
                className={`absolute right-0 top-0 bottom-0 flex items-center gap-0.5 pr-2 pl-4 opacity-0 group-hover:opacity-100 transition-opacity ${isDark
                    ? "bg-gradient-to-l from-zinc-800 via-zinc-800 to-transparent"
                    : isSelected
                        ? "bg-gradient-to-l from-green-100 via-green-100 to-transparent"
                        : "bg-gradient-to-l from-white via-white to-transparent"
                    }`}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onStartEdit();
                    }}
                    className={`p-1 rounded ${styles.buttonHover}`}
                    title="编辑"
                >
                    <Pencil className={`w-3 h-3 ${styles.iconMuted}`} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className={`p-1 rounded hover:bg-red-500/20`}
                    title="删除"
                >
                    <Trash2 className="w-3 h-3 text-red-500" />
                </button>
            </div>
        </div>
    );
}

// 可排序的项目项
export function SortableProjectItem({
    project,
    isSelected,
    isExpanded,
    isEditing,
    editingName,
    tasks,
    selectedTaskId,
    editingTaskId,
    editingTaskName,
    styles,
    isDark,
    onToggleExpand,
    onSelect,
    onStartEdit,
    onEditNameChange,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    onAddTask,
    onSelectTask,
    onStartEditTask,
    onEditTaskNameChange,
    onSaveTaskEdit,
    onCancelTaskEdit,
    onDeleteTask,
    onTasksReorder,
}: SortableProjectItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: project.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // 任务排序传感器
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleTaskDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = tasks.findIndex((t) => t.id === active.id);
            const newIndex = tasks.findIndex((t) => t.id === over.id);
            const newOrder = arrayMove(tasks, oldIndex, newIndex).map((t) => t.id);
            onTasksReorder(newOrder);
        }
    };

    return (
        <div ref={setNodeRef} style={style}>
            {/* 项目行 */}
            <div
                className={`flex items-center gap-1 px-2 py-2 cursor-pointer transition-colors group relative ${isSelected ? styles.listItemActive : styles.listItem
                    }`}
            >
                {/* 拖拽手柄 */}
                <button
                    {...attributes}
                    {...listeners}
                    className={`p-0.5 cursor-grab active:cursor-grabbing rounded opacity-0 group-hover:opacity-100 transition-opacity ${styles.buttonHover}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className={`w-4 h-4 ${styles.iconMuted}`} />
                </button>

                <button
                    onClick={onToggleExpand}
                    className={`p-0.5 rounded flex-shrink-0 ${styles.buttonHover}`}
                >
                    {isExpanded ? (
                        <ChevronDown className={`w-4 h-4 ${styles.iconMuted}`} />
                    ) : (
                        <ChevronRight className={`w-4 h-4 ${styles.iconMuted}`} />
                    )}
                </button>

                <FolderKanban className="w-4 h-4 text-blue-500 flex-shrink-0" />

                {isEditing ? (
                    <input
                        type="text"
                        value={editingName}
                        onChange={(e) => onEditNameChange(e.target.value)}
                        className={`flex-1 px-2 py-0.5 rounded text-sm ${styles.input}`}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                onSaveEdit();
                            }
                            if (e.key === "Escape") onCancelEdit();
                        }}
                        onBlur={onSaveEdit}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="flex-1 text-sm truncate" onClick={onSelect}>
                        {project.name}
                    </span>
                )}

                {/* 悬停操作按钮 */}
                <div
                    className={`absolute right-0 top-0 bottom-0 flex items-center gap-0.5 pr-2 pl-6 opacity-0 group-hover:opacity-100 transition-opacity ${isDark
                        ? "bg-gradient-to-l from-zinc-800 via-zinc-800 to-transparent"
                        : isSelected
                            ? "bg-gradient-to-l from-blue-100 via-blue-100 to-transparent"
                            : "bg-gradient-to-l from-white via-white to-transparent"
                        }`}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddTask();
                        }}
                        className={`p-1 rounded ${styles.buttonHover}`}
                        title="新建任务"
                    >
                        <Plus className={`w-3.5 h-3.5 ${styles.iconMuted}`} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStartEdit();
                        }}
                        className={`p-1 rounded ${styles.buttonHover}`}
                        title="编辑"
                    >
                        <Pencil className={`w-3.5 h-3.5 ${styles.iconMuted}`} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className={`p-1 rounded hover:bg-red-500/20`}
                        title="删除"
                    >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                </div>
            </div>

            {/* 任务列表 */}
            {isExpanded && tasks.length > 0 && (
                <div className={`ml-6 border-l ${styles.sidebarBorder}`}>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleTaskDragEnd}
                    >
                        <SortableContext
                            items={tasks.map((t) => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {tasks.map((task) => (
                                <SortableTaskItem
                                    key={task.id}
                                    task={task}
                                    isSelected={selectedTaskId === task.id}
                                    isEditing={editingTaskId === task.id}
                                    editingName={editingTaskName}
                                    styles={styles}
                                    isDark={isDark}
                                    onSelect={() => onSelectTask(task.id)}
                                    onStartEdit={() => onStartEditTask(task.id, task.name)}
                                    onEditNameChange={onEditTaskNameChange}
                                    onSaveEdit={() => onSaveTaskEdit(task.id)}
                                    onCancelEdit={onCancelTaskEdit}
                                    onDelete={() => onDeleteTask(task.id)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            )}
        </div>
    );
}

// 项目列表容器组件
interface SortableProjectListProps {
    projects: ProjectDto[];
    tasksByProject: Record<number, TaskDto[]>;
    selectedProjectId: number | null;
    selectedTaskId: number | null;
    expandedProjects: Set<number>;
    editingProjectId: number | null;
    editingProjectName: string;
    editingTaskId: number | null;
    editingTaskName: string;
    styles: Record<string, string>;
    isDark: boolean;
    onProjectsReorder: (newOrder: number[]) => void;
    onTasksReorder: (projectId: number, newOrder: number[]) => void;
    onToggleExpand: (projectId: number) => void;
    onSelectProject: (projectId: number) => void;
    onSelectTask: (projectId: number, taskId: number) => void;
    onStartEditProject: (projectId: number, name: string) => void;
    onEditProjectNameChange: (name: string) => void;
    onSaveProjectEdit: (projectId: number) => void;
    onCancelProjectEdit: () => void;
    onDeleteProject: (projectId: number) => void;
    onAddTask: (projectId: number) => void;
    onStartEditTask: (taskId: number, name: string) => void;
    onEditTaskNameChange: (name: string) => void;
    onSaveTaskEdit: (taskId: number) => void;
    onCancelTaskEdit: () => void;
    onDeleteTask: (taskId: number) => void;
}

export function SortableProjectList({
    projects,
    tasksByProject,
    selectedProjectId,
    selectedTaskId,
    expandedProjects,
    editingProjectId,
    editingProjectName,
    editingTaskId,
    editingTaskName,
    styles,
    isDark,
    onProjectsReorder,
    onTasksReorder,
    onToggleExpand,
    onSelectProject,
    onSelectTask,
    onStartEditProject,
    onEditProjectNameChange,
    onSaveProjectEdit,
    onCancelProjectEdit,
    onDeleteProject,
    onAddTask,
    onStartEditTask,
    onEditTaskNameChange,
    onSaveTaskEdit,
    onCancelTaskEdit,
    onDeleteTask,
}: SortableProjectListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = projects.findIndex((p) => p.id === active.id);
            const newIndex = projects.findIndex((p) => p.id === over.id);
            const newOrder = arrayMove(projects, oldIndex, newIndex).map((p) => p.id);
            onProjectsReorder(newOrder);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={projects.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
            >
                {projects.map((project) => (
                    <SortableProjectItem
                        key={project.id}
                        project={project}
                        isSelected={selectedProjectId === project.id}
                        isExpanded={expandedProjects.has(project.id)}
                        isEditing={editingProjectId === project.id}
                        editingName={editingProjectName}
                        tasks={tasksByProject[project.id] || []}
                        selectedTaskId={selectedTaskId}
                        editingTaskId={editingTaskId}
                        editingTaskName={editingTaskName}
                        styles={styles}
                        isDark={isDark}
                        onToggleExpand={() => onToggleExpand(project.id)}
                        onSelect={() => onSelectProject(project.id)}
                        onStartEdit={() => onStartEditProject(project.id, project.name)}
                        onEditNameChange={onEditProjectNameChange}
                        onSaveEdit={() => onSaveProjectEdit(project.id)}
                        onCancelEdit={onCancelProjectEdit}
                        onDelete={() => onDeleteProject(project.id)}
                        onAddTask={() => onAddTask(project.id)}
                        onSelectTask={(taskId) => onSelectTask(project.id, taskId)}
                        onStartEditTask={onStartEditTask}
                        onEditTaskNameChange={onEditTaskNameChange}
                        onSaveTaskEdit={onSaveTaskEdit}
                        onCancelTaskEdit={onCancelTaskEdit}
                        onDeleteTask={onDeleteTask}
                        onTasksReorder={(newOrder) => onTasksReorder(project.id, newOrder)}
                    />
                ))}
            </SortableContext>
        </DndContext>
    );
}
