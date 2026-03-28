import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, User, Mail, Lock, Eye, EyeOff, Loader2, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const reqs = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains a number", test: (p: string) => /\d/.test(p) },
  { label: "Contains uppercase", test: (p: string) => /[A-Z]/.test(p) },
];

const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => {
    const passed = reqs.filter((r) => r.test(password)).length;
    return passed;
  }, [password]);

  const strengthColor = strength <= 1 ? "bg-danger" : strength === 2 ? "bg-warning" : "bg-success";
  const strengthLabel = strength <= 1 ? "Weak" : strength === 2 ? "Medium" : "Strong";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    if (strength < 2) { toast.error("Password is too weak"); return; }
    setLoading(true);
    await register(name, email, password);
    setLoading(false);
    toast.success("Account created!");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-dark-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(99,102,241,0.08),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
            <Zap size={20} />
          </div>
          <span className="font-bold text-lg">TaskOptimizer</span>
        </div>

        <div className="glass p-8">
          <h1 className="text-2xl font-bold mb-1 text-center">Create account</h1>
          <p className="text-muted text-sm mb-8 text-center">Get started with smart task management</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
              <input type="text" required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" />
            </div>
            <div className="relative group">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
              <input type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" />
            </div>
            <div className="relative group">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
              <input type={showPw ? "text" : "password"} required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Strength */}
            {password.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <div className="flex gap-1 mb-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? strengthColor : "bg-white/10"}`} />
                  ))}
                </div>
                <p className={`text-xs ${strength <= 1 ? "text-danger" : strength === 2 ? "text-warning" : "text-success"}`}>{strengthLabel}</p>
                <div className="mt-2 space-y-1">
                  {reqs.map((r) => (
                    <div key={r.label} className="flex items-center gap-2 text-xs">
                      <Check size={12} className={r.test(password) ? "text-success" : "text-muted/40"} />
                      <span className={r.test(password) ? "text-white/70" : "text-muted/40"}>{r.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="relative group">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
              <input type="password" required placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-sm placeholder-muted focus:outline-none focus:ring-1 transition-all ${confirm && confirm !== password ? "border-danger focus:border-danger focus:ring-danger" : "border-white/10 focus:border-accent focus:ring-accent"}`} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm gradient-accent hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-sm mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
