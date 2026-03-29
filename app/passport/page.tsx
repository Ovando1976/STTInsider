import { PassportPanel } from "@/components/stt/passport-panel";
import { STT_BUSINESSES } from "@/lib/stt/data";

export default function PassportPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <PassportPanel checkins={[]} businesses={STT_BUSINESSES} />
    </main>
  );
}
