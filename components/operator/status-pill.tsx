import { cn } from "@/lib/utils";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

const statusStyles: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-sky-100 text-sky-800 border-sky-200",
  assigned: "bg-violet-100 text-violet-800 border-violet-200",
  in_progress: "bg-indigo-100 text-indigo-800 border-indigo-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 border-rose-200",
};

export function StatusPill({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize",
        statusStyles[status]
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}