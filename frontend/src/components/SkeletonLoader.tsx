import React from "react";

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`glass-card animate-pulse space-y-3 ${className}`}>
    <div className="h-4 w-3/4 rounded bg-white/10 shimmer-bg" />
    <div className="h-3 w-1/2 rounded bg-white/10 shimmer-bg" />
    <div className="h-3 w-1/3 rounded bg-white/10 shimmer-bg" />
  </div>
);

export const SkeletonStat: React.FC = () => (
  <div className="glass-card animate-pulse">
    <div className="h-3 w-20 rounded bg-white/10 shimmer-bg mb-3" />
    <div className="h-8 w-16 rounded bg-white/10 shimmer-bg" />
  </div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`glass-card animate-pulse ${className}`}>
    <div className="h-4 w-40 rounded bg-white/10 shimmer-bg mb-6" />
    <div className="h-48 w-full rounded-xl bg-white/5 shimmer-bg" />
  </div>
);
