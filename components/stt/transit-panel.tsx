"use client";

export function TransitPanel() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-10">
      <div className="relative h-[360px] overflow-hidden rounded-[36px] border-4 border-white bg-slate-200">
        <div className="absolute left-[10%] right-[10%] top-1/2 h-2 -translate-y-1/2 rounded bg-slate-400" />
        <div className="absolute left-[18%] top-[46%] text-3xl">🚐</div>
        <div className="absolute left-[64%] top-[46%] text-3xl">🚐</div>
      </div>

      <div className="rounded-[40px] border border-slate-100 bg-white p-10">
        <h3 className="text-2xl font-black tracking-tight text-slate-900">
          Safari Bus Loop
        </h3>
        <p className="mt-3 text-sm font-medium text-slate-500">
          This panel is ready to become a real transit experience with route
          layers, stop timing, ferry schedules, and taxi guidance.
        </p>
      </div>
    </div>
  );
}
