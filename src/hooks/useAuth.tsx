"use client";

import { useState, useEffect, createContext, useContext } from "react";
import type { UserProfile } from "@/types/user";

interface AuthContextType {
  user: { uid: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refresh: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setProfile(data ?? null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setProfile(null); // limpa estado imediatamente
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AuthContext.Provider value={{ user: profile ? { uid: profile.uid } : null, profile, loading, refresh: load, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
