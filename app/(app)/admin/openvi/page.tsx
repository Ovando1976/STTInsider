import { AdminSyncPanel } from "@/components/openvi/admin-sync-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function OpenVIAdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-400">
          OPENVI
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          Admin Console
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-300">
          Manage seeding, mock syncs, and eventually live ingestion workflows for
          bills, hearings, contracts, budgets, and agency updates.
        </p>

        <div className="mt-8">
          <AdminSyncPanel />
        </div>
      </div>
    </main>
  );
}