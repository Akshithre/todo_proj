import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Task, PrioritySuggestion } from "../types";
import { getTasks, getSuggestions, updateTask } from "../services/api";
import { SkeletonStat, SkeletonCard } from "../components/SkeletonLoader";
import AnimatedCounter from "../components/AnimatedCounter";
import ProgressRing from "../components/ProgressRing";
import PageWrapper from "../components/PageWrapper";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import { formatDistanceToNow } from "date-fns";

const priorityColor: Record<string, string> = {
  High: "bg-danger/20 text-danger border-danger/30",
  Medium: "bg-warning/20 text-warning border-warning/30",
  Low: "bg-success/20 text-success border-success/30",
};

const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [suggestions, setSuggestions] = useState<PrioritySuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const t = await getTasks();
      setTasks(t);
    } catch {
      toast.error("Failed to load tasks");
    }
    // Load suggestions independently – don't block dashboard on failure
    try {
      const s = await getSuggestions();
      setSuggestions(s);
    } catch {
      // Silently fail – suggestions are non-critical
      setSuggestions([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const overdue = tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "Completed").length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const priorityTasks = tasks
    .filter((t) => t.status !== "Completed")
    .sort((a, b) => {
      const p: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
      return (p[b.priority] || 0) - (p[a.priority] || 0);
    })
    .slice(0, 4);

  const handleComplete = async (id: number) => {
    try {
      await updateTask(id, { status: "Completed" });
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
      toast.success("Task completed!");
      load();
    } catch {
      toast.error("Failed to complete task");
    }
  };

  const stats = [
    { label: "Total Tasks", value: total, icon: CheckCircle2, color: "text-accent", glow: "glow-accent" },
    { label: "Completed", value: completed, icon: TrendingUp, color: "text-success", glow: "glow-success" },
    { label: "Overdue", value: overdue, icon: AlertTriangle, color: "text-danger", glow: overdue > 0 ? "glow-danger" : "" },
  ];

  return (
    <PageWrapper title="Dashboard" subtitle="Your command center">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          : (
            <>
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`glass-card ${s.glow}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted font-medium">{s.label}</span>
                    <s.icon size={16} className={s.color} />
                  </div>
                  <span className="text-3xl font-bold tracking-tight">
                    <AnimatedCounter value={s.value} />
                  </span>
                </motion.div>
              ))}
              {/* Completion Rate with ring */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
                className="glass-card flex items-center gap-4"
              >
                <ProgressRing value={rate} />
                <div>
                  <span className="text-xs text-muted font-medium">Completion</span>
                  <p className="text-lg font-bold tracking-tight mt-0.5">{rate}%</p>
                </div>
              </motion.div>
            </>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Priority tasks */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Priority Tasks</h2>
            <Link to="/tasks" className="text-xs text-accent hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : priorityTasks.length === 0 ? (
            <div className="glass-card text-center text-muted py-10">
              <CheckCircle2 size={32} className="mx-auto mb-3 text-success" />
              <p className="font-medium text-white/70">All caught up!</p>
              <p className="text-xs mt-1">No pending tasks right now.</p>
            </div>
          ) : (
            priorityTasks.map((t, i) => (
              <motion.div
                key={t.task_id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-hover p-4 flex items-center gap-4"
              >
                <button
                  onClick={() => handleComplete(t.task_id)}
                  className="w-5 h-5 rounded-full border-2 border-muted/40 hover:border-success hover:bg-success/20 transition-all flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{t.task_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                    {t.deadline && (
                      <span className={new Date(t.deadline) < new Date() ? "text-danger" : ""}>
                        {formatDistanceToNow(new Date(t.deadline), { addSuffix: true })}
                      </span>
                    )}
                    {t.category && <span>{t.category}</span>}
                  </div>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${priorityColor[t.priority] || ""}`}>
                  {t.priority}
                </span>
              </motion.div>
            ))
          )}
        </div>

        {/* AI Suggestions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <h2 className="text-lg font-semibold">AI Suggestions</h2>
          </div>
          <div className="glass-card relative overflow-hidden animate-pulse-glow">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
            {loading ? (
              <SkeletonCard />
            ) : suggestions.length === 0 ? (
              <div className="text-center text-muted py-6 relative z-10">
                <Sparkles size={24} className="mx-auto mb-2 text-accent/50" />
                <p className="text-sm">No suggestions right now</p>
                <p className="text-xs mt-1">Keep adding tasks and the AI will learn your patterns.</p>
              </div>
            ) : (
              <div className="space-y-3 relative z-10">
                {suggestions.slice(0, 3).map((s) => (
                  <div key={s.task_id} className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="font-medium text-sm">{s.task_name}</p>
                    <p className="text-xs text-muted mt-1">
                      {s.current_priority} &rarr;{" "}
                      <span className="text-accent font-medium">{s.suggested_priority}</span>
                      {" "}&mdash; {s.reason}
                    </p>
                  </div>
                ))}
                <Link to="/suggestions" className="block text-center text-xs text-accent hover:underline pt-2">
                  View all suggestions &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Dashboard;
