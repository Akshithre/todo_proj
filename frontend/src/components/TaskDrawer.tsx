import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, MessageSquare, Send, Reply, Trash2, Edit3, Loader2 } from "lucide-react";
import { Task, Comment, Reaction, TimePrediction } from "../types";
import {
  getComments, addComment, deleteComment,
  getReactions, addReaction, removeReaction,
  predictTime, updateTask,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import InitialsAvatar from "./InitialsAvatar";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

const EMOJIS = ["👍", "❤️", "🔥", "✅", "🎯"];

interface Props {
  task: Task | null;
  onClose: () => void;
  onUpdate: () => void;
  members?: { user_id: number; full_name: string }[];
}

const TaskDrawer: React.FC<Props> = ({ task, onClose, onUpdate, members = [] }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [prediction, setPrediction] = useState<TimePrediction | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");

  useEffect(() => {
    if (!task) return;
    loadData();
  }, [task?.task_id]); // eslint-disable-line

  const loadData = async () => {
    if (!task) return;
    try {
      const [c, r] = await Promise.all([
        getComments(task.task_id),
        getReactions(task.task_id),
      ]);
      setComments(c);
      setReactions(r);
    } catch {}
    try {
      const p = await predictTime(task.task_id);
      setPrediction(p);
    } catch {}
  };

  const handleSendComment = async () => {
    if (!task || !newComment.trim()) return;
    setSending(true);
    try {
      await addComment(task.task_id, newComment, replyTo || undefined);
      setNewComment("");
      setReplyTo(null);
      const c = await getComments(task.task_id);
      setComments(c);
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    }
    setSending(false);
  };

  const handleReaction = async (emoji: string) => {
    if (!task) return;
    const existing = reactions.find((r) => r.emoji === emoji && r.reacted_by_me);
    try {
      if (existing) {
        await removeReaction(task.task_id, emoji);
      } else {
        await addReaction(task.task_id, emoji);
      }
      const r = await getReactions(task.task_id);
      setReactions(r);
    } catch {}
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!task) return;
    try {
      await deleteComment(task.task_id, commentId);
      const c = await getComments(task.task_id);
      setComments(c);
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleAssign = async (userId: number) => {
    if (!task) return;
    try {
      await updateTask(task.task_id, { assigned_to: userId } as any);
      onUpdate();
      toast.success("Task assigned");
    } catch {
      toast.error("Failed to assign");
    }
  };

  const handleCommentInput = (val: string) => {
    setNewComment(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === " ")) {
      setMentionOpen(true);
      setMentionFilter(val.slice(lastAt + 1));
    } else {
      setMentionOpen(false);
    }
  };

  const insertMention = (name: string) => {
    const lastAt = newComment.lastIndexOf("@");
    setNewComment(newComment.slice(0, lastAt) + `@${name} `);
    setMentionOpen(false);
  };

  const filteredMembers = members.filter((m) =>
    m.full_name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  const CommentItem: React.FC<{ c: Comment; depth?: number }> = ({ c, depth = 0 }) => (
    <div className={`${depth > 0 ? "ml-8 border-l-2 border-white/5 pl-3" : ""}`}>
      <div className="flex items-start gap-2.5 py-2">
        <InitialsAvatar name={c.user_name || "U"} size="xs" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">{c.user_name || "User"}</span>
            <span className="text-[10px] text-muted">
              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-xs text-white/80 mt-0.5 whitespace-pre-wrap">
            {c.content.split(/(@\S+)/g).map((part, i) =>
              part.startsWith("@") ? (
                <span key={i} className="text-accent font-medium">{part}</span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => setReplyTo(c.comment_id)}
              className="text-[10px] text-muted hover:text-accent flex items-center gap-1"
            >
              <Reply size={10} /> Reply
            </button>
            {c.user_id === user?.user_id && (
              <button
                onClick={() => handleDeleteComment(c.comment_id)}
                className="text-[10px] text-muted hover:text-danger flex items-center gap-1"
              >
                <Trash2 size={10} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
      {c.replies?.map((r) => (
        <CommentItem key={r.comment_id} c={r} depth={depth + 1} />
      ))}
    </div>
  );

  if (!task) return null;

  const priorityColor: Record<string, string> = {
    High: "text-danger", Medium: "text-warning", Low: "text-success",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-dark-800 border-l border-white/10 overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-dark-800/95 backdrop-blur-sm border-b border-white/10 px-5 py-4 flex items-center justify-between z-10">
            <h2 className="font-semibold text-sm truncate flex-1">{task.task_name}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted">
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* Status & Priority */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                task.status === "Completed" ? "bg-success/20 text-success" :
                task.status === "In Progress" ? "bg-warning/20 text-warning" :
                "bg-white/10 text-muted"
              }`}>
                {task.status}
              </span>
              <span className={`text-xs font-semibold ${priorityColor[task.priority] || ""}`}>
                {task.priority} Priority
              </span>
              {task.deadline && (
                <span className="text-xs text-muted">
                  Due {formatDistanceToNow(new Date(task.deadline), { addSuffix: true })}
                </span>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Description</h3>
                <p className="text-sm text-white/70">{task.description}</p>
              </div>
            )}

            {/* Assignee */}
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Assigned To</h3>
              {task.assignee_name ? (
                <div className="flex items-center gap-2">
                  <InitialsAvatar name={task.assignee_name} size="sm" />
                  <span className="text-sm">{task.assignee_name}</span>
                </div>
              ) : (
                <div className="relative">
                  <select
                    onChange={(e) => e.target.value && handleAssign(Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs w-full focus:outline-none focus:border-accent"
                    defaultValue=""
                  >
                    <option value="">Assign to someone...</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* AI Prediction */}
            {prediction && (
              <div className="glass-card !p-3">
                <div className="flex items-center gap-2 text-xs">
                  <Clock size={14} className="text-accent" />
                  <span className="text-muted">AI Predicted:</span>
                  <span className="font-semibold text-accent">{prediction.predicted_time}h</span>
                  <span className="text-muted">({Math.round(prediction.confidence * 100)}% confidence)</span>
                </div>
              </div>
            )}

            {/* Reactions */}
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Reactions</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {EMOJIS.map((emoji) => {
                  const r = reactions.find((x) => x.emoji === emoji);
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                        r?.reacted_by_me
                          ? "bg-accent/20 border border-accent/30"
                          : "bg-white/5 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <span>{emoji}</span>
                      {r && r.count > 0 && <span className="font-semibold">{r.count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Comments ({comments.reduce((a, c) => a + 1 + (c.replies?.length || 0), 0)})
              </h3>
              <div className="space-y-1">
                {comments.map((c) => (
                  <CommentItem key={c.comment_id} c={c} />
                ))}
                {comments.length === 0 && (
                  <p className="text-xs text-muted py-4 text-center">No comments yet. Start the conversation!</p>
                )}
              </div>

              {/* Add comment */}
              <div className="mt-3 relative">
                {replyTo && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-accent">Replying to comment</span>
                    <button onClick={() => setReplyTo(null)} className="text-[10px] text-muted hover:text-white">Cancel</button>
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={newComment}
                      onChange={(e) => handleCommentInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendComment()}
                      placeholder="Add a comment... (use @ to mention)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs placeholder-muted focus:outline-none focus:border-accent"
                    />
                    {mentionOpen && filteredMembers.length > 0 && (
                      <div className="absolute bottom-full mb-1 left-0 right-0 bg-dark-800 border border-white/10 rounded-lg py-1 max-h-32 overflow-y-auto z-10">
                        {filteredMembers.map((m) => (
                          <button
                            key={m.user_id}
                            onClick={() => insertMention(m.full_name)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 flex items-center gap-2"
                          >
                            <InitialsAvatar name={m.full_name} size="xs" />
                            {m.full_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSendComment}
                    disabled={!newComment.trim() || sending}
                    className="p-2.5 rounded-xl gradient-accent disabled:opacity-40 transition-all"
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TaskDrawer;
