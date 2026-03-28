import React, { useState } from "react";
import { TaskCreate } from "../types";

interface Props {
  onSubmit: (task: TaskCreate) => void;
}

const TaskForm: React.FC<Props> = ({ onSubmit }) => {
  const [form, setForm] = useState<TaskCreate>({
    task_name: "",
    priority: "Medium",
    deadline: "",
    estimated_time: undefined,
    category: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.task_name.trim()) return;
    onSubmit({
      ...form,
      deadline: form.deadline || undefined,
      estimated_time: form.estimated_time || undefined,
      category: form.category || undefined,
    });
    setForm({ task_name: "", priority: "Medium", deadline: "", estimated_time: undefined, category: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
        <input
          type="text"
          required
          value={form.task_name}
          onChange={(e) => setForm({ ...form, task_name: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Enter task name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
        <select
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
        <input
          type="datetime-local"
          value={form.deadline}
          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <input
          type="text"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Development, Design, Marketing"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Time (hours)</label>
        <input
          type="number"
          step="0.5"
          min="0"
          value={form.estimated_time ?? ""}
          onChange={(e) => setForm({ ...form, estimated_time: e.target.value ? parseFloat(e.target.value) : undefined })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. 2.5"
        />
      </div>

      <button
        type="submit"
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
      >
        Add Task
      </button>
    </form>
  );
};

export default TaskForm;
