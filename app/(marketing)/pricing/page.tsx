import { MarketingHeroShell } from "@/components/ui/marketing-hero-shell";

export default function PricingPage() {
  return (
    <MarketingHeroShell
      eyebrow="Pricing"
      title="Simple plans, professional outcomes."
      description="Start free, scale as your operations grow, and unlock advanced mapping, analytics, and real-time workflows without platform bloat."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="app-card p-4">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Starter</div>
          <div className="mt-1 text-xl font-black text-slate-900">$0</div>
        </div>
        <div className="app-card p-4">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Pro</div>
          <div className="mt-1 text-xl font-black text-slate-900">Custom</div>
        </div>
        <div className="app-card p-4">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Enterprise</div>
          <div className="mt-1 text-xl font-black text-slate-900">Contact us</div>
        </div>
      </div>
    </MarketingHeroShell>
  );
}
