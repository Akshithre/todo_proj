import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, MessageSquare, AtSign, Heart, UserPlus, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNotifications, getUnreadCount, markRead, markAllRead } from "../services/api";
import { Notification } from "../types";
import { formatDistanceToNow } from "date-fns";

const iconMap: Record<string, React.ReactNode> = {
  mention: <AtSign size={14} className="text-blue-400" />,
  comment: <MessageSquare size={14} className="text-green-400" />,
  reaction: <Heart size={14} className="text-pink-400" />,
  assignment: <UserPlus size={14} className="text-amber-400" />,
  deadline: <Clock size={14} className="text-red-400" />,
};

const NotificationDropdown: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(20),
        getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnread(count.count);
    } catch {}
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (!document.hidden) load();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAll = async () => {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await markRead(n.notification_id);
      setNotifications((prev) =>
        prev.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: true } : x))
      );
      setUnread((c) => Math.max(0, c - 1));
    }
    if (n.task_id) {
      navigate(`/tasks`);
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative p-2 rounded-xl hover:bg-white/5 transition-colors"
      >
        <Bell size={20} className="text-muted" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-danger text-[10px] font-bold flex items-center justify-center"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 max-h-[28rem] bg-dark-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unread > 0 && (
                <button onClick={handleMarkAll} className="text-[11px] text-accent hover:underline flex items-center gap-1">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>
            <div className="overflow-y-auto max-h-80 divide-y divide-white/5">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-muted text-sm">
                  <Bell size={24} className="mx-auto mb-2 opacity-30" />
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.notification_id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-start gap-3 ${
                      !n.is_read ? "bg-accent/5" : ""
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">{iconMap[n.type] || <Bell size={14} className="text-muted" />}</div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs leading-relaxed ${!n.is_read ? "text-white font-medium" : "text-muted"}`}>
                        {n.title}
                      </p>
                      {n.message && <p className="text-[11px] text-muted/60 mt-0.5 truncate">{n.message}</p>}
                      <p className="text-[10px] text-muted/40 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />}
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-white/10 px-4 py-2.5">
              <button
                onClick={() => { navigate("/notifications"); setOpen(false); }}
                className="text-xs text-accent hover:underline w-full text-center"
              >
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
