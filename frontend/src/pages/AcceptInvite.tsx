import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Users, Loader2, ArrowRight, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Register from "./Register";

const AcceptInvite: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);

  // If user is not logged in, show Register with prefilled invite token
  if (!user) {
    return <Register prefillInviteToken={token} />;
  }

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      // Call API to accept invite (reuse register flow or a dedicated endpoint)
      // For now, we just navigate to dashboard after "accepting"
      toast.success("Invite accepted! Welcome to the team.");
      navigate("/");
    } catch {
      toast.error("Failed to accept invite. The link may be expired.");
    }
    setAccepting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-dark-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(99,102,241,0.08),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
            <Zap size={20} />
          </div>
          <span className="font-bold text-lg">TaskOptimizer</span>
        </div>

        <div className="glass p-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-6"
          >
            <Users size={28} className="text-accent" />
          </motion.div>

          <h1 className="text-2xl font-bold mb-2">Team Invitation</h1>
          <p className="text-muted text-sm mb-2">
            You've been invited to join an organization.
          </p>

          <div className="my-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 justify-center">
              <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-sm font-bold">
                {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white/90">{user.full_name || "User"}</p>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted mb-6">
            Invite code: <span className="text-white/60 font-mono">{token}</span>
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-3 rounded-xl font-semibold text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 py-3 rounded-xl font-semibold text-sm gradient-accent hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Joining...
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Accept <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AcceptInvite;
