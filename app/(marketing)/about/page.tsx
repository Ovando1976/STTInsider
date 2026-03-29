import { MarketingHeroShell } from "@/components/ui/marketing-hero-shell";

export default function AboutPage() {
  return (
    <MarketingHeroShell
      eyebrow="About"
      title="Built with local context, not generic templates."
      description="STT Insider combines transportation, neighborhood intelligence, and estate geography into a cohesive system tailored to how the Virgin Islands actually operate."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="app-card p-4 text-sm font-semibold text-slate-700">Community-first data</div>
        <div className="app-card p-4 text-sm font-semibold text-slate-700">Operational clarity</div>
        <div className="app-card p-4 text-sm font-semibold text-slate-700">Island-grade UX</div>
      </div>
    </MarketingHeroShell>
  );
}
