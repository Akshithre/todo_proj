import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, ListTodo, Layers, Search, ShieldAlert,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { User, Organization } from "../types";
import { adminGetStats, adminGetOrgs, adminGetUsers } from "../services/api";
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

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgPage, setOrgPage] = useState(0);
  const [userPage, setUserPage] = useState(0);

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
    } catch {
      toast.error("Failed to load admin data");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const pagedOrgs = orgs.slice(orgPage * PAGE_SIZE, (orgPage + 1) * PAGE_SIZE);
  const pagedUsers = filteredUsers.slice(userPage * PAGE_SIZE, (userPage + 1) * PAGE_SIZE);
  const totalOrgPages = Math.ceil(orgs.length / PAGE_SIZE);
  const totalUserPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  const statCards = stats
    ? [
        { label: "Organizations", value: stats.total_orgs, icon: Building2, color: "text-accent" },
        { label: "Users", value: stats.total_users, icon: Users, color: "text-success" },
        { label: "Tasks", value: stats.total_tasks, icon: ListTodo, color: "text-warning" },
        { label: "Teams", value: stats.total_teams, icon: Layers, color: "text-cyan-400" },
      ]
    : [];

  return (
    <PageWrapper title="Admin Panel" subtitle="System-wide overview">
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
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
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

      {/* Organizations table */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-dark-700">
            <h3 className="font-semibold flex items-center gap-2">
              <Building2 size={16} className="text-accent" /> Organizations
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-dark-700">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
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
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          o.is_active
                            ? "bg-success/15 text-success"
                            : "bg-danger/15 text-danger"
                        }`}
                      >
                        {o.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {format(new Date(o.created_at), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalOrgPages > 1 && (
            <div className="px-5 py-3 border-t border-dark-700 flex items-center justify-between text-xs text-muted">
              <span>
                Page {orgPage + 1} of {totalOrgPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setOrgPage((p) => Math.max(0, p - 1))}
                  disabled={orgPage === 0}
                  className="p-1 rounded hover:bg-dark-700 disabled:opacity-30 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setOrgPage((p) => Math.min(totalOrgPages - 1, p + 1))}
                  disabled={orgPage >= totalOrgPages - 1}
                  className="p-1 rounded hover:bg-dark-700 disabled:opacity-30 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Users table */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card rounded-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-dark-700 flex items-center justify-between gap-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users size={16} className="text-success" /> Users
            </h3>
            <div className="relative max-w-xs w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setUserPage(0);
                }}
                placeholder="Search users..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-dark-800 border border-dark-700 focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm transition"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-dark-700">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Last Login</th>
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
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          u.role === "superadmin"
                            ? "bg-danger/15 text-danger"
                            : u.role === "admin"
                            ? "bg-accent/15 text-accent"
                            : "bg-dark-700 text-muted"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          u.is_active
                            ? "bg-success/15 text-success"
                            : "bg-danger/15 text-danger"
                        }`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {u.last_login
                        ? format(new Date(u.last_login), "MMM d, yyyy HH:mm")
                        : "Never"}
                    </td>
                  </tr>
                ))}
                {pagedUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted">
                      {search ? "No users match your search." : "No users found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalUserPages > 1 && (
            <div className="px-5 py-3 border-t border-dark-700 flex items-center justify-between text-xs text-muted">
              <span>
                Showing {userPage * PAGE_SIZE + 1}-
                {Math.min((userPage + 1) * PAGE_SIZE, filteredUsers.length)} of{" "}
                {filteredUsers.length}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                  disabled={userPage === 0}
                  className="p-1 rounded hover:bg-dark-700 disabled:opacity-30 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setUserPage((p) => Math.min(totalUserPages - 1, p + 1))}
                  disabled={userPage >= totalUserPages - 1}
                  className="p-1 rounded hover:bg-dark-700 disabled:opacity-30 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </PageWrapper>
  );
};

export default AdminPanel;
