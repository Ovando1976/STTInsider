import { adminDb } from "@/lib/firebase/openvi-admin";
import { BookingCard } from "@/components/operator/booking-card";

type SearchParams = Promise<{
  status?: string;
}>;

const validStatuses = new Set([
  "pending",
  "confirmed",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
]);

export default async function OperatorBookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const statusFilter = validStatuses.has(params.status ?? "")
    ? params.status!
    : "pending";

  const snapshot = await adminDb
    .collection("bookings")
    .where("status", "==", statusFilter)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const bookings = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const filters = [
    "pending",
    "confirmed",
    "assigned",
    "in_progress",
    "completed",
    "cancelled",
  ] as const;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
              Operator dashboard
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              Bookings
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage incoming rides, confirm requests, and move trips through the workflow.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {filters.map((status) => {
            const active = status === statusFilter;

            return (
              <a
                key={status}
                href={`/operator/bookings?status=${status}`}
                className={`rounded-full px-4 py-2 text-sm font-bold capitalize transition ${
                  active
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {status.replace("_", " ")}
              </a>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4">
          {bookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
              No {statusFilter.replace("_", " ")} bookings yet.
            </div>
          ) : (
            bookings.map((booking: any) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </div>
      </section>
    </main>
  );
}