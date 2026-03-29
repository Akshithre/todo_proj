import React from "react";

const COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-sky-500 to-blue-600",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Props {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = { xs: "w-6 h-6 text-[10px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };

const InitialsAvatar: React.FC<Props> = ({ name, size = "sm", className = "" }) => {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = COLORS[hashStr(name) % COLORS.length];

  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
};

export default InitialsAvatar;
