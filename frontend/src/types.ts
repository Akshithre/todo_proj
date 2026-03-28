export interface Task {
  task_id: number;
  task_name: string;
  priority: string;
  deadline: string | null;
  estimated_time: number | null;
  actual_time: number | null;
  status: string;
  category: string | null;
  created_at: string;
}

export interface TaskCreate {
  task_name: string;
  priority: string;
  deadline?: string;
  estimated_time?: number;
  category?: string;
}

export interface PrioritySuggestion {
  task_id: number;
  task_name: string;
  current_priority: string;
  suggested_priority: string;
  reason: string;
}

export interface TimePrediction {
  task_id: number;
  predicted_time: number;
  confidence: number;
}
