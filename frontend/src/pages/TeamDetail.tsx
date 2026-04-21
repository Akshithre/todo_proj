import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, ListTodo, Activity as ActivityIcon, Plus, Trash2, UserPlus,
  ArrowLeft, Hash, Briefcase, Code, Palette, Zap, Target, Star,
  Heart, Shield, Globe, Layers, ExternalLink, Mail,
} from "lucide-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { TeamDetail as TeamDetailType, WorkloadItem, Activity } from "../types";
import {
  getTeam, addTeamMember, removeTeamMember, getTeamWorkload, getTeamActivity,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import InitialsAvatar from "../components/InitialsAvatar";
import PageWrapper from "../components/PageWrapper";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

const ICON_MAP: Record<string, any> = {
  hash: Hash, briefcase: Briefcase, code: Code, palette: Palette,
  zap: Zap, target: Target, star: Star, heart: Heart,
  shield: Shield, globe: Globe, layers: Layers, users: Users,
};

const TABS = ["Members", "Tasks", "Activity"] as const;
type Tab = typeof TABS[number];

const roleBadge: Record<string, string> = {
  admin: "bg-accent/20 text-accent border-accent/30",
  member: "bg-dark-700 text-muted border-dark-600",
  owner: "bg-warning/20 text-warning border-warning/30",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [team, setTeam] = useState<TeamDetailType | null>(null);
  const [workload, setWorkload] = useState<WorkloadItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Members");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const teamId = Number(id);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const load = async () => {
    setLoading(true);
    try {
      const [t, w, a] = await Promise.all([
        getTeam(teamId),
        getTeamWorkload(teamId),
        getTeamActivity(teamId, 30),
      ]);
      setTeam(t);
      setWorkload(w);
      setActivities(a);
    } catch {
      toast.error("Failed to load team");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (teamId) load();
  }, [teamId]); // eslint-disable-line

  const handleAddMember = async () => {
    if (!email.trim()) return;
    setAdding(true);
    try {
      await addTeamMember(teamId, email.trim());
      toast.success("Member added!");
      load();
      setEmail("");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail === "Already a member") {
        toast.error("This user is already a member of this team.");
      } else {
        toast.error(detail || "Failed to add member");
      }
    }
    setAdding(false);
  };

  const handleRemove = async (userId: number, name: string) => {
    if (!window.confirm(`Remove ${name} from the team?`)) return;
    try {
      await removeTeamMember(teamId, userId);
      toast.success("Member removed");
      load();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Team" subtitle="Loading...">
        <div className="space-y-4 animate-pulse">
          <div className="glass-card rounded-xl p-6">
            <div className="h-6 w-48 bg-dark-700 rounded mb-2" />
            <div className="h-4 w-72 bg-dark-700 rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-dark-700" />
                  <div>
                    <div className="h-4 w-24 bg-dark-700 rounded mb-1" />
                    <div className="h-3 w-16 bg-dark-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!team) {
    return (
      <PageWrapper title="Team Not Found" subtitle="This team does not exist.">
        <button
          onClick={() => navigate("/teams")}
          className="flex items-center gap-2 text-accent text-sm hover:underline"
        >
          <ArrowLeft size={14} /> Back to Teams
        </button>
      </PageWrapper>
    );
  }

  const Icon = ICON_MAP[team.icon] || Hash;
  const maxWorkload = Math.max(...workload.map((w) => w.pending_tasks + w.completed_tasks), 1);

  return (
    <PageWrapper
      title={team.name}
      subtitle={team.description || "Team workspace"}
      actions={
        <button
          onClick={() => navigate("/teams")}
          className="flex items-center gap-2 text-sm text-muted hover:text-white transition"
        >
          <ArrowLeft size={14} /> All Teams
        </button>
      }
    >
      {/* Header card */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: team.color }} />
        <div className="p-5 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: team.color + "22" }}
          >
            <Icon size={24} style={{ color: team.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold">{team.name}</h2>
            {team.description && (
              <p className="text-muted text-sm mt-0.5">{team.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Users size={14} /> {team.member_count}
            </span>
            <span className="flex items-center gap-1">
              <ListTodo size={14} /> {team.task_count}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-dark-800/60 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              if (tab === "Tasks") {
                navigate(`/tasks?team_id=${teamId}`);
                return;
              }
              setActiveTab(tab);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
              activeTab === tab && tab !== "Tasks"
                ? "bg-dark-700 text-white"
                : "text-muted hover:text-white"
            }`}
          >
            {tab === "Members" && <Users size={14} />}
            {tab === "Tasks" && <ExternalLink size={14} />}
            {tab === "Activity" && <ActivityIcon size={14} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {activeTab === "Members" && (
        <div className="space-y-6">
          {/* Add member */}
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                placeholder="Add member by email..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-dark-800 border border-dark-700 focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm transition"
              />
            </div>
            <button
              onClick={handleAddMember}
              disabled={adding || !email.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-accent text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              <UserPlus size={15} /> {adding ? "Adding..." : "Add"}
            </button>
          </div>

          {/* Member cards */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {team.members.map((m) => (
              <motion.div
                key={m.id}
                variants={item}
                className="glass-card rounded-xl p-4 flex items-center gap-3"
              >
                <InitialsAvatar
                  name={m.user?.full_name || "User"}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {m.user?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted truncate">{m.user?.email}</p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase border ${
                      roleBadge[m.role] || roleBadge.member
                    }`}
                  >
                    {m.role}
                  </span>
                </div>
                {isAdmin && m.user_id !== user?.user_id && (
                  <button
                    onClick={() => handleRemove(m.user_id, m.user?.full_name || "member")}
                    className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition"
                    title="Remove member"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>

          {team.members.length === 0 && (
            <p className="text-center text-muted text-sm py-8">
              No members yet. Invite someone above.
            </p>
          )}

          {/* Workload visualization */}
          {workload.length > 0 && (
            <div className="glass-card rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-sm">Workload</h3>
              <div className="space-y-3">
                {workload.map((w) => {
                  const total = w.pending_tasks + w.completed_tasks;
                  const pctPending = (w.pending_tasks / maxWorkload) * 100;
                  const pctDone = (w.completed_tasks / maxWorkload) * 100;
                  return (
                    <div key={w.user_id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <InitialsAvatar name={w.full_name} size="xs" />
                          <span className="font-medium">{w.full_name}</span>
                        </div>
                        <span className="text-muted text-xs">
                          {w.completed_tasks} done / {w.pending_tasks} pending
                        </span>
                      </div>
                      <div className="flex h-3 rounded-full overflow-hidden bg-dark-800">
                        <div
                          className="bg-success/80 transition-all duration-500"
                          style={{ width: `${pctDone}%` }}
                        />
                        <div
                          className="bg-warning/60 transition-all duration-500"
                          style={{ width: `${pctPending}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-success/80" /> Completed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-warning/60" /> Pending
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === "Activity" && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {activities.length === 0 && (
            <p className="text-center text-muted text-sm py-12">No recent activity.</p>
          )}
          {activities.map((a) => (
            <motion.div
              key={a.log_id}
              variants={item}
              className="glass-card rounded-lg px-4 py-3 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center shrink-0 mt-0.5">
                <ActivityIcon size={14} className="text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{a.user_name || "Someone"}</span>{" "}
                  <span className="text-muted">{a.action}</span>
                  {a.entity_type && (
                    <span className="text-muted"> on {a.entity_type}</span>
                  )}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </PageWrapper>
  );
};

export default TeamDetailPage;
