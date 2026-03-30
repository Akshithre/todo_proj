import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { authLogin, authRegister, authMe, authRefresh } from "../services/api";
import { User } from "../types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, orgName?: string, inviteToken?: string) => Promise<string | true>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>(null!);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authMe();
      setUser(me);
    } catch {
      // Try refresh
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const tokens = await authRefresh(refreshToken);
          localStorage.setItem("access_token", tokens.access_token);
          localStorage.setItem("refresh_token", tokens.refresh_token);
          const me = await authMe();
          setUser(me);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          setUser(null);
        }
      } else {
        localStorage.removeItem("access_token");
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Auto-refresh token every 20 hours
  useEffect(() => {
    const interval = setInterval(async () => {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const tokens = await authRefresh(refreshToken);
          localStorage.setItem("access_token", tokens.access_token);
          localStorage.setItem("refresh_token", tokens.refresh_token);
        } catch {
          // Token expired, will redirect on next API call
        }
      }
    }, 20 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const tokens = await authLogin(email, password);
      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      const me = await authMe();
      setUser(me);
      return true;
    } catch {
      return false;
    }
  };

  const register = async (
    name: string, email: string, password: string,
    orgName?: string, inviteToken?: string
  ): Promise<string | true> => {
    try {
      const tokens = await authRegister({
        full_name: name,
        email,
        password,
        org_name: orgName,
        invite_token: inviteToken,
      });
      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      const me = await authMe();
      setUser(me);
      return true;
    } catch (err: any) {
      return err?.response?.data?.detail || err?.message || "Registration failed";
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const me = await authMe();
      setUser(me);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
