import React from "react";
import { motion } from "framer-motion";

const LoadingBar: React.FC<{ loading: boolean }> = ({ loading }) => {
  if (!loading) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5">
      <motion.div
        className="h-full bg-gradient-to-r from-accent via-blue-500 to-accent"
        initial={{ width: "0%" }}
        animate={{ width: ["0%", "70%", "90%", "100%"] }}
        transition={{ duration: 2, ease: "easeInOut", times: [0, 0.5, 0.8, 1] }}
      />
    </div>
  );
};

export default LoadingBar;
