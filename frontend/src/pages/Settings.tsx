import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  User, Mail, Shield, Download, Trash2, Moon, Sun,
  Clock, Flag, Bell, ChevronRight, AlertTriangle, Loader2,
} from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import { useAuth } from "../context/AuthContext";
import { getTasks } from "../services/api";
import toast from "react-hot-toast";

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [defaultPriority, setDefaultPriority] = useState(
    () => localStorage.getItem("todo_default_priority") || "Medium"
  );
  const [defaultTime, setDefaultTime] = useState(
    () => Number(localStorage.getItem("todo_default_time") || "2")
  );
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("todo_notifications") !== "false"
  );
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const tasks = await getTasks();
      const headers = ["ID", "Name", "Priority", "Status", "Deadline", "Estimated Time", "Category", "Created"];
      const rows = tasks.map((t) => [
        t.task_id, t.task_name, t.priority, t.status,
        t.deadline || "", t.estimated_time ?? "", t.category || "", t.created_at,
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Tasks exported!");
    } catch {
      toast.error("Failed to export tasks");
    }
    setExporting(false);
  };

  const savePref = (key: string, value: string) => {
    localStorage.setItem(key, value);
    toast.success("Preference saved");
  };

  const handleDeleteAccount = () => {
    localStorage.removeItem("todo_user");
    localStorage.removeItem("todo_registered");
    localStorage.removeItem("todo_default_priority");
    localStorage.removeItem("todo_default_time");
    localStorage.removeItem("todo_notifications");
    toast.success("Account deleted");
    logout();
  };

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">{title}</h2>
      <div className="glass-card space-y-0 divide-y divide-white/5 !p-0 overflow-hidden">
        {children}
      </div>
    </div>
  );

  const Row: React.FC<{
    icon: React.ElementType;
    label: string;
    desc?: string;
    children: React.ReactNode;
  }> = ({ icon: Icon, label, desc, children }) => (
    <div className="flex items-center justify-between px-5 py-4 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Icon size={18} className="text-muted flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {desc && <p className="text-xs text-muted truncate">{desc}</p>}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );

  return (
    <PageWrapper title="Settings" subtitle="Manage your preferences">
      <div className="max-w-2xl space-y-8">
        {/* Profile */}
        <Section title="Profile">
          <Row icon={User} label={user?.name || "User"} desc="Display name">
            <ChevronRight size={16} className="text-muted" />
          </Row>
          <Row icon={Mail} label={user?.email || "email"} desc="Email address">
            <ChevronRight size={16} className="text-muted" />
          </Row>
          <Row icon={Shield} label="Password" desc="Last changed: never">
            <ChevronRight size={16} className="text-muted" />
          </Row>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <Row icon={Flag} label="Default Priority" desc="For new tasks">
            <select
              value={defaultPriority}
              onChange={(e) => {
                setDefaultPriority(e.target.value);
                savePref("todo_default_priority", e.target.value);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </Row>
          <Row icon={Clock} label="Default Estimated Time" desc={`${defaultTime} hours`}>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={defaultTime}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setDefaultTime(v);
                savePref("todo_default_time", String(v));
              }}
              className="w-24 accent-accent"
            />
          </Row>
          <Row icon={Bell} label="Notifications" desc="Toast notifications">
            <button
              onClick={() => {
                const next = !notifications;
                setNotifications(next);
                savePref("todo_notifications", String(next));
              }}
              className={`w-11 h-6 rounded-full transition-colors relative ${notifications ? "bg-accent" : "bg-white/20"}`}
            >
              <motion.div
                className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                animate={{ left: notifications ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </Row>
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <Row icon={darkMode ? Moon : Sun} label="Theme" desc={darkMode ? "Dark mode" : "Light mode"}>
            <button
              onClick={() => {
                setDarkMode(!darkMode);
                toast("Theme toggle is cosmetic in this demo", { icon: "🎨" });
              }}
              className={`w-11 h-6 rounded-full transition-colors relative ${darkMode ? "bg-accent" : "bg-white/20"}`}
            >
              <motion.div
                className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                animate={{ left: darkMode ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </Row>
        </Section>

        {/* Data */}
        <Section title="Data">
          <Row icon={Download} label="Export Tasks" desc="Download as CSV file">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-1.5 rounded-lg bg-accent/20 text-accent text-xs font-semibold hover:bg-accent/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Export
            </button>
          </Row>
        </Section>

        {/* Danger Zone */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-danger uppercase tracking-wider">Danger Zone</h2>
          <div className="glass-card !border-danger/20 !p-0 overflow-hidden">
            <Row icon={Trash2} label="Delete Account" desc="Permanently remove all data">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-1.5 rounded-lg bg-danger/20 text-danger text-xs font-semibold hover:bg-danger/30 transition-all"
              >
                Delete
              </button>
            </Row>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass p-6 max-w-sm w-full space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center">
                <AlertTriangle size={20} className="text-danger" />
              </div>
              <div>
                <h3 className="font-bold">Delete Account</h3>
                <p className="text-xs text-muted">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-muted">
              All your tasks, preferences, and account data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-semibold hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 rounded-xl bg-danger text-sm font-semibold hover:bg-danger/90 transition-all"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
};

export default Settings;
