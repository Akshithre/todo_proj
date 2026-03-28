import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2 } from "lucide-react";
import { createTask } from "../services/api";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";

const QuickAddFab: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Keyboard shortcut: press 'n' to open quick add (only when not in an input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createTask({ task_name: name.trim(), priority });
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.8 } });
      toast.success("Task created!");
      setName("");
      setPriority("Medium");
      setOpen(false);
    } catch {
      toast.error("Failed to create task");
    }
    setSubmitting(false);
  };

  const priorities = [
    { value: "Low", color: "bg-success", active: "ring-success" },
    { value: "Medium", color: "bg-warning", active: "ring-warning" },
    { value: "High", color: "bg-danger", active: "ring-danger" },
  ];

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Quick add panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[61] w-[calc(100vw-2rem)] max-w-sm"
          >
            <form onSubmit={handleSubmit} className="glass p-4 space-y-3 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Quick Add</span>
                <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {priorities.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`w-7 h-7 rounded-full ${p.color} transition-all ${
                        priority === p.value ? `ring-2 ${p.active} ring-offset-2 ring-offset-dark-800 scale-110` : "opacity-40 hover:opacity-70"
                      }`}
                      title={p.value}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="px-4 py-2 rounded-xl gradient-accent text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all"
                >
                  {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Add
                </button>
              </div>
              <p className="text-[10px] text-muted text-center">Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-[9px]">Esc</kbd> to close</p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[55] w-14 h-14 rounded-full gradient-accent shadow-lg shadow-accent/30 flex items-center justify-center"
          >
            <Plus size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default QuickAddFab;
