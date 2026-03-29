import { MarketingHeroShell } from "@/components/ui/marketing-hero-shell";

export default function MarketingHomePage() {
  return (
    <MarketingHeroShell
      eyebrow="STT Insider"
      title="The professional command center for island life."
      description="Discover neighborhoods, monitor civic updates, and plan movement across the U.S. Virgin Islands with one premium, unified experience."
    >
      <div className="flex flex-wrap gap-3">
        <span className="app-chip">Live weather</span>
        <span className="app-chip">Estate mapping</span>
        <span className="app-chip">Transit-ready</span>
      </div>
    </MarketingHeroShell>
  );
}
