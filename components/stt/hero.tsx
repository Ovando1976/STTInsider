import Image from "next/image";
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

      <div className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 pt-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div className="text-center md:text-left">
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

          <p className="mt-6 max-w-2xl text-sm font-medium text-sky-50/90 md:text-base">
            Explore beaches, dining, shopping, and island essentials with a
            premium St. Thomas experience designed for both visitors and
            locals.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
            <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white">
              Real-time island intel
            </span>
            <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white">
              Verified local data
            </span>
          </div>
        </div>

        <figure className="group overflow-hidden rounded-[32px] border border-white/20 bg-white/10 p-2 shadow-[0_22px_60px_rgba(2,6,23,0.35)] backdrop-blur">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[24px]">
            <Image
              src="/images/yacht-haven-grande-marina.jpg"
              alt="Saint Thomas Harbour"
              fill
              sizes="(min-width: 1024px) 44vw, 92vw"
              className="object-cover transition duration-500 group-hover:scale-105"
              priority
            />
          </div>
          <figcaption className="px-1 pb-1 pt-3 text-[11px] font-black uppercase tracking-[0.2em] text-sky-100/95">
            Saint Thomas Harbour
          </figcaption>
        </figure>
      </div>
    </header>
  );
}
