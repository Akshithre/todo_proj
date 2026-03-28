import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AddTask from "./pages/AddTask";
import TaskList from "./pages/TaskList";
import Analytics from "./pages/Analytics";
import SmartSuggestions from "./pages/SmartSuggestions";
import Settings from "./pages/Settings";
import QuickAddFab from "./components/QuickAddFab";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* Main content: offset by sidebar width on desktop */}
      <QuickAddFab />
      <main className="flex-1 md:ml-[240px] pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add" element={<AddTask />} />
              <Route path="/tasks" element={<TaskList />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/suggestions" element={<SmartSuggestions />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => (
  <Router>
    <AuthProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1E293B",
            color: "#F8FAFC",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            fontSize: "13px",
          },
          success: { iconTheme: { primary: "#10B981", secondary: "#F8FAFC" } },
          error: { iconTheme: { primary: "#F43F5E", secondary: "#F8FAFC" } },
        }}
      />
      <AppRoutes />
    </AuthProvider>
  </Router>
);

export default App;
