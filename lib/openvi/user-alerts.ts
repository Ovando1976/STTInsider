"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export type OpenVIAlertType =
  | "bill"
  | "agency"
  | "official"
  | "vendor"
  | "issue";

export type OpenVIUserAlert = {
  id: string;
  userId: string;
  type: OpenVIAlertType;
  targetId: string;
  targetLabel: string;
  delivery: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  createdAt?: unknown;
  updatedAt?: unknown;
};

const COLLECTION_NAME = "openvi_user_alerts";

function mapAlertDoc(docSnap: QueryDocumentSnapshot): OpenVIUserAlert {
  const data = docSnap.data() as Omit<OpenVIUserAlert, "id">;
  return {
    id: docSnap.id,
    ...data,
  };
}

export async function createUserAlert(input: {
  userId: string;
  type: OpenVIAlertType;
  targetId: string;
  targetLabel: string;
}) {
  const existing = await getDocs(
    query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", input.userId),
      where("type", "==", input.type),
      where("targetId", "==", input.targetId)
    )
  );

  if (!existing.empty) {
    return {
      ok: true,
      alreadyExists: true,
      id: existing.docs[0].id,
    };
  }

  const ref = await addDoc(collection(db, COLLECTION_NAME), {
    userId: input.userId,
    type: input.type,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    delivery: {
      email: true,
      push: false,
      inApp: true,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    ok: true,
    alreadyExists: false,
    id: ref.id,
  };
}

export async function deleteUserAlert(alertId: string) {
  await deleteDoc(doc(db, COLLECTION_NAME, alertId));
}

export async function getUserAlerts(userId: string) {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION_NAME), where("userId", "==", userId))
  );

  return snapshot.docs.map(mapAlertDoc);
}
