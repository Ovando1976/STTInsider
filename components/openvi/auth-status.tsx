"use client";

import { useAuthUser } from "@/hooks/use-auth-user";

export function AuthStatus() {
  const { user, loading, signInWithGoogle, logout } = useAuthUser();

  if (loading) {
    return (
      <div className="rounded-full border border-slate-800 px-4 py-2 text-sm text-slate-400">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={signInWithGoogle}
        className="rounded-full border border-sky-800 bg-sky-950/40 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-900/50"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="rounded-full border border-slate-800 px-4 py-2 text-sm text-slate-300">
        {user.displayName || user.email || "Signed in"}
      </div>
      <button
        type="button"
        onClick={logout}
        className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-900"
      >
        Sign out
      </button>
    </div>
  );
}