import axios from "axios";
import {
  Task, TaskCreate, PrioritySuggestion, TimePrediction,
  User, Organization, Team, TeamDetail, TeamMember,
  Comment, Reaction, Notification, Activity,
  OrgStats, WorkloadItem, WeeklyDigest,
} from "../types";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || `http://${window.location.hostname}:8001`,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url?.includes("/auth/")) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const authRegister = (data: {
  full_name: string; email: string; password: string;
  org_name?: string; invite_token?: string;
}) => api.post("/auth/register", data).then((r) => r.data);

export const authLogin = (email: string, password: string) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);

export const authRefresh = (refresh_token: string) =>
  api.post("/auth/refresh", { refresh_token }).then((r) => r.data);

export const authMe = () =>
  api.get<User>("/auth/me").then((r) => r.data);

export const authUpdateMe = (data: { full_name?: string; avatar_url?: string }) =>
  api.put<User>("/auth/me", data).then((r) => r.data);

export const authChangePassword = (current_password: string, new_password: string) =>
  api.post("/auth/change-password", { current_password, new_password }).then((r) => r.data);

// ── Tasks ─────────────────────────────────────────────────────────────────
export const createTask = (task: TaskCreate) =>
  api.post<Task>("/tasks", task).then((r) => r.data);

export const getTasks = (params?: {
  team_id?: number; assigned_to?: number; status?: string; archived?: boolean;
}) => api.get<Task[]>("/tasks", { params }).then((r) => r.data);

export const getTask = (id: number) =>
  api.get<Task>(`/tasks/${id}`).then((r) => r.data);

export const updateTask = (id: number, data: Partial<Task>) =>
  api.put<Task>(`/tasks/${id}`, data).then((r) => r.data);

export const deleteTask = (id: number) =>
  api.delete(`/tasks/${id}`).then((r) => r.data);

export const duplicateTask = (id: number) =>
  api.post<Task>(`/tasks/${id}/duplicate`).then((r) => r.data);

export const bulkAssign = (task_ids: number[], assigned_to: number) =>
  api.post("/tasks/bulk-assign", task_ids, { params: { assigned_to } }).then((r) => r.data);

export const getSuggestions = () =>
  api.get<{ suggestions: PrioritySuggestion[] }>("/tasks/suggestions").then((r) => r.data.suggestions);

export const predictTime = (id: number) =>
  api.get<TimePrediction>(`/tasks/${id}/predict-time`).then((r) => r.data);

// ── Organizations ─────────────────────────────────────────────────────────
export const getMyOrg = () =>
  api.get<Organization>("/organizations/me").then((r) => r.data);

export const updateMyOrg = (data: { name?: string; description?: string; logo_url?: string }) =>
  api.put<Organization>("/organizations/me", data).then((r) => r.data);

export const getOrgStats = () =>
  api.get<OrgStats>("/organizations/me/stats").then((r) => r.data);

export const getOrgMembers = () =>
  api.get<User[]>("/organizations/me/members").then((r) => r.data);

export const inviteMember = (email: string, team_id?: number) =>
  api.post("/organizations/me/invite", { email, team_id }).then((r) => r.data);

export const getOrgActivity = (limit?: number) =>
  api.get<Activity[]>("/organizations/me/activity", { params: { limit } }).then((r) => r.data);

// ── Teams ─────────────────────────────────────────────────────────────────
export const getTeams = () =>
  api.get<Team[]>("/teams").then((r) => r.data);

export const createTeam = (data: { name: string; description?: string; color?: string; icon?: string }) =>
  api.post<Team>("/teams", data).then((r) => r.data);

export const getTeam = (id: number) =>
  api.get<TeamDetail>(`/teams/${id}`).then((r) => r.data);

export const updateTeam = (id: number, data: { name?: string; description?: string; color?: string; icon?: string }) =>
  api.put<Team>(`/teams/${id}`, data).then((r) => r.data);

export const deleteTeam = (id: number) =>
  api.delete(`/teams/${id}`).then((r) => r.data);

export const addTeamMember = (teamId: number, email: string, role?: string) =>
  api.post(`/teams/${teamId}/members`, { email, role }).then((r) => r.data);

export const removeTeamMember = (teamId: number, userId: number) =>
  api.delete(`/teams/${teamId}/members/${userId}`).then((r) => r.data);

export const getTeamWorkload = (teamId: number) =>
  api.get<WorkloadItem[]>(`/teams/${teamId}/workload`).then((r) => r.data);

export const getTeamActivity = (teamId: number, limit?: number) =>
  api.get<Activity[]>(`/teams/${teamId}/activity`, { params: { limit } }).then((r) => r.data);

// ── Comments ──────────────────────────────────────────────────────────────
export const getComments = (taskId: number) =>
  api.get<Comment[]>(`/tasks/${taskId}/comments`).then((r) => r.data);

export const addComment = (taskId: number, content: string, parent_id?: number) =>
  api.post<Comment>(`/tasks/${taskId}/comments`, { content, parent_id }).then((r) => r.data);

export const updateComment = (taskId: number, commentId: number, content: string) =>
  api.put<Comment>(`/tasks/${taskId}/comments/${commentId}`, { content }).then((r) => r.data);

export const deleteComment = (taskId: number, commentId: number) =>
  api.delete(`/tasks/${taskId}/comments/${commentId}`).then((r) => r.data);

// ── Reactions ─────────────────────────────────────────────────────────────
export const getReactions = (taskId: number) =>
  api.get<Reaction[]>(`/tasks/${taskId}/reactions`).then((r) => r.data);

export const addReaction = (taskId: number, emoji: string) =>
  api.post(`/tasks/${taskId}/reactions`, { emoji }).then((r) => r.data);

export const removeReaction = (taskId: number, emoji: string) =>
  api.delete(`/tasks/${taskId}/reactions/${emoji}`).then((r) => r.data);

// ── Notifications ─────────────────────────────────────────────────────────
export const getNotifications = (limit?: number) =>
  api.get<Notification[]>("/notifications", { params: { limit } }).then((r) => r.data);

export const getUnreadCount = () =>
  api.get<{ count: number }>("/notifications/unread-count").then((r) => r.data);

export const markRead = (id: number) =>
  api.put(`/notifications/${id}/read`).then((r) => r.data);

export const markAllRead = () =>
  api.put("/notifications/read-all").then((r) => r.data);

// ── AI / Analytics ────────────────────────────────────────────────────────
export const getWeeklyDigest = () =>
  api.get<WeeklyDigest>("/ai/weekly-digest").then((r) => r.data);

// ── Dashboard (combined endpoint) ────────────────────────────────────────
export interface DashboardData {
  tasks: Task[];
  suggestions: PrioritySuggestion[];
  digest: WeeklyDigest;
}
export const getDashboardData = () =>
  api.get<DashboardData>("/dashboard").then((r) => r.data);

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminGetStats = () =>
  api.get("/admin/stats").then((r) => r.data);

export const adminGetOrgs = () =>
  api.get<Organization[]>("/admin/organizations").then((r) => r.data);

export const adminGetUsers = () =>
  api.get<User[]>("/admin/users").then((r) => r.data);
