"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, firebaseEnabled } from "@/lib/firebase/client";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signInAnonymously: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInWithGoogle: async () => null,
  signInAnonymously: async () => null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  async function handleSignInWithGoogle(): Promise<User | null> {
    if (!firebaseEnabled || !auth) return null;

    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      return credential.user;
    } catch (error) {
      console.error("Google sign-in failed", error);
      return null;
    }
  }

  async function handleAnonymousSignIn(): Promise<User | null> {
    if (!firebaseEnabled || !auth) return null;

    try {
      const credential = await signInAnonymously(auth);
      return credential.user;
    } catch (error) {
      console.error("Anonymous sign-in failed", error);
      return null;
    }
  }

  async function handleLogout(): Promise<void> {
    if (!firebaseEnabled || !auth) return;

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-out failed", error);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithGoogle: handleSignInWithGoogle,
      signInAnonymously: handleAnonymousSignIn,
      logout: handleLogout,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
