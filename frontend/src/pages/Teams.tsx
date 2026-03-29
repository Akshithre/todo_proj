import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, X, Hash, Briefcase, Code, Palette, Zap, Target,
  Star, Heart, Shield, Globe, Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Team } from "../types";
import { getTeams, createTeam } from "../services/api";
import PageWrapper from "../components/PageWrapper";
import toast from "react-hot-toast";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

const ICON_OPTIONS = [
  { name: "hash", icon: Hash },
  { name: "briefcase", icon: Briefcase },
  { name: "code", icon: Code },
  { name: "palette", icon: Palette },
  { name: "zap", icon: Zap },
  { name: "target", icon: Target },
  { name: "star", icon: Star },
  { name: "heart", icon: Heart },
  { name: "shield", icon: Shield },
  { name: "globe", icon: Globe },
  { name: "layers", icon: Layers },
  { name: "users", icon: Users },
];

const getIcon = (name: string) => {
  const match = ICON_OPTIONS.find((i) => i.name === name);
  return match ? match.icon : Hash;
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const Teams: React.FC = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: PRESET_COLORS[0],
    icon: "hash",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTeams();
      setTeams(data);
    } catch {
      toast.error("Failed to load teams");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Team name is required");
      return;
    }
    setCreating(true);
    try {
      await createTeam({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color,
        icon: form.icon,
      });
      toast.success("Team created!");
      setShowModal(false);
      setForm({ name: "", description: "", color: PRESET_COLORS[0], icon: "hash" });
      load();
    } catch {
      toast.error("Failed to create team");
    }
    setCreating(false);
  };

  return (
    <PageWrapper
      title="Teams"
      subtitle="Collaborate with your organization"
      actions={
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-accent text-white font-medium text-sm hover:opacity-90 transition"
        >
          <Plus size={16} /> New Team
        </button>
      }
    >
      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card rounded-xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-dark-700" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-dark-700 rounded mb-2" />
                  <div className="h-3 w-16 bg-dark-700 rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-dark-700 rounded mb-2" />
              <div className="h-3 w-2/3 bg-dark-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Teams grid */}
      {!loading && teams.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Users size={48} className="mx-auto text-muted mb-4" />
          <h3 className="text-lg font-semibold mb-1">No teams yet</h3>
          <p className="text-muted text-sm mb-6">Create your first team to start collaborating.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-lg gradient-accent text-white font-medium text-sm hover:opacity-90 transition"
          >
            Create Team
          </button>
        </motion.div>
      )}

      {!loading && teams.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {teams.map((team) => {
            const Icon = getIcon(team.icon);
            return (
              <motion.div
                key={team.team_id}
                variants={item}
                onClick={() => navigate(`/teams/${team.team_id}`)}
                className="glass-card glass-hover rounded-xl p-5 cursor-pointer group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: team.color + "22" }}
                  >
                    <Icon size={20} style={{ color: team.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate group-hover:text-accent transition">
                      {team.name}
                    </h3>
                  </div>
                </div>
                {team.description && (
                  <p className="text-muted text-sm line-clamp-2 mb-4">{team.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Users size={13} /> {team.member_count} member{team.member_count !== 1 && "s"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers size={13} /> {team.task_count} task{team.task_count !== 1 && "s"}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Create Team Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl p-6 w-full max-w-md space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Create Team</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-dark-700 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Team Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Engineering"
                  className="w-full px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this team work on?"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm transition resize-none"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        form.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-dark-900 scale-110" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon selector */}
              <div>
                <label className="block text-sm font-medium mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((opt) => {
                    const I = opt.icon;
                    return (
                      <button
                        key={opt.name}
                        onClick={() => setForm({ ...form, icon: opt.name })}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
                          form.icon === opt.name
                            ? "bg-accent/20 text-accent ring-1 ring-accent"
                            : "bg-dark-800 text-muted hover:text-white hover:bg-dark-700"
                        }`}
                      >
                        <I size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-lg bg-dark-800 p-3 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: form.color + "22" }}
                >
                  {React.createElement(getIcon(form.icon), {
                    size: 18,
                    style: { color: form.color },
                  })}
                </div>
                <span className="font-medium text-sm">
                  {form.name || "Team Name"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-dark-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-4 py-2 rounded-lg text-sm font-medium gradient-accent text-white hover:opacity-90 transition disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Team"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

export default Teams;
