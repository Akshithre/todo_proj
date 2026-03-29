import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap, Brain, Users, BarChart2, ArrowRight, Check, ChevronRight,
  Sparkles, Shield, Clock, Target, Star,
} from "lucide-react";

const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-900 text-white overflow-hidden">
      {/* ─── Nav ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <Zap size={16} />
            </div>
            <span className="font-bold text-sm">TaskOptimizer</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted hover:text-white transition-colors px-3 py-1.5">
              Log in
            </Link>
            <Link to="/register" className="text-sm font-semibold px-4 py-2 rounded-xl gradient-accent hover:opacity-90 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs text-accent mb-6">
              <Sparkles size={12} /> Powered by Azure ML
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
          >
            Your team's productivity,{" "}
            <span className="gradient-text">supercharged by AI</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-muted max-w-2xl mx-auto"
          >
            Intelligent task management that learns your patterns, predicts completion times,
            and helps your team work smarter with Azure ML-powered insights.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex items-center gap-4 justify-center"
          >
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl gradient-accent font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              Start for free <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 font-semibold text-sm text-muted hover:text-white hover:bg-white/10 transition-all">
              See how it works
            </a>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex items-center justify-center gap-6 text-xs text-muted/60"
          >
            <span className="flex items-center gap-1.5"><Shield size={12} /> Enterprise-grade security</span>
            <span className="flex items-center gap-1.5"><Zap size={12} /> Powered by Azure</span>
            <span className="flex items-center gap-1.5"><Brain size={12} /> ML-driven insights</span>
          </motion.div>

          {/* Hero mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-16 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="rounded-2xl border border-white/10 bg-dark-800/50 backdrop-blur-sm p-4 shadow-2xl shadow-accent/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-danger/50" />
                <div className="w-3 h-3 rounded-full bg-warning/50" />
                <div className="w-3 h-3 rounded-full bg-success/50" />
                <span className="text-[10px] text-muted ml-2">TaskOptimizer - Dashboard</span>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Total Tasks", value: "124", color: "text-accent" },
                  { label: "Completed", value: "89", color: "text-success" },
                  { label: "In Progress", value: "28", color: "text-warning" },
                  { label: "Completion", value: "72%", color: "text-accent" },
                ].map((s) => (
                  <div key={s.label} className="glass-card !p-3">
                    <p className="text-[10px] text-muted">{s.label}</p>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["Design homepage", "Fix auth bug", "Deploy v2.0"].map((t, i) => (
                  <div key={t} className={`glass-card !p-3 border-l-2 ${
                    i === 0 ? "border-l-danger" : i === 1 ? "border-l-warning" : "border-l-success"
                  }`}>
                    <p className="text-xs font-medium">{t}</p>
                    <p className="text-[10px] text-muted mt-1">{["High", "Medium", "Low"][i]}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl font-bold">Everything your team needs</h2>
            <p className="text-muted mt-3 max-w-xl mx-auto">
              From AI-powered prioritization to real-time collaboration, TaskOptimizer has you covered.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: "Smart AI Prioritization", desc: "ML models trained on your patterns automatically suggest priority changes and predict completion times." },
              { icon: Users, title: "Team Collaboration", desc: "Comments, reactions, @mentions, and real-time notifications keep your team aligned and productive." },
              { icon: BarChart2, title: "Real-time Analytics", desc: "Track productivity trends, team workload, and get AI-generated weekly digests of your team's progress." },
              { icon: Target, title: "Task Dependencies", desc: "Define task relationships so your team knows exactly what needs to happen first." },
              { icon: Clock, title: "Time Predictions", desc: "Azure ML predicts how long tasks will take based on historical data and team velocity." },
              { icon: Shield, title: "Role-Based Access", desc: "Organizations, teams, and granular permissions ensure the right people see the right tasks." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card group hover:border-accent/20 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <f.icon size={20} className="text-accent" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section id="how-it-works" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(99,102,241,0.05),transparent_60%)]" />
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="text-muted mt-3">Get started in three simple steps</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create your workspace", desc: "Set up your organization, invite team members, and organize into teams." },
              { step: "02", title: "Add and assign tasks", desc: "Create tasks, set priorities, deadlines, and assign them to team members." },
              { step: "03", title: "Let AI optimize", desc: "Our ML models learn your patterns and provide smart insights to boost productivity." },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  {s.step}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof ─── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl font-bold">Loved by productive teams</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Sarah Chen", role: "Engineering Lead", quote: "TaskOptimizer's AI suggestions have cut our sprint planning time in half. The priority predictions are surprisingly accurate." },
              { name: "Marcus Rivera", role: "Product Manager", quote: "The team collaboration features are fantastic. @mentions, comments, and the notification system keep everyone in sync." },
              { name: "Aisha Patel", role: "Startup Founder", quote: "We switched from three different tools to just TaskOptimizer. The analytics alone justify it." },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card"
              >
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-white/80 mb-4">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center text-xs font-bold">
                    {t.name.split(" ").map((w) => w[0]).join("")}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{t.name}</p>
                    <p className="text-[10px] text-muted">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
            <p className="text-muted mt-3">Start free, upgrade as you grow</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Free", price: "$0", period: "forever",
                features: ["Up to 5 team members", "Unlimited tasks", "Basic analytics", "Email support"],
                cta: "Get started", popular: false,
              },
              {
                name: "Pro", price: "$12", period: "/user/month",
                features: ["Unlimited members", "AI priority suggestions", "Advanced analytics", "Team workload view", "Priority support"],
                cta: "Start free trial", popular: true,
              },
              {
                name: "Enterprise", price: "Custom", period: "",
                features: ["Everything in Pro", "SSO & SAML", "Custom ML models", "Dedicated support", "SLA guarantee"],
                cta: "Contact sales", popular: false,
              },
            ].map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card relative ${p.popular ? "border-accent/30 glow-accent" : ""}`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-accent text-[10px] font-bold">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <div className="mt-3 mb-5">
                  <span className="text-3xl font-extrabold">{p.price}</span>
                  <span className="text-sm text-muted">{p.period}</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted">
                      <Check size={14} className="text-success flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all ${
                    p.popular
                      ? "gradient-accent hover:opacity-90"
                      : "bg-white/5 border border-white/10 text-muted hover:text-white hover:bg-white/10"
                  }`}
                >
                  {p.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center glass-card relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-blue-500/10 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">Ready to supercharge your productivity?</h2>
            <p className="text-muted mb-8">Join teams already using TaskOptimizer to work smarter, not harder.</p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl gradient-accent font-semibold hover:opacity-90 transition-all"
            >
              Start your free trial <ChevronRight size={16} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg gradient-accent flex items-center justify-center">
              <Zap size={14} />
            </div>
            <span className="font-semibold text-sm">TaskOptimizer</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
          <p className="text-xs text-muted">&copy; 2024 TaskOptimizer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
