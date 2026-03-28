import React from "react";
import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/add", label: "Add Task" },
  { to: "/tasks", label: "Tasks" },
  { to: "/analytics", label: "Analytics" },
];

const Navbar: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <nav className="bg-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-16 gap-8">
        <span className="text-xl font-bold tracking-tight">
          TaskOptimizer
        </span>
        <div className="flex gap-4">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                pathname === l.to
                  ? "bg-indigo-800"
                  : "hover:bg-indigo-500"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
