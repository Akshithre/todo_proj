import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell, CheckCheck, MessageSquare, AtSign, UserCheck, Tag,
  Inbox, AlertCircle, Info,
} from "lucide-react";
import { Notification } from "../types";
import { getNotifications, markRead, markAllRead } from "../services/api";
import PageWrapper from "../components/PageWrapper";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

const FILTERS = ["All", "Unread", "Mentions", "Comments", "Assignments"] as const;
type Filter = typeof FILTERS[number];

const typeToIcon: Record<string, any> = {
  mention: AtSign,
  comment: MessageSquare,
  assignment: UserCheck,
  tag: Tag,
  alert: AlertCircle,
  info: Info,
};

const typeToColor: Record<string, string> = {
  mention: "text-accent bg-accent/15",
  comment: "text-cyan-400 bg-cyan-400/15",
  assignment: "text-success bg-success/15",
  tag: "text-warning bg-warning/15",
  alert: "text-danger bg-danger/15",
  info: "text-muted bg-dark-700",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getNotifications(100);
      setNotifications(data);
    } catch {
      toast.error("Failed to load notifications");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const filtered = notifications.filter((n) => {
    switch (filter) {
      case "Unread":
        return !n.is_read;
      case "Mentions":
        return n.type === "mention";
      case "Comments":
        return n.type === "comment";
      case "Assignments":
        return n.type === "assignment";
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <PageWrapper
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
      actions={
        unreadCount > 0 ? (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-accent hover:bg-accent/10 transition"
          >
            <CheckCheck size={16} /> Mark All Read
          </button>
        ) : undefined
      }
    >
      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-dark-800/60 w-fit overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
              filter === f
                ? "bg-dark-700 text-white"
                : "text-muted hover:text-white"
            }`}
          >
            {f}
            {f === "Unread" && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-accent/20 text-accent">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-card rounded-lg px-4 py-4 animate-pulse flex gap-3">
              <div className="w-9 h-9 rounded-full bg-dark-700 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-dark-700 rounded" />
                <div className="h-3 w-72 bg-dark-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Inbox size={48} className="mx-auto text-muted mb-4" />
          <h3 className="text-lg font-semibold mb-1">
            {filter === "All" ? "No notifications" : `No ${filter.toLowerCase()} notifications`}
          </h3>
          <p className="text-muted text-sm">
            {filter === "All"
              ? "You're all caught up! Check back later."
              : "Try switching to a different filter."}
          </p>
        </motion.div>
      )}

      {/* Notifications list */}
      {!loading && filtered.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {filtered.map((n) => {
            const Icon = typeToIcon[n.type] || Bell;
            const colorCls = typeToColor[n.type] || typeToColor.info;
            return (
              <motion.div
                key={n.notification_id}
                variants={item}
                onClick={() => !n.is_read && handleMarkRead(n.notification_id)}
                className={`glass-card rounded-lg px-4 py-3 flex items-start gap-3 cursor-pointer transition ${
                  !n.is_read
                    ? "border-l-2 border-l-accent bg-accent/[0.03]"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colorCls}`}
                >
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!n.is_read ? "font-semibold" : "font-medium"}`}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                    )}
                  </div>
                  {n.message && (
                    <p className="text-sm text-muted mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <p className="text-xs text-muted mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </PageWrapper>
  );
};

export default NotificationsPage;
