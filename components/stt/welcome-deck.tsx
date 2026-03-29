"use client";

type WelcomeDeckProps = {
  onOpenExplore: () => void;
  onOpenConcierge: () => void;
  onOpenTransit: () => void;
};

export function WelcomeDeck({
  onOpenExplore,
  onOpenConcierge,
  onOpenTransit,
}: WelcomeDeckProps) {
  return (
    <section className="mb-6 overflow-hidden rounded-[36px] border border-white/50 bg-white/70 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
      <div className="relative overflow-hidden px-6 py-7 md:px-8 md:py-9">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_28%)]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full bg-sky-100/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
              St. Thomas premier companion
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
              Island
              <span className="block bg-gradient-to-r from-sky-700 to-cyan-500 bg-clip-text text-transparent">
                Discovery.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Explore beaches, dining, shopping, and island essentials through
              one seamless journey across discovery, concierge, transit, and passport.
            </p>
          </div>

          <div className="w-full max-w-sm rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 text-xl text-white">
                ✨
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">
                  Your Island Concierge
                </div>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-600">
                  Welcome to the USVI
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              I’ll help guests and locals discover the right place, plan the
              experience, and get there naturally.
            </p>

            <button
              type="button"
              onClick={onOpenConcierge}
              className="mt-5 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-sky-700"
            >
              Ask Me Anything
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t border-slate-200/70 bg-white/60 p-5 md:grid-cols-3 md:p-6">
        <button
          type="button"
          onClick={onOpenExplore}
          className="group rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Explore
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            See Places
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Browse beaches, food, shopping, and island life.
          </p>
          <div className="mt-5 text-sm font-bold text-sky-700">
            Open discovery →
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenConcierge}
          className="group rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Concierge
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            Plan Around Your Spots
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Get guidance, combinations, timing, and local context.
          </p>
          <div className="mt-5 text-sm font-bold text-sky-700">
            Start planning →
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenTransit}
          className="group rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Get There
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            Book Transport Smoothly
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Move from the place you discovered to a real island trip.
          </p>
          <div className="mt-5 text-sm font-bold text-sky-700">
            Open transit →
          </div>
        </button>
      </div>
    </section>
  );
}