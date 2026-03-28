import React, { useEffect, useState } from "react";
import { Task } from "../types";
import { getTasks } from "../services/api";
import SmartSuggestions from "../components/SmartSuggestions";

const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    getTasks().then(setTasks).catch(() => {});
  }, []);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const pending = tasks.filter((t) => t.status === "Pending").length;
  const highPriority = tasks.filter((t) => t.priority === "High" && t.status !== "Completed").length;

  const stats = [
    { label: "Total Tasks", value: total, color: "bg-blue-500" },
    { label: "Completed", value: completed, color: "bg-green-500" },
    { label: "Pending", value: pending, color: "bg-yellow-500" },
    { label: "High Priority", value: highPriority, color: "bg-red-500" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border p-5">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${s.color}`} />
              <span className="text-3xl font-bold">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Smart Suggestions</h2>
        <SmartSuggestions />
      </div>
    </div>
  );
};

export default Dashboard;
