import { adminDb } from "@/lib/firebase/openvi-admin";
import { StatusPill } from "@/components/operator/status-pill";

async function updateBookingStatus(id: string, formData: FormData) {
  "use server";

  const status = String(formData.get("status") ?? "");
  const allowed = new Set([
    "pending",
    "confirmed",
    "assigned",
    "in_progress",
    "completed",
    "cancelled",
  ]);

  if (!allowed.has(status)) return;

  await adminDb.collection("bookings").doc(id).update({
    status,
    updatedAt: new Date().toISOString(),
  });
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const snapshot = await adminDb.collection("bookings").doc(id).get();

  if (!snapshot.exists) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          Booking not found.
        </div>
      </main>
    );
  }

  const booking = {
    id: snapshot.id,
    ...snapshot.data(),
  } as any;

  const statuses = [
    "pending",
    "confirmed",
    "assigned",
    "in_progress",
    "completed",
    "cancelled",
  ] as const;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">
              Booking
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {booking.customer?.fullName ?? "Unknown rider"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {booking.pickup?.label} → {booking.dropoff?.label}
            </p>
          </div>

          <StatusPill status={booking.status} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 p-5">
              <h2 className="text-lg font-black text-slate-900">Rider</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Name
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {booking.customer?.fullName ?? "--"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Phone
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {booking.customer?.phone ?? "--"}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Email
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {booking.customer?.email ?? "--"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 p-5">
              <h2 className="text-lg font-black text-slate-900">Trip</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Pickup
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {booking.pickup?.label ?? "--"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {booking.pickup?.estateName ?? "Estate pending"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Dropoff
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {booking.dropoff?.label ?? "--"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {booking.dropoff?.estateName ?? "Estate pending"}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Pickup time
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {booking.trip?.pickupTime ?? "--"}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Ride type
                  </div>
                  <div className="mt-1 text-sm font-semibold capitalize text-slate-900">
                    {booking.trip?.rideType ?? "--"}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Riders
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {booking.trip?.riders ?? "--"}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Route class
                  </div>
                  <div className="mt-1 text-sm font-semibold capitalize text-slate-900">
                    {booking.routeMeta?.routeClass?.replace("_", " ") ?? "--"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 p-5">
              <h2 className="text-lg font-black text-slate-900">Pricing</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Estimated total</span>
                  <span className="font-bold text-slate-900">
                    ${Number(booking.pricing?.totalEstimate ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Distance</span>
                  <span className="font-bold text-slate-900">
                    {booking.routeMeta?.estimatedDistanceMiles ?? "--"} mi
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Payment</span>
                  <span className="font-bold capitalize text-slate-900">
                    {booking.trip?.paymentMethod ?? "--"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 p-5">
              <h2 className="text-lg font-black text-slate-900">Update status</h2>

              <form
                action={updateBookingStatus.bind(null, id)}
                className="mt-4 space-y-4"
              >
                <select
                  name="status"
                  defaultValue={booking.status}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700"
                >
                  Save status
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}