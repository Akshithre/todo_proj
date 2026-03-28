import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from "recharts";
import { Task } from "../types";
import { getTasks } from "../services/api";

const COLORS = ["#ef4444", "#f59e0b", "#22c55e"];

const Analytics: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    getTasks().then(setTasks).catch(() => {});
  }, []);

  // Completion trend: tasks completed per day
  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const trendMap: Record<string, number> = {};
  completedTasks.forEach((t) => {
    const day = new Date(t.created_at).toLocaleDateString();
    trendMap[day] = (trendMap[day] || 0) + 1;
  });
  const trendData = Object.entries(trendMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Priority distribution
  const priorityCounts = { High: 0, Medium: 0, Low: 0 };
  tasks.forEach((t) => {
    if (t.priority in priorityCounts) {
      priorityCounts[t.priority as keyof typeof priorityCounts]++;
    }
  });
  const pieData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));

  // Average completion time by priority
  const timeByPriority: Record<string, { total: number; count: number }> = {};
  completedTasks.forEach((t) => {
    if (t.actual_time != null) {
      if (!timeByPriority[t.priority]) timeByPriority[t.priority] = { total: 0, count: 0 };
      timeByPriority[t.priority].total += t.actual_time;
      timeByPriority[t.priority].count++;
    }
  });
  const barData = Object.entries(timeByPriority).map(([priority, d]) => ({
    priority,
    avg_time: d.count > 0 ? +(d.total / d.count).toFixed(2) : 0,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Trend */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Task Completion Trend</h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No completed tasks to chart yet.</p>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Priority Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Average Completion Time */}
        <div className="bg-white rounded-xl shadow-sm border p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Average Completion Time by Priority</h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Bar dataKey="avg_time" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No completion time data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
