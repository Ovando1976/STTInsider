"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  createUserAlert,
  deleteUserAlert,
  type OpenVIAlertType,
} from "@/lib/openvi/user-alerts";

type FollowButtonProps = {
  type: OpenVIAlertType;
  targetId: string;
  targetLabel: string;
};

export function FollowButton({
  type,
  targetId,
  targetLabel,
}: FollowButtonProps) {
  const { user, loading } = useAuthUser();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [alertId, setAlertId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setAlertId(null);
      return;
    }

    const q = query(
      collection(db, "openvi_user_alerts"),
      where("userId", "==", user.uid),
      where("type", "==", type),
      where("targetId", "==", targetId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setAlertId(null);
          return;
        }

        setAlertId(snapshot.docs[0].id);
      },
      (err) => {
        console.error(err);
        setError("Could not load follow state.");
      }
    );

    return () => unsubscribe();
  }, [user?.uid, type, targetId]);

  async function handleToggle() {
    if (!user?.uid) {
      setError("You must be signed in to follow items.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (alertId) {
        await deleteUserAlert(alertId);
      } else {
        const result = await createUserAlert({
          userId: user.uid,
          type,
          targetId,
          targetLabel,
        });

        if (!result.ok) {
          throw new Error("Failed to save follow.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Could not update your follow setting.");
    } finally {
      setSaving(false);
    }
  }

  const label = alertId ? "Following" : "Follow";

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading || saving}
        className="rounded-full border border-sky-800 bg-sky-950/40 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-900/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : label}
      </button>

      {!user && !loading ? (
        <p className="text-xs text-slate-400">Sign in to save alerts.</p>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
