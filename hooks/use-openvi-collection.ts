"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
  type WhereFilterOp,
  type DocumentData,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";

type Filter = {
  field: string;
  op: WhereFilterOp;
  value: unknown;
};

type UseOpenVICollectionOptions<T> = {
  collectionName: string;
  orderByField?: string;
  orderDirection?: "asc" | "desc";
  limitCount?: number;
  filters?: Filter[];
  initialData?: T[];
  enabled?: boolean;
};

export function useOpenVICollection<T extends { id: string }>(
  options: UseOpenVICollectionOptions<T>
) {
  const {
    collectionName,
    orderByField,
    orderDirection = "desc",
    limitCount,
    filters = [],
    initialData = [],
    enabled = true,
  } = options;

  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState<boolean>(
    enabled && initialData.length === 0
  );
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const constraints: QueryConstraint[] = [];

    for (const filter of filters) {
      constraints.push(
        where(filter.field, filter.op, filter.value as DocumentData)
      );
    }

    if (orderByField) {
      constraints.push(orderBy(orderByField, orderDirection));
    }

    if (typeof limitCount === "number" && limitCount > 0) {
      constraints.push(firestoreLimit(limitCount));
    }

    const q = query(collection(db, collectionName), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...(doc.data() as Omit<T, "id">) } as T)
        );
        setData(next);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error(`Firestore listener failed for ${collectionName}`, err);
        setError(err.message || "Failed to load collection.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [
    collectionName,
    enabled,
    filters,
    limitCount,
    orderByField,
    orderDirection,
  ]);

  return {
    data,
    loading,
    error,
  };
}
