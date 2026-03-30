import { adminDb } from "@/lib/firebase/openvi-admin";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const snapshot = await adminDb
    .collection("bookings")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const bookings = snapshot.docs.map((doc) => doc.data());

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Bookings
      </h1>

      <div className="mt-8 grid gap-4">
        {bookings.map((booking: any) => (
          <div
            key={booking.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  {booking.customer?.fullName}
                </div>
                <div className="text-sm text-slate-500">
                  {booking.customer?.phone}
                </div>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {booking.status}
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-700">
              {booking.pickup?.label} → {booking.dropoff?.label}
            </div>

            <div className="mt-2 text-sm text-slate-500">
              {booking.trip?.rideType} · {booking.trip?.pickupTime} · $
              {booking.pricing?.totalEstimate?.toFixed?.(2) ??
                booking.pricing?.totalEstimate}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
