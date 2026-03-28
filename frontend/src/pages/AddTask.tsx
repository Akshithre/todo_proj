import React from "react";
import { useNavigate } from "react-router-dom";
import TaskForm from "../components/TaskForm";
import { createTask } from "../services/api";
import { TaskCreate } from "../types";

const AddTask: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (task: TaskCreate) => {
    await createTask(task);
    navigate("/tasks");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Add New Task</h1>
      <TaskForm onSubmit={handleSubmit} />
    </div>
  );
};

export default AddTask;
