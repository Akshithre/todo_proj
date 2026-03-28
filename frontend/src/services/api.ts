import axios from "axios";
import { Task, TaskCreate, PrioritySuggestion, TimePrediction } from "../types";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
});

export const createTask = (task: TaskCreate) =>
  api.post<Task>("/tasks", task).then((r) => r.data);

export const getTasks = () =>
  api.get<Task[]>("/tasks").then((r) => r.data);

export const updateTask = (id: number, data: Partial<Task>) =>
  api.put<Task>(`/tasks/${id}`, data).then((r) => r.data);

export const deleteTask = (id: number) =>
  api.delete(`/tasks/${id}`).then((r) => r.data);

export const getSuggestions = () =>
  api.get<PrioritySuggestion[]>("/tasks/suggestions").then((r) => r.data);

export const predictTime = (id: number) =>
  api.get<TimePrediction>(`/tasks/${id}/predict-time`).then((r) => r.data);
