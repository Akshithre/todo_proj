export interface Task {
  task_id: number;
  task_name: string;
  priority: string;
  deadline: string | null;
  estimated_time: number | null;
  actual_time: number | null;
  status: string;
  category: string | null;
  description: string | null;
  created_at: string;
  user_id: number | null;
  assigned_to: number | null;
  team_id: number | null;
  org_id: number | null;
  depends_on_id: number | null;
  is_archived: boolean;
  creator_name: string | null;
  assignee_name: string | null;
  comment_count: number;
  reaction_counts: Record<string, number>;
}

export interface TaskCreate {
  task_name: string;
  priority: string;
  deadline?: string;
  estimated_time?: number;
  category?: string;
  description?: string;
  team_id?: number;
  assigned_to?: number;
  depends_on_id?: number;
}

export interface PrioritySuggestion {
  task_id: number;
  task_name: string;
  suggested_priority: string;
  reason: string;
  predicted_time: number;
  confidence: number;
  do_this: string;
}

export interface TimePrediction {
  task_id: number;
  task_name: string;
  predicted_time: number;
  confidence: number;
  your_estimate: number | null;
  recommendation: string;
}

export interface User {
  user_id: number;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  org_id: number | null;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface Organization {
  org_id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  plan: string;
  created_at: string;
  is_active: boolean;
}

export interface Team {
  team_id: number;
  org_id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_at: string;
  member_count: number;
  task_count: number;
}

export interface TeamDetail extends Team {
  members: TeamMember[];
}

export interface TeamMember {
  id: number;
  user_id: number;
  role: string;
  joined_at: string;
  user?: User;
}

export interface Comment {
  comment_id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  parent_id: number | null;
  user_name: string | null;
  user_avatar: string | null;
  replies: Comment[];
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  reacted_by_me: boolean;
}

export interface Notification {
  notification_id: number;
  user_id: number;
  type: string;
  title: string;
  message: string | null;
  task_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface Activity {
  log_id: number;
  user_id: number;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  metadata_json: Record<string, any> | null;
  created_at: string;
  user_name: string | null;
}

export interface OrgStats {
  member_count: number;
  team_count: number;
  task_count: number;
  completed_count: number;
}

export interface WorkloadItem {
  user_id: number;
  full_name: string;
  avatar_url: string | null;
  pending_tasks: number;
  completed_tasks: number;
  total_estimated_hours: number;
}

export interface WeeklyDigest {
  period: string;
  completed: number;
  created: number;
  pending: number;
  overdue: number;
  top_contributors: { name: string; completed: number }[];
  insights: string[];
}
