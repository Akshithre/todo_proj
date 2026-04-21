import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, ListTodo, Layers, Search, ShieldAlert,
  ChevronLeft, ChevronRight, Trash2, UserX, UserCheck, Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { User, Organization, Task, Team } from "../types";
import {
  adminGetStats, adminGetOrgs, adminGetUsers, adminGetTasks, adminGetTeams,
  adminChangeUserRole, adminToggleUserActive, adminDeleteUser,
  adminDeleteOrg,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
import InitialsAvatar from "../components/InitialsAvatar";
import toast from "react-hot-toast";
import { format } from "date-fns";

const PAGE_SIZE = 10;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

interface AdminStats {
  total_orgs: number;
  total_users: number;
  total_tasks: number;
  total_teams: number;
}

type TabKey = "users" | "orgs" | "tasks" | "teams";

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const [orgPage, setOrgPage] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [taskPage, setTaskPage] = useState(0);
  const [teamPage, setTeamPage] = useState(0);

  // Guard
  if (user?.role !== "superadmin") {
    return (
      <PageWrapper title="Access Denied" subtitle="You do not have permission to view this page.">
        <div className="text-center py-20">
          <ShieldAlert size={48} className="mx-auto text-danger mb-4" />
          <p className="text-muted">Only superadmins can access the admin panel.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 rounded-lg gradient-accent text-white text-sm font-medium hover:opacity-90 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </PageWrapper>
    );
  }

  const load = async () => {
    setLoading(true);
    try {
      const [s, o, u] = await Promise.all([
        adminGetStats(),
        adminGetOrgs(),
        adminGetUsers(),
      ]);
      setStats(s);
      setOrgs(o);
      setUsers(u);
      // These endpoints may not exist on older deployments — load separately
      try { setTasks(await adminGetTasks(200)); } catch { /* not available yet */ }
      try { setTeams(await adminGetTeams()); } catch { /* not available yet */ }
    } catch {
      toast.error("Failed to load admin data");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  const handleChangeRole = async (userId: number, newRole: string) => {
    try {
      await adminChangeUserRole(userId, newRole);
      toast.success(`Role updated to ${newRole}`);
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to change role");
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      const res = await adminToggleUserActive(userId);
      toast.success(res.detail);
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, is_active: res.is_active } : u));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to toggle user");
    }
  };

  const handleDeleteUser = async (userId: number, name: string) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await adminDeleteUser(userId);
      toast.success("User deleted");
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete user");
    }
  };

  const handleDeleteOrg = async (orgId: number, name: string) => {
    if (!window.confirm(`Delete organization "${name}"? This cannot be undone.`)) return;
    try {
      await adminDeleteOrg(orgId);
      toast.success("Organization deleted");
      setOrgs((prev) => prev.filter((o) => o.org_id !== orgId));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete org");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTasks = tasks.filter(
    (t) =>
      t.task_name.toLowerCase().includes(search.toLowerCase())
  );

  const pagedOrgs = orgs.slice(orgPage * PAGE_SIZE, (orgPage + 1) * PAGE_SIZE);
  const pagedUsers = filteredUsers.slice(userPage * PAGE_SIZE, (userPage + 1) * PAGE_SIZE);
  const pagedTasks = filteredTasks.slice(taskPage * PAGE_SIZE, (taskPage + 1) * PAGE_SIZE);
  const pagedTeams = teams.slice(teamPage * PAGE_SIZE, (teamPage + 1) * PAGE_SIZE);
  const totalOrgPages = Math.ceil(orgs.length / PAGE_SIZE);
  const totalUserPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const totalTaskPages = Math.ceil(filteredTasks.length / PAGE_SIZE);
  const totalTeamPages = Math.ceil(teams.length / PAGE_SIZE);

  const statCards = stats
    ? [
        { label: "Organizations", value: stats.total_orgs, icon: Building2, color: "text-accent" },
        { label: "Users", value: stats.total_users, icon: Users, color: "text-success" },
        { label: "Tasks", value: stats.total_tasks, icon: ListTodo, color: "text-warning" },
        { label: "Teams", value: stats.total_teams, icon: Layers, color: "text-cyan-400" },
      ]
    : [];

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "users", label: "Users", icon: Users },
    { key: "orgs", label: "Organizations", icon: Building2 },
    { key: "tasks", label: "Tasks", icon: ListTodo },
    { key: "teams", label: "Teams", icon: Layers },
  ];

  const Paginator = ({ page, total, setPage }: { page: number; total: number; setPage: (fn: (p: number) => number) => void }) =>
    total > 1 ? (
      <div className="px-5 py-3 border-t border-dark-700 flex items-center justify-between text-xs text-muted">
        <span>Page {page + 1} of {total}</span>
        <div className="flex gap-1">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="p-1 rounded hover:bg-dark-700 disabled:opacity-30 transition"><ChevronLeft size={16} /></button>
          <button onClick={() => setPage((p) => Math.min(total - 1, p + 1))} disabled={page >= total - 1}
            className="p-1 rounded hover:bg-dark-700 disabled:opacity-30 transition"><ChevronRight size={16} /></button>
        </div>
      </div>
    ) : null;

  return (
    <PageWrapper title="Admin Panel" subtitle="System-wide overview and management">
      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-xl p-5 animate-pulse">
              <div className="h-4 w-20 bg-dark-700 rounded mb-3" />
              <div className="h-7 w-14 bg-dark-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <motion.div key={s.label} variants={item} className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted uppercase tracking-wide">{s.label}</span>
                <s.icon size={18} className={s.color} />
              </div>
              <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Tab bar + search */}
      {!loading && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex gap-1 p-1 rounded-lg bg-dark-800/60">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setSearch(""); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
                  activeTab === t.key ? "bg-dark-700 text-white" : "text-muted hover:text-white"
                }`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setUserPage(0); setTaskPage(0); }}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-dark-800 border border-dark-700 focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm transition"
            />
          </div>
        </div>
      )}

      {/* Users Tab */}
      {!loading && activeTab === "users" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-dark-700">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Last Login</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((u) => (
                  <tr key={u.user_id} className="border-b border-dark-800 hover:bg-dark-800/40 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <InitialsAvatar name={u.full_name} size="xs" />
                        <span className="font-medium">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{u.email}</td>
                    <td className="px-5 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.user_id, e.target.value)}
                        disabled={u.user_id === user?.user_id}
                        className="bg-dark-800 border border-dark-700 rounded px-2 py-1 text-xs capitalize focus:border-accent outline-none disabled:opacity-50"
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                        <option value="superadmin">superadmin</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        u.is_active ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                      }`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {u.last_login ? format(new Date(u.last_login), "MMM d, yyyy HH:mm") : "Never"}
                    </td>
                    <td className="px-5 py-3">
                      {u.user_id !== user?.user_id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleActive(u.user_id)}
                            className={`p-1.5 rounded-lg transition ${
                              u.is_active
                                ? "text-muted hover:text-warning hover:bg-warning/10"
                                : "text-muted hover:text-success hover:bg-success/10"
                            }`}
                            title={u.is_active ? "Deactivate" : "Activate"}
                          >
                            {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.user_id, u.full_name)}
                            className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition"
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {pagedUsers.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">
                    {search ? "No users match your search." : "No users found."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginator page={userPage} total={totalUserPages} setPage={setUserPage} />
        </motion.div>
      )}

      {/* Organizations Tab */}
      {!loading && activeTab === "orgs" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-dark-700">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedOrgs.map((o) => (
                  <tr key={o.org_id} className="border-b border-dark-800 hover:bg-dark-800/40 transition">
                    <td className="px-5 py-3 font-medium">{o.name}</td>
                    <td className="px-5 py-3 text-muted">{o.slug}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent capitalize">
                        {o.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        o.is_active ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                      }`}>
                        {o.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {format(new Date(o.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleDeleteOrg(o.org_id, o.name)}
                        className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition"
                        title="Delete organization"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginator page={orgPage} total={totalOrgPages} setPage={setOrgPage} />
        </motion.div>
      )}

      {/* Tasks Tab */}
      {!loading && activeTab === "tasks" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-dark-700">
                  <th className="px-5 py-3">Task</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Creator</th>
                  <th className="px-5 py-3">Assignee</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {pagedTasks.map((t) => (
                  <tr key={t.task_id} className="border-b border-dark-800 hover:bg-dark-800/40 transition">
                    <td className="px-5 py-3 font-medium max-w-[200px] truncate">{t.task_name}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        t.status === "Completed" ? "bg-success/15 text-success"
                        : t.status === "In Progress" ? "bg-accent/15 text-accent"
                        : "bg-dark-700 text-muted"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        t.priority === "High" ? "bg-danger/15 text-danger"
                        : t.priority === "Medium" ? "bg-warning/15 text-warning"
                        : "bg-dark-700 text-muted"
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">{t.creator_name || "-"}</td>
                    <td className="px-5 py-3 text-muted">{t.assignee_name || "-"}</td>
                    <td className="px-5 py-3 text-muted">
                      {format(new Date(t.created_at), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
                {pagedTasks.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">
                    {search ? "No tasks match your search." : "No tasks found."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginator page={taskPage} total={totalTaskPages} setPage={setTaskPage} />
        </motion.div>
      )}

      {/* Teams Tab */}
      {!loading && activeTab === "teams" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-dark-700">
                  <th className="px-5 py-3">Team</th>
                  <th className="px-5 py-3">Members</th>
                  <th className="px-5 py-3">Tasks</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {pagedTeams.map((t) => (
                  <tr key={t.team_id} className="border-b border-dark-800 hover:bg-dark-800/40 transition cursor-pointer"
                    onClick={() => navigate(`/teams/${t.team_id}`)}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                        <span className="font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{t.member_count}</td>
                    <td className="px-5 py-3 text-muted">{t.task_count}</td>
                    <td className="px-5 py-3 text-muted">
                      {format(new Date(t.created_at), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
                {pagedTeams.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">No teams found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginator page={teamPage} total={totalTeamPages} setPage={setTeamPage} />
        </motion.div>
      )}
    </PageWrapper>
  );
};

export default AdminPanel;
