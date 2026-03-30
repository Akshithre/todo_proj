import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataCacheProvider } from "./context/DataCache";
import Sidebar from "./components/Sidebar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AcceptInvite from "./pages/AcceptInvite";
import Dashboard from "./pages/Dashboard";
import AddTask from "./pages/AddTask";
import TaskList from "./pages/TaskList";
import Analytics from "./pages/Analytics";
import SmartSuggestions from "./pages/SmartSuggestions";
import Settings from "./pages/Settings";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import AdminPanel from "./pages/AdminPanel";
import NotificationsPage from "./pages/NotificationsPage";
import QuickAddFab from "./components/QuickAddFab";
import CommandPalette from "./components/CommandPalette";
import NotificationDropdown from "./components/NotificationDropdown";
import LoadingBar from "./components/LoadingBar";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <QuickAddFab />
      <CommandPalette />
      <main className="flex-1 md:ml-[240px] pb-20 md:pb-0">
        {/* Top bar with notifications */}
        <div className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-end gap-2">
            <kbd className="hidden sm:inline text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded border border-white/10">
              Ctrl+K
            </kbd>
            <NotificationDropdown />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add" element={<AddTask />} />
              <Route path="/tasks" element={<TaskList />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/suggestions" element={<SmartSuggestions />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:id" element={<TeamDetail />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/landing" element={user ? <Navigate to="/" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      <Route
        path="/*"
        element={
          !loading && !user ? (
            <Landing />
          ) : (
            <ProtectedRoute>
              <DataCacheProvider>
                <AppLayout />
              </DataCacheProvider>
            </ProtectedRoute>
          )
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
