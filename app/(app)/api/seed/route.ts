import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/openvi-admin";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";
import { openVISeed } from "@/lib/data/openvi-seed";

async function upsertMany<T extends { id: string }>(
  collectionName: string,
  items: T[]
) {
  const batch = adminDb.batch();

  for (const item of items) {
    const ref = adminDb.collection(collectionName).doc(item.id);
    batch.set(ref, item, { merge: true });
  }

  await batch.commit();
}

export async function POST() {
  try {
    await Promise.all([
      upsertMany(OPENVI_COLLECTIONS.agencies, openVISeed.agencies),
      upsertMany(OPENVI_COLLECTIONS.officials, openVISeed.officials),
      upsertMany(OPENVI_COLLECTIONS.issues, openVISeed.issues),
      upsertMany(OPENVI_COLLECTIONS.bills, openVISeed.bills),
      upsertMany(OPENVI_COLLECTIONS.hearings, openVISeed.hearings),
      upsertMany(OPENVI_COLLECTIONS.contracts, openVISeed.contracts),
      upsertMany(OPENVI_COLLECTIONS.budgets, openVISeed.budgets),
      upsertMany(OPENVI_COLLECTIONS.promises, openVISeed.promises),
      upsertMany(OPENVI_COLLECTIONS.vendors, openVISeed.vendors),
    ]);

    return NextResponse.json({
      ok: true,
      message: "OPENVI seed data written to Firestore.",
    });
  } catch (error) {
    console.error("OPENVI seed failed", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to seed OPENVI data.",
      },
      { status: 500 }
    );
  }
}