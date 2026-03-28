import React, { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

const PageWrapper: React.FC<Props> = ({ title, subtitle, children, actions }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="space-y-6"
  >
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {actions}
    </div>
    {children}
  </motion.div>
);

export default PageWrapper;
