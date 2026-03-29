import { WeatherChip } from "./weather-chip";
import type { WeatherDay } from "@/types/stt";

export function Hero({ weather }: { weather: WeatherDay[] }) {
  return (
    <header className="hero-gradient relative overflow-hidden text-white">
      <nav className="glass-nav sticky top-0 z-40 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest">
              STT Insider
            </div>
            <WeatherChip days={weather} />
          </div>

          <div className="hidden text-center lg:block">
            <h2 className="text-xl font-black uppercase tracking-tight">
              St. Thomas Super-App
            </h2>
          </div>

          <div className="text-[10px] font-black uppercase tracking-widest text-white/80">
            Discovery • Concierge • Transit
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 pb-16 pt-10 text-center">
        <span className="mb-6 inline-block rounded-full border border-white/10 bg-sky-400/30 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-white">
          St. Thomas Premier Companion
        </span>

        <h1 className="text-5xl font-black leading-none tracking-tighter md:text-7xl">
          Island
          <br />
          <span className="text-sky-200 underline decoration-sky-300/40">
            Discovery.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-sm font-medium text-sky-50/90 md:text-base">
          Explore beaches, dining, shopping, and island essentials with a
          premium St. Thomas experience designed for both visitors and locals.
        </p>
      </div>
    </header>
  );
}
