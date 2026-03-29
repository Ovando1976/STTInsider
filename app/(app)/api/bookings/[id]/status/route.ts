import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/openvi-admin";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

const allowedStatuses: BookingStatus[] = [
  "pending",
  "confirmed",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const raw = await request.text();

    if (!raw.trim()) {
      return NextResponse.json(
        { error: "Empty request body." },
        { status: 400 }
      );
    }

    const body = JSON.parse(raw) as {
      status?: BookingStatus;
      assignedDriverId?: string | null;
    };

    if (!body.status || !allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid booking status." },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection("bookings").doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    await docRef.update({
      status: body.status,
      assignedDriverId: body.assignedDriverId ?? null,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      bookingId: id,
      status: body.status,
    });
  } catch (error) {
    console.error("Booking status update error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update booking status.",
      },
      { status: 500 }
    );
  }
}