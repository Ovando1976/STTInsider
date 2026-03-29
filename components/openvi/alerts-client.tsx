"use client";

import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

type AuthUser = {
  uid: string;
} | null;

type OpenVIUserAlert = {
  id: string;
  userId: string;
  type: string;
  targetId: string;
  targetLabel: string;
  delivery?: {
    inApp?: boolean;
    email?: boolean;
    push?: boolean;
  };
  updatedAt?: number;
};

export function AlertsClient() {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<OpenVIUserAlert[]>([]);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const mod = await import("@/lib/firebase/client");
        const auth = mod.auth;

        if (!auth) {
          setUser(null);
          setLoading(false);
          return;
        }

        const { onAuthStateChanged } = await import("firebase/auth");

        const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
          setUser(nextUser ? { uid: nextUser.uid } : null);
          setLoading(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error(err);
        setUser(null);
        setLoading(false);
      }
    }

    let unsubscribeAuth: void | (() => void);

    loadUser().then((unsub) => {
      unsubscribeAuth = unsub;
    });

    return () => {
      if (typeof unsubscribeAuth === "function") {
        unsubscribeAuth();
      }
    };
  }, []);

  useEffect(() => {
    if (!db || !user?.uid) {
      setAlerts([]);
      return;
    }

    const q = query(
      collection(db, "openvi_user_alerts"),
      where("userId", "==", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setAlerts(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<OpenVIUserAlert, "id">),
          }))
        );
        setError("");
      },
      (err) => {
        console.error(err);
        setError("Could not load your alerts.");
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  async function handleRemove(alertId: string) {
    if (!db) {
      setError("Firestore is not configured.");
      return;
    }

    try {
      setRemovingId(alertId);
      await deleteDoc(doc(db, "openvi_user_alerts", alertId));
    } catch (err) {
      console.error(err);
      setError("Could not remove alert.");
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-8">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-400">
            OPENVI
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
            My Alerts
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-300">
            Sign-in is not wired for this screen yet. Keep this page open while
            we finish the auth flow.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-400">
          OPENVI
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          My Alerts
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-300">
          Your saved follows across the Virgin Islands government.
        </p>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4">
          {alerts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-slate-300">
              You have not followed anything yet.
            </div>
          ) : (
            alerts.map((alert) => (
              <article
                key={alert.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {alert.type}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white">
                      {alert.targetLabel}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      In-app: {alert.delivery?.inApp ? "On" : "Off"} · Email:{" "}
                      {alert.delivery?.email ? "On" : "Off"} · Push:{" "}
                      {alert.delivery?.push ? "On" : "Off"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(alert.id)}
                    disabled={removingId === alert.id}
                    className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-900 disabled:opacity-60"
                  >
                    {removingId === alert.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
