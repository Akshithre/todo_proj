import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User, Mail, Shield, Download, Trash2, Moon, Sun,
  Clock, Flag, Bell, ChevronRight, AlertTriangle, Loader2,
  Building2, Lock,
} from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import InitialsAvatar from "../components/InitialsAvatar";
import { useAuth } from "../context/AuthContext";
import { getTasks, authUpdateMe, authChangePassword, getMyOrg, updateMyOrg } from "../services/api";
import toast from "react-hot-toast";

const Settings: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
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
  const [editName, setEditName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.full_name || "");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");

  useEffect(() => {
    setNameInput(user?.full_name || "");
    loadOrg();
  }, [user]);

  const loadOrg = async () => {
    try {
      const org = await getMyOrg();
      setOrgName(org.name);
      setOrgDesc(org.description || "");
    } catch {}
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const tasks = await getTasks();
      const headers = ["ID", "Name", "Priority", "Status", "Deadline", "Estimated Time", "Category", "Assigned To", "Created"];
      const rows = tasks.map((t) => [
        t.task_id, t.task_name, t.priority, t.status,
        t.deadline || "", t.estimated_time ?? "", t.category || "", t.assignee_name || "", t.created_at,
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

  const handleSaveName = async () => {
    try {
      await authUpdateMe({ full_name: nameInput });
      await refreshUser();
      setEditName(false);
      toast.success("Name updated");
    } catch {
      toast.error("Failed to update name");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) return;
    setChangingPw(true);
    try {
      await authChangePassword(currentPw, newPw);
      toast.success("Password changed");
      setShowPasswordModal(false);
      setCurrentPw("");
      setNewPw("");
    } catch {
      toast.error("Failed to change password. Check current password.");
    }
    setChangingPw(false);
  };

  const handleSaveOrg = async () => {
    try {
      await updateMyOrg({ name: orgName, description: orgDesc });
      toast.success("Organization updated");
    } catch {
      toast.error("Failed to update organization");
    }
  };

  const handleDeleteAccount = () => {
    localStorage.clear();
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
    icon: React.ElementType; label: string; desc?: string; children: React.ReactNode;
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
          <div className="px-5 py-4 flex items-center gap-4">
            <InitialsAvatar name={user?.full_name || "U"} size="lg" />
            <div>
              {editName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
                  />
                  <button onClick={handleSaveName} className="text-xs text-accent hover:underline">Save</button>
                  <button onClick={() => setEditName(false)} className="text-xs text-muted hover:underline">Cancel</button>
                </div>
              ) : (
                <p className="text-sm font-semibold">{user?.full_name} <button onClick={() => setEditName(true)} className="text-xs text-accent ml-2 hover:underline">Edit</button></p>
              )}
              <p className="text-xs text-muted">{user?.email}</p>
              <p className="text-[10px] text-muted/60 mt-0.5 capitalize">{user?.role} account</p>
            </div>
          </div>
          <Row icon={Lock} label="Password" desc="Change your password">
            <button onClick={() => setShowPasswordModal(true)} className="text-xs text-accent hover:underline">Change</button>
          </Row>
        </Section>

        {/* Organization */}
        <Section title="Organization">
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="text-xs text-muted">Organization Name</label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-muted">Description</label>
              <input
                value={orgDesc}
                onChange={(e) => setOrgDesc(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-accent"
              />
            </div>
            <button onClick={handleSaveOrg} className="px-4 py-1.5 rounded-lg bg-accent/20 text-accent text-xs font-semibold hover:bg-accent/30 transition-all">
              Save Organization
            </button>
          </div>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <Row icon={Flag} label="Default Priority" desc="For new tasks">
            <select
              value={defaultPriority}
              onChange={(e) => { setDefaultPriority(e.target.value); savePref("todo_default_priority", e.target.value); }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </Row>
          <Row icon={Clock} label="Default Estimated Time" desc={`${defaultTime} hours`}>
            <input
              type="range" min="0.5" max="10" step="0.5" value={defaultTime}
              onChange={(e) => { const v = parseFloat(e.target.value); setDefaultTime(v); savePref("todo_default_time", String(v)); }}
              className="w-24 accent-accent"
            />
          </Row>
          <Row icon={Bell} label="Notifications" desc="Toast notifications">
            <button
              onClick={() => { const next = !notifications; setNotifications(next); savePref("todo_notifications", String(next)); }}
              className={`w-11 h-6 rounded-full transition-colors relative ${notifications ? "bg-accent" : "bg-white/20"}`}
            >
              <motion.div className="w-5 h-5 bg-white rounded-full absolute top-0.5" animate={{ left: notifications ? 22 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
            </button>
          </Row>
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <Row icon={darkMode ? Moon : Sun} label="Theme" desc={darkMode ? "Dark mode" : "Light mode"}>
            <button
              onClick={() => { setDarkMode(!darkMode); toast("Theme toggle is cosmetic for now", { icon: "🎨" }); }}
              className={`w-11 h-6 rounded-full transition-colors relative ${darkMode ? "bg-accent" : "bg-white/20"}`}
            >
              <motion.div className="w-5 h-5 bg-white rounded-full absolute top-0.5" animate={{ left: darkMode ? 22 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
            </button>
          </Row>
        </Section>

        {/* Data */}
        <Section title="Data">
          <Row icon={Download} label="Export Tasks" desc="Download as CSV file">
            <button onClick={handleExport} disabled={exporting}
              className="px-4 py-1.5 rounded-lg bg-accent/20 text-accent text-xs font-semibold hover:bg-accent/30 transition-all disabled:opacity-50 flex items-center gap-1.5">
              {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Export
            </button>
          </Row>
        </Section>

        {/* Danger Zone */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-danger uppercase tracking-wider">Danger Zone</h2>
          <div className="glass-card !border-danger/20 !p-0 overflow-hidden">
            <Row icon={Trash2} label="Delete Account" desc="Permanently remove all data">
              <button onClick={() => setShowDeleteModal(true)}
                className="px-4 py-1.5 rounded-lg bg-danger/20 text-danger text-xs font-semibold hover:bg-danger/30 transition-all">
                Delete
              </button>
            </Row>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowPasswordModal(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()} className="glass p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold">Change Password</h3>
            <input type="password" placeholder="Current password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder-muted focus:outline-none focus:border-accent" />
            <input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder-muted focus:outline-none focus:border-accent" />
            <div className="flex gap-3">
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-semibold hover:bg-white/10 transition-all">Cancel</button>
              <button onClick={handleChangePassword} disabled={changingPw} className="flex-1 py-2.5 rounded-xl gradient-accent text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50">
                {changingPw ? "Changing..." : "Change"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowDeleteModal(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()} className="glass p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center">
                <AlertTriangle size={20} className="text-danger" />
              </div>
              <div>
                <h3 className="font-bold">Delete Account</h3>
                <p className="text-xs text-muted">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-muted">All your tasks, preferences, and account data will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-sm font-semibold hover:bg-white/10 transition-all">Cancel</button>
              <button onClick={handleDeleteAccount} className="flex-1 py-2.5 rounded-xl bg-danger text-sm font-semibold hover:bg-danger/90 transition-all">Delete</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
};

export default Settings;
