import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Clock, TrendingUp, Brain, Loader2, ArrowRight } from "lucide-react";
import { Task, PrioritySuggestion, TimePrediction } from "../types";
import { getSuggestions, predictTime, updateTask } from "../services/api";
import { SkeletonCard } from "../components/SkeletonLoader";
import PageWrapper from "../components/PageWrapper";
import { useDataCache } from "../context/DataCache";
import toast from "react-hot-toast";

const SmartSuggestions: React.FC = () => {
  const { tasks, suggestions: cachedSuggestions, loadDashboard, invalidate } = useDataCache();
  const [suggestions, setSuggestions] = useState<PrioritySuggestion[]>(cachedSuggestions);
  const [predictions, setPredictions] = useState<TimePrediction[]>([]);
  const [loading, setLoading] = useState(tasks.length === 0);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Use cached data if available, otherwise fetch
      if (tasks.length === 0) {
        setLoading(true);
        await loadDashboard();
      }
      setLoading(false);
    };
    load();
  }, [loadDashboard, tasks.length]);

  // When cached data arrives, update local state and predict
  useEffect(() => {
    setSuggestions(cachedSuggestions);
  }, [cachedSuggestions]);

  useEffect(() => {
    if (tasks.length === 0) return;
    const pending = tasks.filter((x) => x.status !== "Completed").slice(0, 5);
    if (pending.length === 0) return;
    setPredicting(true);
    Promise.all(pending.map((p) => predictTime(p.task_id).catch(() => null)))
      .then((preds) => setPredictions(preds.filter(Boolean) as TimePrediction[]))
      .finally(() => setPredicting(false));
  }, [tasks]);

  const applySuggestion = async (s: PrioritySuggestion) => {
    try {
      await updateTask(s.task_id, { priority: s.suggested_priority });
      toast.success(`Priority updated to ${s.suggested_priority}`);
      setSuggestions((prev) => prev.filter((x) => x.task_id !== s.task_id));
      invalidate();
    } catch {
      toast.error("Failed to apply suggestion");
    }
  };

  const pending = tasks.filter((t) => t.status !== "Completed");
  const completed = tasks.filter((t) => t.status === "Completed");
  const score = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  const ranked = [...pending].sort((a, b) => {
    const pv: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    const pa = pv[a.priority] || 0;
    const pb = pv[b.priority] || 0;
    if (pa !== pb) return pb - pa;
    if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (a.deadline) return -1;
    return 1;
  }).slice(0, 3);

  return (
    <PageWrapper title="Smart AI" subtitle="ML-powered productivity insights">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card relative overflow-hidden text-center py-10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-accent/5 pointer-events-none" />
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block mb-4"
        >
          <Brain size={48} className="text-accent" />
        </motion.div>
        <h2 className="text-xl font-bold mb-2 relative z-10">Your AI Assistant</h2>
        <p className="text-muted text-sm max-w-md mx-auto relative z-10">
          Powered by machine learning trained on your task patterns to help you prioritize and estimate better.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* What to work on */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <h2 className="text-lg font-semibold">What should I work on?</h2>
          </div>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : ranked.length === 0 ? (
            <div className="glass-card text-center text-muted py-10">No pending tasks!</div>
          ) : (
            ranked.map((t, i) => {
              const pred = predictions.find((p) => p.task_id === t.task_id);
              return (
                <motion.div
                  key={t.task_id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-hover p-5 flex items-start gap-4"
                >
                  <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{t.task_name}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${
                        t.priority === "High" ? "bg-danger/20 text-danger" : t.priority === "Medium" ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
                      }`}>
                        {t.priority}
                      </span>
                      {t.deadline && <span>Due: {new Date(t.deadline).toLocaleDateString()}</span>}
                      {t.category && <span>{t.category}</span>}
                    </div>
                    {pred && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-accent">
                        <Clock size={12} />
                        Predicted: {pred.predicted_time}h | {pred.recommendation}
                      </div>
                    )}
                    {predicting && !pred && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted">
                        <Loader2 size={12} className="animate-spin" /> Predicting...
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Productivity Score */}
          <div className="glass-card text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-accent/5 to-transparent pointer-events-none" />
            <TrendingUp size={20} className="mx-auto mb-2 text-accent relative z-10" />
            <p className="text-xs text-muted mb-2 relative z-10">Productivity Score</p>
            <p className="text-4xl font-bold relative z-10">{score}<span className="text-lg text-muted">%</span></p>
            <div className="h-2 bg-white/10 rounded-full mt-4 overflow-hidden relative z-10">
              <motion.div
                className="h-full rounded-full gradient-accent"
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted mt-3 relative z-10">
              {score >= 70 ? "Great job! Keep it up." : score >= 40 ? "Good progress. Focus on high priority tasks." : "Let's get more tasks done!"}
            </p>
          </div>

          {/* Priority Suggestions */}
          <div className="glass-card space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-warning" />
              <h3 className="text-sm font-semibold">Priority Suggestions</h3>
            </div>
            {suggestions.length === 0 ? (
              <p className="text-xs text-muted">No suggestions right now.</p>
            ) : (
              suggestions.slice(0, 4).map((s) => (
                <div key={s.task_id} className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-sm font-medium truncate">{s.task_name}</p>
                  <p className="text-xs text-muted mt-1 flex items-center gap-1">
                    Do this {s.do_this} <ArrowRight size={10} /> <span className="text-accent">{s.suggested_priority}</span>
                    {" "}&mdash; {s.predicted_time}h ({Math.round(s.confidence * 100)}%) &middot; {s.reason}
                  </p>
                  <button
                    onClick={() => applySuggestion(s)}
                    className="mt-2 text-xs px-3 py-1 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-all"
                  >
                    Apply
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default SmartSuggestions;
