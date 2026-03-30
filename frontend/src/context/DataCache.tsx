import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { Task, PrioritySuggestion, WeeklyDigest } from "../types";
import { getDashboardData, getTasks } from "../services/api";

interface DataCacheCtx {
  tasks: Task[];
  suggestions: PrioritySuggestion[];
  digest: WeeklyDigest | null;
  loading: boolean;
  /** Load dashboard data (tasks + suggestions + digest) in one call */
  loadDashboard: () => Promise<void>;
  /** Load just tasks (for TaskList, Analytics) - uses cache if fresh */
  loadTasks: (params?: { team_id?: number }) => Promise<Task[]>;
  /** Invalidate cache (after create/update/delete) */
  invalidate: () => void;
}

const DataCacheContext = createContext<DataCacheCtx>(null!);

const CACHE_TTL_MS = 30_000; // 30 seconds

export const DataCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [suggestions, setSuggestions] = useState<PrioritySuggestion[]>([]);
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(false);

  const lastDashboardFetch = useRef(0);
  const lastTasksFetch = useRef(0);
  const dashboardPromise = useRef<Promise<void> | null>(null);

  const loadDashboard = useCallback(async () => {
    const now = Date.now();
    // Return cached if fresh
    if (now - lastDashboardFetch.current < CACHE_TTL_MS && tasks.length > 0) {
      return;
    }
    // Dedup concurrent calls
    if (dashboardPromise.current) {
      return dashboardPromise.current;
    }

    setLoading(true);
    dashboardPromise.current = getDashboardData()
      .then((data) => {
        setTasks(data.tasks);
        setSuggestions(data.suggestions);
        setDigest(data.digest);
        lastDashboardFetch.current = Date.now();
        lastTasksFetch.current = Date.now();
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        dashboardPromise.current = null;
      });

    return dashboardPromise.current;
  }, [tasks.length]);

  const loadTasks = useCallback(async (params?: { team_id?: number }) => {
    // If team-specific, always fetch fresh (no cache for filtered views)
    if (params?.team_id) {
      const t = await getTasks(params);
      return t;
    }
    // Use cache if fresh
    const now = Date.now();
    if (now - lastTasksFetch.current < CACHE_TTL_MS && tasks.length > 0) {
      return tasks;
    }
    const t = await getTasks();
    setTasks(t);
    lastTasksFetch.current = Date.now();
    return t;
  }, [tasks]);

  const invalidate = useCallback(() => {
    lastDashboardFetch.current = 0;
    lastTasksFetch.current = 0;
  }, []);

  return (
    <DataCacheContext.Provider value={{ tasks, suggestions, digest, loading, loadDashboard, loadTasks, invalidate }}>
      {children}
    </DataCacheContext.Provider>
  );
};

export const useDataCache = () => useContext(DataCacheContext);
