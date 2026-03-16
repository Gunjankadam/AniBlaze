import { useState, useEffect, useCallback } from "react";
import { SCRAPER_BASE_URL } from "@/services/streaming";

export interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("animestream_user") : null;
    if (stored) {
      try {
        return { user: JSON.parse(stored), isLoading: false };
      } catch {
        return { user: null, isLoading: false };
      }
    }
    return { user: null, isLoading: false };
  });

  // No longer need the useEffect for initial load as it's handled in useState initializer

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${SCRAPER_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Login failed");
    }
    const user: User = data.user;
    localStorage.setItem("animestream_user", JSON.stringify(user));
    setState({ user, isLoading: false });
    return user;
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${SCRAPER_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Signup failed");
    }
    // Backend sends OTP email; frontend will call verifyEmail next
    return { pending: true, email };
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const res = await fetch(`${SCRAPER_BASE_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Verification failed");
    }
    const user: User = data.user;
    localStorage.setItem("animestream_user", JSON.stringify(user));
    setState({ user, isLoading: false });
    return user;
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem("animestream_user");
    setState({ user: null, isLoading: false });
  }, []);

  return {
    user: state.user,
    isLoading: state.isLoading,
    login,
    signup,
    verifyEmail,
    logout,
  };
};
