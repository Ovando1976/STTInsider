import type { WeatherDay } from "@/types/stt";

export function WeatherChip({ days }: { days: WeatherDay[] }) {
  if (!days.length) {
    return (
      <div className="rounded-2xl bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/90">
        Weather syncing...
      </div>
    );
  }

  return (
    <div className="flex items-center overflow-hidden rounded-2xl bg-white/10 text-white">
      {days.map((day) => (
        <div
          key={day.label}
          className="flex min-w-[76px] flex-col items-center px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider"
        >
          <span>{day.label}</span>
          <span className="mt-1 flex items-center gap-1 text-xs">
            <span>{day.icon}</span>
            <span>{day.high}°</span>
          </span>
        </div>
      ))}
    </div>
  );
}
