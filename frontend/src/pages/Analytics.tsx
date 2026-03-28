import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from "recharts";
import { BarChart2, TrendingUp, Brain, Calendar } from "lucide-react";
import { Task } from "../types";
import { getTasks } from "../services/api";
import { SkeletonChart } from "../components/SkeletonLoader";
import PageWrapper from "../components/PageWrapper";
import toast from "react-hot-toast";

const COLORS = ["#F43F5E", "#F59E0B", "#10B981"];
type Range = "week" | "month" | "all";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-xs">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-semibold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// Productivity heatmap for last 7 days
const Heatmap: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const days: { label: string; date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en", { weekday: "short" });
    const count = tasks.filter((t) => {
      if (t.status !== "Completed") return false;
      const created = t.created_at.split("T")[0];
      return created === dateStr;
    }).length;
    days.push({ label, date: dateStr, count });
  }
  const maxCount = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-2 justify-between">
      {days.map((d) => {
        const intensity = d.count / maxCount;
        const bg =
          d.count === 0
            ? "bg-white/5"
            : intensity < 0.33
            ? "bg-accent/20"
            : intensity < 0.66
            ? "bg-accent/40"
            : "bg-accent/70";
        return (
          <div key={d.date} className="flex-1 text-center space-y-1.5">
            <div
              className={`h-16 rounded-lg ${bg} transition-all relative group`}
              title={`${d.count} tasks`}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-bold">{d.count}</span>
              </div>
            </div>
            <span className="text-[10px] text-muted">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const Analytics: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("all");

  useEffect(() => {
    getTasks()
      .then(setTasks)
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const rangeFilter = (t: Task) => {
    if (range === "all") return true;
    const d = new Date(t.created_at);
    if (range === "week") return now.getTime() - d.getTime() < 7 * 86400000;
    return now.getTime() - d.getTime() < 30 * 86400000;
  };
  const filtered = useMemo(() => tasks.filter(rangeFilter), [tasks, range]);

  const completed = filtered.filter((t) => t.status === "Completed");
  const trendMap: Record<string, number> = {};
  completed.forEach((t) => {
    const day = new Date(t.created_at).toLocaleDateString();
    trendMap[day] = (trendMap[day] || 0) + 1;
  });
  const trendData = Object.entries(trendMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const priorityCounts = { High: 0, Medium: 0, Low: 0 };
  filtered.forEach((t) => { if (t.priority in priorityCounts) priorityCounts[t.priority as keyof typeof priorityCounts]++; });
  const pieData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));

  const timeByP: Record<string, { total: number; count: number }> = {};
  completed.forEach((t) => {
    if (t.actual_time != null) {
      if (!timeByP[t.priority]) timeByP[t.priority] = { total: 0, count: 0 };
      timeByP[t.priority].total += t.actual_time;
      timeByP[t.priority].count++;
    }
  });
  const barData = Object.entries(timeByP).map(([priority, d]) => ({
    priority, avg_time: d.count > 0 ? +(d.total / d.count).toFixed(2) : 0,
  }));

  const insights: string[] = [];
  if (completed.length > 0 && filtered.length > 0) {
    const cr = Math.round((completed.length / filtered.length) * 100);
    insights.push(`Your completion rate is ${cr}%.`);
  }
  if (barData.length > 1) {
    const sorted = [...barData].sort((a, b) => a.avg_time - b.avg_time);
    insights.push(`You complete ${sorted[0].priority} priority tasks fastest (avg ${sorted[0].avg_time}h).`);
  }
  const highCount = filtered.filter((t) => t.priority === "High" && t.status !== "Completed").length;
  if (highCount > 0) insights.push(`You have ${highCount} high priority tasks pending.`);
  if (tasks.length > 0) {
    const categories = new Set(tasks.filter((t) => t.category).map((t) => t.category));
    if (categories.size > 0) insights.push(`You work across ${categories.size} categories.`);
  }

  const ranges: { key: Range; label: string }[] = [
    { key: "week", label: "This Week" },
    { key: "month", label: "This Month" },
    { key: "all", label: "All Time" },
  ];

  return (
    <PageWrapper title="Analytics" subtitle="Your productivity insights">
      <div className="flex gap-2">
        {ranges.map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${range === r.key ? "gradient-accent" : "bg-white/5 text-muted hover:text-white hover:bg-white/10"}`}>
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonChart key={i} className={i === 0 ? "lg:col-span-2" : ""} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completion Trend - full width */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="glass-card lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-accent" />
              <h2 className="font-semibold">Completion Trend</h2>
            </div>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={2} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted text-sm text-center py-10">No data yet</p>
            )}
          </motion.div>

          {/* Priority Distribution */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-accent" />
              <h2 className="font-semibold">Priority Distribution</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Avg Time */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card">
            <h2 className="font-semibold mb-4">Avg Completion Time</h2>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <YAxis type="category" dataKey="priority" tick={{ fontSize: 11, fill: "#94A3B8" }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avg_time" radius={[0, 6, 6, 0]}>
                    {barData.map((entry) => (
                      <Cell key={entry.priority} fill={entry.priority === "High" ? COLORS[0] : entry.priority === "Medium" ? COLORS[1] : COLORS[2]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted text-sm text-center py-10">No data yet</p>
            )}
          </motion.div>

          {/* Productivity Heatmap */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-accent" />
              <h2 className="font-semibold">7-Day Heatmap</h2>
            </div>
            <Heatmap tasks={tasks} />
            <div className="flex items-center gap-2 mt-4 justify-end">
              <span className="text-[10px] text-muted">Less</span>
              {["bg-white/5", "bg-accent/20", "bg-accent/40", "bg-accent/70"].map((c) => (
                <div key={c} className={`w-3 h-3 rounded ${c}`} />
              ))}
              <span className="text-[10px] text-muted">More</span>
            </div>
          </motion.div>

          {/* AI Insights */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Brain size={16} className="text-accent" />
              <h2 className="font-semibold">AI Insights</h2>
            </div>
            <div className="space-y-3 relative z-10">
              {insights.length === 0 ? (
                <p className="text-muted text-sm">Complete more tasks to unlock insights.</p>
              ) : (
                insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-accent mt-0.5">&#8226;</span>
                    <span className="text-white/80">{ins}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </PageWrapper>
  );
};

export default Analytics;
