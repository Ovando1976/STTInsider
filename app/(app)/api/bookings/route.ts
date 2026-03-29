import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/openvi-admin";

type BookingRequestBody = {
  customer: {
    fullName: string;
    phone: string;
    email?: string | null;
  };
  trip: {
    pickupTime: string;
    riders: number;
    rideType: "standard" | "xl" | "premium";
    paymentMethod: "visa" | "mastercard" | "applepay";
    tipPercent: number;
    promoCode?: string | null;
    preferences: {
      quietRide: boolean;
      extraLuggage: boolean;
      accessibility: boolean;
    };
  };
  pickup: {
    label: string;
    addressText?: string | null;
    lat: number;
    lng: number;
    estateGeoid?: string | null;
    estateName?: string | null;
    islandCode?: "STT" | "STJ" | "STX" | "WAT" | "UNK";
    zoneType?: string;
  };
  dropoff: {
    label: string;
    addressText?: string | null;
    lat: number;
    lng: number;
    estateGeoid?: string | null;
    estateName?: string | null;
    islandCode?: "STT" | "STJ" | "STX" | "WAT" | "UNK";
    zoneType?: string;
  };
  pricing: {
    baseFare: number;
    distanceFare: number;
    zoneAdjustment: number;
    surgeMultiplier: number;
    totalEstimate: number;
    currency: "USD";
  };
  routeMeta: {
    sameEstate: boolean;
    sameIsland: boolean;
    estimatedDistanceMiles: number;
    routeClass: string;
    matchedRouteLabel?: string | null;
  };
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();

    if (!raw.trim()) {
      return badRequest("Empty request body.");
    }

    const body = JSON.parse(raw) as BookingRequestBody;

    if (!body.customer?.fullName?.trim()) {
      return badRequest("Customer name is required.");
    }

    if (!body.customer?.phone?.trim()) {
      return badRequest("Customer phone is required.");
    }

    if (!body.pickup?.label || !body.dropoff?.label) {
      return badRequest("Pickup and dropoff are required.");
    }

    if (
      typeof body.pickup.lat !== "number" ||
      typeof body.pickup.lng !== "number" ||
      typeof body.dropoff.lat !== "number" ||
      typeof body.dropoff.lng !== "number"
    ) {
      return badRequest("Pickup and dropoff coordinates are required.");
    }

    if (!body.pricing || typeof body.pricing.totalEstimate !== "number") {
      return badRequest("Pricing is required.");
    }

    const now = new Date().toISOString();

    const docRef = adminDb.collection("bookings").doc();

    const booking = {
      id: docRef.id,
      status: "pending",
      customer: {
        fullName: body.customer.fullName.trim(),
        phone: body.customer.phone.trim(),
        email: body.customer.email?.trim() || null,
      },
      trip: {
        pickupTime: body.trip.pickupTime,
        riders: body.trip.riders,
        rideType: body.trip.rideType,
        paymentMethod: body.trip.paymentMethod,
        tipPercent: body.trip.tipPercent,
        promoCode: body.trip.promoCode?.trim() || null,
        preferences: body.trip.preferences,
      },
      pickup: {
        label: body.pickup.label,
        addressText: body.pickup.addressText ?? null,
        lat: body.pickup.lat,
        lng: body.pickup.lng,
        estateGeoid: body.pickup.estateGeoid ?? null,
        estateName: body.pickup.estateName ?? null,
        islandCode: body.pickup.islandCode ?? "UNK",
        zoneType: body.pickup.zoneType ?? "estate",
      },
      dropoff: {
        label: body.dropoff.label,
        addressText: body.dropoff.addressText ?? null,
        lat: body.dropoff.lat,
        lng: body.dropoff.lng,
        estateGeoid: body.dropoff.estateGeoid ?? null,
        estateName: body.dropoff.estateName ?? null,
        islandCode: body.dropoff.islandCode ?? "UNK",
        zoneType: body.dropoff.zoneType ?? "estate",
      },
      pricing: body.pricing,
      routeMeta: body.routeMeta,
      source: "web",
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(booking);

    return NextResponse.json({
      ok: true,
      bookingId: docRef.id,
      status: "pending",
    });
  } catch (error) {
    console.error("Booking create error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create booking.",
      },
      { status: 500 }
    );
  }
}
