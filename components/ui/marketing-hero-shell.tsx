import type { ReactNode } from "react";

type MarketingHeroShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function MarketingHeroShell({
  eyebrow,
  title,
  description,
  children,
}: MarketingHeroShellProps) {
  return (
    <main className="min-h-screen px-6 py-10 text-slate-900">
      <section className="app-surface relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] p-8 md:p-12">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-emerald-300/15 blur-3xl" />

        <div className="relative">
          <span className="app-chip">{eyebrow}</span>
          <h1 className="app-title-gradient mt-4 text-4xl font-black tracking-tight md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
            {description}
          </p>

          {children ? <div className="mt-8">{children}</div> : null}
        </div>
      </section>
    </main>
  );
}
