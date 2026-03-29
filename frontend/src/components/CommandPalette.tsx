import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LayoutDashboard, CheckSquare, PlusCircle, BarChart2, Sparkles, Settings, Users, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands: CommandItem[] = [
    { id: "dashboard", label: "Go to Dashboard", icon: <LayoutDashboard size={16} />, action: () => navigate("/"), keywords: ["home", "dashboard"] },
    { id: "tasks", label: "Go to Tasks", icon: <CheckSquare size={16} />, action: () => navigate("/tasks"), keywords: ["tasks", "list", "todo"] },
    { id: "add", label: "Create New Task", icon: <PlusCircle size={16} />, action: () => navigate("/add"), keywords: ["add", "new", "create", "task"] },
    { id: "analytics", label: "View Analytics", icon: <BarChart2 size={16} />, action: () => navigate("/analytics"), keywords: ["analytics", "charts", "stats"] },
    { id: "ai", label: "Smart AI Suggestions", icon: <Sparkles size={16} />, action: () => navigate("/suggestions"), keywords: ["ai", "smart", "suggestions", "ml"] },
    { id: "teams", label: "Manage Teams", icon: <Users size={16} />, action: () => navigate("/teams"), keywords: ["teams", "members", "people"] },
    { id: "notifications", label: "Notifications", icon: <Bell size={16} />, action: () => navigate("/notifications"), keywords: ["notifications", "alerts"] },
    { id: "settings", label: "Settings", icon: <Settings size={16} />, action: () => navigate("/settings"), keywords: ["settings", "preferences", "config"] },
  ];

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.keywords.some((k) => k.includes(query.toLowerCase()))
      )
    : commands;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter" && filtered[selected]) {
        filtered[selected].action();
        setOpen(false);
      }
    },
    [filtered, selected]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search size={18} className="text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder-muted"
              />
              <kbd className="text-[10px] text-muted bg-white/5 px-1.5 py-0.5 rounded border border-white/10">ESC</kbd>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-muted text-sm">No results found</div>
              ) : (
                filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onClick={() => { cmd.action(); setOpen(false); }}
                    onMouseEnter={() => setSelected(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      i === selected ? "bg-accent/10 text-accent" : "text-muted hover:bg-white/5"
                    }`}
                  >
                    {cmd.icon}
                    <span>{cmd.label}</span>
                  </button>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t border-white/10 flex items-center gap-4 text-[10px] text-muted">
              <span><kbd className="bg-white/5 px-1 rounded">↑↓</kbd> navigate</span>
              <span><kbd className="bg-white/5 px-1 rounded">↵</kbd> select</span>
              <span><kbd className="bg-white/5 px-1 rounded">esc</kbd> close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
