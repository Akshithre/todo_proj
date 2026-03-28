import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  name: string;
  email: string;
}

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>(null!);

const DEMO_USER = { email: "demo@todo.com", password: "demo1234", name: "Demo User" };

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("todo_user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const persist = (u: User) => {
    localStorage.setItem("todo_user", JSON.stringify(u));
    setUser(u);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 800));
    if (email === DEMO_USER.email && password === DEMO_USER.password) {
      persist({ name: DEMO_USER.name, email });
      return true;
    }
    const stored = localStorage.getItem("todo_registered");
    if (stored) {
      const reg = JSON.parse(stored);
      if (reg.email === email && reg.password === password) {
        persist({ name: reg.name, email });
        return true;
      }
    }
    return false;
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 800));
    localStorage.setItem("todo_registered", JSON.stringify({ name, email, password }));
    persist({ name, email });
    return true;
  };

  const logout = () => {
    localStorage.removeItem("todo_user");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
