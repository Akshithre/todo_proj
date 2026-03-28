import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Clock, Trash2, Check, AlertTriangle, PlusCircle, List, Columns } from "lucide-react";
import { Link } from "react-router-dom";
import { Task, TimePrediction } from "../types";
import { getTasks, updateTask, deleteTask, predictTime } from "../services/api";
import { SkeletonCard } from "../components/SkeletonLoader";
import PageWrapper from "../components/PageWrapper";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import { formatDistanceToNow } from "date-fns";

type FilterMode = "all" | "today" | "overdue" | "completed";
type ViewMode = "list" | "kanban";
type KanbanCol = "To Do" | "In Progress" | "Completed";

const priorityBorder: Record<string, string> = {
  High: "border-l-danger",
  Medium: "border-l-warning",
  Low: "border-l-success",
};
const priorityBadge: Record<string, string> = {
  High: "bg-danger/20 text-danger",
  Medium: "bg-warning/20 text-warning",
  Low: "bg-success/20 text-success",
};

const kanbanColumns: { key: KanbanCol; color: string }[] = [
  { key: "To Do", color: "text-accent" },
  { key: "In Progress", color: "text-warning" },
  { key: "Completed", color: "text-success" },
];

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<"priority" | "deadline" | "created">("priority");
  const [view, setView] = useState<ViewMode>("list");
  const [predictions, setPredictions] = useState<Record<number, TimePrediction>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setTasks(await getTasks()); } catch { toast.error("Failed to load tasks"); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        document.getElementById("task-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleComplete = async (id: number) => {
    try {
      await updateTask(id, { status: "Completed" });
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
      toast.success("Task completed!");
      load();
    } catch { toast.error("Failed to complete task"); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTask(id);
      toast.success("Task deleted");
      load();
    } catch { toast.error("Failed to delete task"); }
  };

  const handlePredict = async (id: number) => {
    try {
      const p = await predictTime(id);
      setPredictions((prev) => ({ ...prev, [id]: p }));
    } catch { toast.error("Prediction failed"); }
  };

  const handleKanbanDrop = async (taskId: number, newStatus: KanbanCol) => {
    try {
      await updateTask(taskId, { status: newStatus });
      if (newStatus === "Completed") {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
      }
      toast.success(`Moved to ${newStatus}`);
      load();
    } catch { toast.error("Failed to update task"); }
  };

  const priorityVal: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const filtered = useMemo(() => {
    let list = tasks;
    if (search) list = list.filter((t) => t.task_name.toLowerCase().includes(search.toLowerCase()));
    if (filter === "today") list = list.filter((t) => t.deadline && new Date(t.deadline) < todayEnd && t.status !== "Completed");
    if (filter === "overdue") list = list.filter((t) => t.deadline && new Date(t.deadline) < now && t.status !== "Completed");
    if (filter === "completed") list = list.filter((t) => t.status === "Completed");
    list = [...list].sort((a, b) => {
      if (sort === "priority") return (priorityVal[b.priority] || 0) - (priorityVal[a.priority] || 0);
      if (sort === "deadline") return (a.deadline || "z").localeCompare(b.deadline || "z");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [tasks, search, filter, sort]); // eslint-disable-line

  const filters: { key: FilterMode; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "overdue", label: "Overdue" },
    { key: "completed", label: "Done" },
  ];

  const TaskCard: React.FC<{ t: Task; i: number; compact?: boolean }> = ({ t, i, compact }) => {
    const isOverdue = t.deadline && new Date(t.deadline) < now && t.status !== "Completed";
    const pred = predictions[t.task_id];
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -40, scale: 0.95 }}
        transition={{ delay: i * 0.03 }}
        draggable={view === "kanban"}
        onDragStart={(e: any) => { e.dataTransfer?.setData("taskId", String(t.task_id)); }}
        className={`glass-hover ${compact ? "p-3" : "p-4"} border-l-[3px] ${priorityBorder[t.priority] || "border-l-muted"} group ${view === "kanban" ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        <div className="flex items-start gap-3">
          {t.status !== "Completed" ? (
            <button
              onClick={() => handleComplete(t.task_id)}
              className="mt-0.5 w-5 h-5 rounded-full border-2 border-muted/40 hover:border-success hover:bg-success/20 transition-all flex-shrink-0"
            />
          ) : (
            <Check size={18} className="text-success mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium text-sm ${t.status === "Completed" ? "line-through text-muted" : ""}`}>
                {t.task_name}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priorityBadge[t.priority] || ""}`}>
                {t.priority}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted flex-wrap">
              {t.category && <span className="bg-white/5 px-2 py-0.5 rounded-md">{t.category}</span>}
              {t.deadline && (
                <span className={`flex items-center gap-1 ${isOverdue ? "text-danger" : ""}`}>
                  {isOverdue && <AlertTriangle size={10} />}
                  {formatDistanceToNow(new Date(t.deadline), { addSuffix: true })}
                </span>
              )}
              {t.estimated_time != null && (
                <span className="flex items-center gap-1"><Clock size={10} /> Est: {t.estimated_time}h</span>
              )}
              {pred && (
                <span className="text-accent flex items-center gap-1">
                  <Clock size={10} /> AI: {pred.predicted_time}h ({Math.round(pred.confidence * 100)}%)
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {t.status !== "Completed" && (
              <button onClick={() => handlePredict(t.task_id)}
                className="p-2 rounded-lg hover:bg-accent/20 text-muted hover:text-accent transition-all" title="Predict time">
                <Clock size={14} />
              </button>
            )}
            <button onClick={() => handleDelete(t.task_id)}
              className="p-2 rounded-lg hover:bg-danger/20 text-muted hover:text-danger transition-all" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <PageWrapper
      title="My Tasks"
      subtitle={`${tasks.length} total tasks`}
      actions={
        <Link to="/add" className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-accent text-sm font-semibold hover:opacity-90 active:scale-95 transition-all">
          <PlusCircle size={16} /> Add Task
        </Link>
      }
    >
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="task-search"
            placeholder="Search tasks... (press /)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === f.key ? "gradient-accent text-white" : "bg-white/5 text-muted hover:text-white hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-muted focus:outline-none focus:border-accent"
          >
            <option value="priority">By Priority</option>
            <option value="deadline">By Deadline</option>
            <option value="created">By Date</option>
          </select>
          {/* View toggle */}
          <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`p-2 transition-all ${view === "list" ? "bg-accent/20 text-accent" : "text-muted hover:text-white"}`}
              title="List view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`p-2 transition-all ${view === "kanban" ? "bg-accent/20 text-accent" : "text-muted hover:text-white"}`}
              title="Kanban view"
            >
              <Columns size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={view === "kanban" ? "grid grid-cols-1 md:grid-cols-3 gap-4" : "space-y-3"}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card text-center py-16">
          <Filter size={36} className="mx-auto mb-3 text-muted/30" />
          <p className="font-medium text-white/60">No tasks found</p>
          <p className="text-xs text-muted mt-1">
            {search ? "Try a different search term" : "Add your first task to get started!"}
          </p>
          {!search && (
            <Link to="/add" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl gradient-accent text-sm font-semibold">
              <PlusCircle size={14} /> Add Task
            </Link>
          )}
        </motion.div>
      ) : view === "list" ? (
        /* List View */
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((t, i) => (
              <TaskCard key={t.task_id} t={t} i={i} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanColumns.map((col) => {
            const colTasks = filtered.filter((t) => {
              if (col.key === "To Do") return t.status !== "Completed" && t.status !== "In Progress";
              return t.status === col.key;
            });
            return (
              <div
                key={col.key}
                className="space-y-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const taskId = Number(e.dataTransfer.getData("taskId"));
                  if (taskId) handleKanbanDrop(taskId, col.key);
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className={`text-sm font-semibold ${col.color}`}>{col.key}</h3>
                  <span className="text-xs text-muted bg-white/5 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-[120px] bg-white/[0.02] rounded-2xl p-2 border border-dashed border-white/5">
                  <AnimatePresence mode="popLayout">
                    {colTasks.map((t, i) => (
                      <TaskCard key={t.task_id} t={t} i={i} compact />
                    ))}
                  </AnimatePresence>
                  {colTasks.length === 0 && (
                    <p className="text-xs text-muted/30 text-center py-8">Drop tasks here</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
};

export default TaskList;
