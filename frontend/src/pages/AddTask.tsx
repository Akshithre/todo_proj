import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Minus, ArrowDown, Clock, Tag, Calendar, Type, Loader2, Sparkles } from "lucide-react";
import { createTask } from "../services/api";
import { TaskCreate } from "../types";
import PageWrapper from "../components/PageWrapper";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";

const priorities = [
  { value: "Low", label: "Low", color: "border-success text-success bg-success/10", icon: ArrowDown, desc: "No rush" },
  { value: "Medium", label: "Medium", color: "border-warning text-warning bg-warning/10", icon: Minus, desc: "This week" },
  { value: "High", label: "High", color: "border-danger text-danger bg-danger/10", icon: Flame, desc: "Urgent" },
];

const AddTask: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<TaskCreate>({ task_name: "", priority: "Medium", deadline: "", estimated_time: undefined, category: "" });
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(() => {
    let p = 0;
    if (form.task_name.trim()) p += 35;
    if (form.priority) p += 20;
    if (form.deadline) p += 20;
    if (form.estimated_time) p += 15;
    if (form.category) p += 10;
    return p;
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.task_name.trim()) { toast.error("Task name is required"); return; }
    setSubmitting(true);
    try {
      await createTask({
        ...form,
        deadline: form.deadline || undefined,
        estimated_time: form.estimated_time || undefined,
        category: form.category || undefined,
      });
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      toast.success("Task created!");
      setTimeout(() => navigate("/tasks"), 400);
    } catch {
      toast.error("Failed to create task");
    }
    setSubmitting(false);
  };

  return (
    <PageWrapper title="Add New Task" subtitle="Fill in the details below">
      {/* Progress */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted">Completion</span>
          <span className="text-xs font-semibold text-accent">{progress}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full gradient-accent"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">
          {/* Task name */}
          <div className="glass-card space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
              <Type size={12} /> Task Name
            </label>
            <input
              type="text"
              required
              value={form.task_name}
              onChange={(e) => setForm({ ...form, task_name: e.target.value })}
              placeholder="What needs to be done?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          {/* Priority picker */}
          <div className="glass-card space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
              <Flame size={12} /> Priority
            </label>
            <div className="grid grid-cols-3 gap-3">
              {priorities.map((p) => (
                <motion.button
                  key={p.value}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p.value })}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    form.priority === p.value ? p.color : "border-white/10 text-muted bg-white/5 hover:border-white/20"
                  }`}
                >
                  <p.icon size={20} className="mx-auto mb-1.5" />
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{p.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Deadline + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-card space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
                <Calendar size={12} /> Deadline
              </label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all [color-scheme:dark]"
              />
            </div>
            <div className="glass-card space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
                <Clock size={12} /> Estimated Time
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={form.estimated_time ?? 0}
                  onChange={(e) => setForm({ ...form, estimated_time: parseFloat(e.target.value) || undefined })}
                  className="flex-1 accent-accent"
                />
                <span className="text-sm font-semibold w-12 text-right">{form.estimated_time ?? 0}h</span>
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="glass-card space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
              <Tag size={12} /> Category
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Development, Design, Marketing"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-xl font-semibold text-sm gradient-accent hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={16} />}
            {submitting ? "Creating..." : "Create Task"}
          </motion.button>
        </form>

        {/* Live preview */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Live Preview</h3>
          <motion.div
            layout
            className={`glass-card border-l-[3px] ${
              form.priority === "High" ? "border-l-danger" : form.priority === "Medium" ? "border-l-warning" : "border-l-success"
            }`}
          >
            <p className="font-medium text-sm">{form.task_name || "Task name..."}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted flex-wrap">
              <span className={`px-2 py-0.5 rounded-full font-semibold ${
                priorities.find((p) => p.value === form.priority)?.color.split(" ").slice(0, 2).join(" ") || ""
              }`}>
                {form.priority}
              </span>
              {form.deadline && <span>{new Date(form.deadline).toLocaleDateString()}</span>}
              {form.estimated_time ? <span>{form.estimated_time}h</span> : null}
              {form.category && <span className="bg-white/5 px-2 py-0.5 rounded-md">{form.category}</span>}
            </div>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default AddTask;
