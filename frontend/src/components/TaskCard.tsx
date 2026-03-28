import React from "react";
import { Task } from "../types";

const priorityColor: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
};

interface Props {
  task: Task;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
}

const TaskCard: React.FC<Props> = ({ task, onComplete, onDelete }) => (
  <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between gap-4">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <h3
          className={`font-semibold truncate ${
            task.status === "Completed" ? "line-through text-gray-400" : ""
          }`}
        >
          {task.task_name}
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[task.priority] || ""}`}>
          {task.priority}
        </span>
      </div>
      <div className="text-sm text-gray-500 flex gap-4 flex-wrap">
        {task.category && <span>Category: {task.category}</span>}
        {task.deadline && (
          <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
        )}
        {task.estimated_time != null && (
          <span>Est: {task.estimated_time}h</span>
        )}
        <span>Status: {task.status}</span>
      </div>
    </div>
    <div className="flex gap-2 shrink-0">
      {task.status !== "Completed" && (
        <button
          onClick={() => onComplete(task.task_id)}
          className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
        >
          Complete
        </button>
      )}
      <button
        onClick={() => onDelete(task.task_id)}
        className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
      >
        Delete
      </button>
    </div>
  </div>
);

export default TaskCard;
