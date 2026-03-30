import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, BarChart3, Users, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      toast.success("Welcome back!");
      navigate("/");
    } else {
      setShake(true);
      toast.error("Invalid email or password. Please try again.");
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - decorative */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center bg-dark-900">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(99,102,241,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(59,130,246,0.08),transparent_60%)]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

        <div className="relative z-10 px-16 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center mb-8 shadow-lg shadow-accent/25">
              <Zap size={26} />
            </div>
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Manage tasks<br />
              <span className="gradient-text">intelligently.</span>
            </h2>
            <p className="text-muted text-base leading-relaxed mb-10">
              AI-powered task management that learns your team's patterns, predicts deadlines, and helps everyone work smarter.
            </p>
          </motion.div>

          {/* Feature list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="space-y-5"
          >
            {[
              { icon: <BarChart3 size={18} />, title: "Smart Priority Scoring", desc: "ML models rank your tasks by urgency and impact" },
              { icon: <Users size={18} />, title: "Team Collaboration", desc: "Comments, mentions, and real-time notifications" },
              { icon: <CheckCircle2 size={18} />, title: "Completion Predictions", desc: "Know when tasks will finish before they start" },
              { icon: <Shield size={18} />, title: "Enterprise Security", desc: "Role-based access with org-level controls" },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                  {feature.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">{feature.title}</p>
                  <p className="text-xs text-muted mt-0.5">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="mt-12 pt-8 border-t border-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#6366F1", "#EC4899", "#F59E0B", "#10B981"].map((color, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-dark-900 flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: color }}>
                    {["AK", "PK", "JC", "SP"][i]}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">
                Trusted by <span className="text-white/80 font-medium">productive teams</span> everywhere
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-dark-900">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`w-full max-w-md ${shake ? "animate-shake" : ""}`}
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
              <Zap size={20} />
            </div>
            <span className="font-bold text-lg">TaskOptimizer</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
          <p className="text-muted text-sm mb-8">Sign in to continue to your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="relative group">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>

            {/* Password */}
            <div className="relative group">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
              <input
                type={showPw ? "text" : "password"}
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Forgot password */}
            <div className="flex items-center justify-end">
              <button type="button" className="text-xs text-accent hover:underline">Forgot password?</button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm gradient-accent hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-accent hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
