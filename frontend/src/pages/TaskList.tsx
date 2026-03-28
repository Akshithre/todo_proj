import React, { useEffect, useState } from "react";
import { Task } from "../types";
import { getTasks, updateTask, deleteTask } from "../services/api";
import TaskCard from "../components/TaskCard";

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  const refresh = () => getTasks().then(setTasks).catch(() => {});

  useEffect(() => {
    refresh();
  }, []);

  const handleComplete = async (id: number) => {
    await updateTask(id, { status: "Completed" });
    refresh();
  };

  const handleDelete = async (id: number) => {
    await deleteTask(id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Tasks</h1>
      {tasks.length === 0 ? (
        <p className="text-gray-400">No tasks yet. Add one!</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <TaskCard
              key={t.task_id}
              task={t}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;
