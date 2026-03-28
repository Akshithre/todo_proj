import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CheckSquare, PlusCircle, BarChart2,
  Sparkles, Settings, LogOut, ChevronLeft, ChevronRight, Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "My Tasks", icon: CheckSquare },
  { to: "/add", label: "Add Task", icon: PlusCircle },
  { to: "/analytics", label: "Analytics", icon: BarChart2 },
  { to: "/suggestions", label: "Smart AI", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
];

const Sidebar: React.FC = () => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around bg-dark-800/90 backdrop-blur-xl border-t border-white/10 px-2 py-2">
        {links.slice(0, 5).map((l) => {
          const active = pathname === l.to;
          return (
            <Link key={l.to} to={l.to} className="flex flex-col items-center gap-0.5">
              <l.icon size={20} className={active ? "text-accent" : "text-muted"} />
              <span className={`text-[10px] ${active ? "text-accent font-semibold" : "text-muted"}`}>
                {l.label.split(" ")[0]}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-dark-800/60 backdrop-blur-2xl border-r border-white/10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="font-bold text-sm whitespace-nowrap overflow-hidden"
              >
                TaskOptimizer
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <div className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {links.map((l) => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-white hover:bg-white/5"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-accent"
                    style={{ boxShadow: "0 0 12px 2px rgba(99,102,241,0.5)" }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <l.icon size={20} className="flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {l.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className="border-t border-white/10 p-3 space-y-1">
          <AnimatePresence>
            {!collapsed && user && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 px-3 py-2 mb-1"
              >
                <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{user.name}</p>
                  <p className="text-[10px] text-muted truncate">{user.email}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-danger hover:bg-danger/10 transition-all w-full"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-2 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-all"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
