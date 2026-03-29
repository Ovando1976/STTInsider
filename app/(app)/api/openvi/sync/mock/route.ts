import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/openvi-admin";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";

export async function POST() {
  try {
    const ref = adminDb.collection(OPENVI_COLLECTIONS.bills).doc("bill-36-0012");

    await ref.set(
      {
        updatedAt: new Date().toISOString(),
        lastActionAt: new Date().toISOString(),
        ai: {
          whyItMatters:
            "This record was refreshed through the mock sync endpoint to verify the live update pipeline.",
          affectedGroups: ["residents", "businesses", "utility customers"],
          keyDeadlines: ["Quarterly reporting"],
          keyNumbers: ["1 refreshed document"],
        },
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      message: "Mock sync completed. Live listeners should update automatically.",
    });
  } catch (error) {
    console.error("OPENVI mock sync failed", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Mock sync failed.",
      },
      { status: 500 }
    );
  }
}