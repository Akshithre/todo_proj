import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import AddTask from "./pages/AddTask";
import TaskList from "./pages/TaskList";
import Analytics from "./pages/Analytics";

const App: React.FC = () => (
  <Router>
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddTask />} />
          <Route path="/tasks" element={<TaskList />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  </Router>
);

export default App;
