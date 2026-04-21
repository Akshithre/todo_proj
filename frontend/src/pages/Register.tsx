import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, User, Mail, Lock, Eye, EyeOff, Loader2, Check,
  ArrowRight, ArrowLeft, Building2, Sparkles, Rocket,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const reqs = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains a number", test: (p: string) => /\d/.test(p) },
  { label: "Contains uppercase", test: (p: string) => /[A-Z]/.test(p) },
];

const stepVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -60 : 60, opacity: 0 }),
};

const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 1 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Step 2 fields
  const [orgName, setOrgName] = useState("");

  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => {
    return reqs.filter((r) => r.test(password)).length;
  }, [password]);

  const strengthColor = strength <= 1 ? "bg-danger" : strength === 2 ? "bg-warning" : "bg-success";
  const strengthLabel = strength <= 1 ? "Weak" : strength === 2 ? "Medium" : "Strong";

  const canAdvanceStep1 = () => {
    if (!name.trim() || !email.trim() || !password || !confirm) {
      toast.error("Please fill in all fields");
      return false;
    }
    if (strength < 2) {
      toast.error("Password is too weak");
      return false;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return false;
    }
    return true;
  };

  const canAdvanceStep2 = () => {
    if (!orgName.trim()) {
      toast.error("Please enter an organization name");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 0 && !canAdvanceStep1()) return;
    if (step === 1 && !canAdvanceStep2()) return;

    if (step === 1) {
      handleRegister();
      return;
    }

    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleRegister = async () => {
    setLoading(true);
    const result = await register(
      name,
      email,
      password,
      orgName,
    );
    setLoading(false);
    if (result === true) {
      setDirection(1);
      setStep(2);
    } else {
      toast.error(result);
    }
  };

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-dark-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(99,102,241,0.08),transparent_60%)]" />

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

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8 px-4">
          {["Account", "Organization", "Ready"].map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step
                      ? "gradient-accent text-white"
                      : i === step
                      ? "border-2 border-accent text-accent"
                      : "border-2 border-white/10 text-muted"
                  }`}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-[10px] ${i <= step ? "text-white/70" : "text-muted"}`}>
                  {label}
                </span>
              </div>
              {i < 2 && (
                <div
                  className={`flex-1 h-0.5 rounded-full transition-colors mt-[-14px] ${
                    i < step ? "bg-accent" : "bg-white/10"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="glass p-8 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {/* Step 1: Account details */}
            {step === 0 && (
              <motion.div
                key="step-0"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <h1 className="text-2xl font-bold mb-1 text-center">Create account</h1>
                <p className="text-muted text-sm mb-6 text-center">
                  Get started with smart task management
                </p>

                <div className="space-y-4">
                  {/* Name */}
                  <div className="relative group">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
                    <input
                      type="text"
                      required
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {/* Email */}
                  <div className="relative group">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
                    <input
                      type="email"
                      required
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
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
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Strength indicator */}
                  {password.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <div className="flex gap-1 mb-2">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i < strength ? strengthColor : "bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                      <p
                        className={`text-xs ${
                          strength <= 1 ? "text-danger" : strength === 2 ? "text-warning" : "text-success"
                        }`}
                      >
                        {strengthLabel}
                      </p>
                      <div className="mt-2 space-y-1">
                        {reqs.map((r) => (
                          <div key={r.label} className="flex items-center gap-2 text-xs">
                            <Check size={12} className={r.test(password) ? "text-success" : "text-muted/40"} />
                            <span className={r.test(password) ? "text-white/70" : "text-muted/40"}>
                              {r.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Confirm password */}
                  <div className="relative group">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
                    <input
                      type="password"
                      required
                      placeholder="Confirm password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-sm placeholder-muted focus:outline-none focus:ring-1 transition-all ${
                        confirm && confirm !== password
                          ? "border-danger focus:border-danger focus:ring-danger"
                          : "border-white/10 focus:border-accent focus:ring-accent"
                      }`}
                    />
                  </div>
                </div>

                {/* Next button */}
                <button
                  onClick={goNext}
                  className="w-full py-3 rounded-xl font-semibold text-sm gradient-accent hover:opacity-90 active:scale-[0.98] transition-all mt-6 flex items-center justify-center gap-2"
                >
                  Next <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* Step 2: Organization */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <h1 className="text-2xl font-bold mb-1 text-center">Your organization</h1>
                <p className="text-muted text-sm mb-6 text-center">
                  Create your organization to get started
                </p>

                <div className="space-y-4">
                  <div className="relative group">
                    <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" />
                    <input
                      type="text"
                      placeholder="Organization name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <p className="text-xs text-muted">
                    You'll be the admin of this organization and can add teammates later.
                  </p>
                </div>

                {/* Navigation */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={goBack}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    onClick={goNext}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm gradient-accent hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Creating...
                      </>
                    ) : (
                      <>
                        Create Account <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Welcome */}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent/30"
                >
                  <Sparkles size={28} />
                </motion.div>

                <h1 className="text-2xl font-bold mb-2">You're all set!</h1>
                <p className="text-muted text-sm mb-8">
                  Your account is ready. Here are a few tips to get started.
                </p>

                <div className="space-y-3 text-left mb-8">
                  {[
                    { icon: Rocket, text: "Create your first task from the dashboard" },
                    { icon: Sparkles, text: "Use AI suggestions to prioritize your work" },
                    { icon: Zap, text: "Check analytics to track your productivity" },
                  ].map(({ icon: Icon, text }, i) => (
                    <motion.div
                      key={text}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-accent" />
                      </div>
                      <span className="text-sm text-white/80">{text}</span>
                    </motion.div>
                  ))}
                </div>

                <button
                  onClick={() => navigate("/")}
                  className="w-full py-3 rounded-xl font-semibold text-sm gradient-accent hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  Go to Dashboard <ArrowRight size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step < 2 && (
          <p className="text-center text-muted text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default Register;
