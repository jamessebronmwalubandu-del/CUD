"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { SessionUser, Member } from "@/types";

interface AuthState {
  user: SessionUser | null;
  member: (Pick<Member, "id" | "fullName" | "regNumber" | "email" | "phoneNumber" | "gender" | "faculty" | "department" | "course" | "yearOfStudy" | "hostel" | "homeRegion" | "emergencyContact" | "profilePhoto" | "biography" | "status"> & {
    ministries?: { id: string; role: string; ministry: { id: string; name: string; color: string | null } }[];
  }) | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (identifier: string, password: string) => Promise<SessionUser>;
  signUp: (data: {
    fullName: string;
    email: string;
    username: string;
    password: string;
    phoneNumber?: string;
  }) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchMe(): Promise<{ user: SessionUser; member: AuthState["member"] } | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data?.user) {
      return { user: json.data.user, member: json.data.member ?? null };
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, member: null, loading: true });

  const refresh = useCallback(async () => {
    const result = await fetchMe();
    setState({
      user: result?.user ?? null,
      member: result?.member ?? null,
      loading: false,
    });
  }, []);

  // Bootstrap session on mount only (no setState in the effect body itself).
  useEffect(() => {
    let active = true;
    (async () => {
      const result = await fetchMe();
      if (!active) return;
      setState({
        user: result?.user ?? null,
        member: result?.member ?? null,
        loading: false,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
      credentials: "same-origin",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? "Login failed");
    }
    const result = await fetchMe();
    setState({
      user: result?.user ?? null,
      member: result?.member ?? null,
      loading: false,
    });
    return json.data.user as SessionUser;
  }, []);

  const signUp = useCallback(
    async (data: {
      fullName: string;
      email: string;
      username: string;
      password: string;
      phoneNumber?: string;
    }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Registration failed");
      }
      const result = await fetchMe();
      setState({
        user: result?.user ?? null,
        member: result?.member ?? null,
        loading: false,
      });
      return json.data.user as SessionUser;
    },
    []
  );

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    setState({ user: null, member: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
