import Link from "next/link";
import { StatusPill } from "@/components/operator/status-pill";

type BookingCardProps = {
  booking: {
    id: string;
    status:
      | "pending"
      | "confirmed"
      | "assigned"
      | "in_progress"
      | "completed"
      | "cancelled";
    customer?: {
      fullName?: string;
      phone?: string;
    };
    pickup?: {
      label?: string;
      estateName?: string | null;
    };
    dropoff?: {
      label?: string;
      estateName?: string | null;
    };
    pricing?: {
      totalEstimate?: number;
    };
    trip?: {
      pickupTime?: string;
      rideType?: string;
      riders?: number;
    };
    routeMeta?: {
      routeClass?: string;
      estimatedDistanceMiles?: number;
    };
    createdAt?: string;
  };
};

export function BookingCard({ booking }: BookingCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-black text-slate-900">
            {booking.customer?.fullName ?? "Unknown rider"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {booking.customer?.phone ?? "No phone"}
          </div>
        </div>

        <StatusPill status={booking.status} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
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
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
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

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Fare
          </div>
          <div className="mt-1 font-bold text-slate-900">
            ${Number(booking.pricing?.totalEstimate ?? 0).toFixed(2)}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Pickup time
          </div>
          <div className="mt-1 font-bold text-slate-900">
            {booking.trip?.pickupTime ?? "--"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Riders
          </div>
          <div className="mt-1 font-bold text-slate-900">
            {booking.trip?.riders ?? "--"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Route class
          </div>
          <div className="mt-1 font-bold capitalize text-slate-900">
            {booking.routeMeta?.routeClass?.replace("_", " ") ?? "--"}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          Booking ID: <span className="font-mono">{booking.id}</span>
        </div>

        <Link
          href={`/bookings/${booking.id}`}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
        >
          Open booking
        </Link>
      </div>
    </div>
  );
}