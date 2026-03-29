import { DashboardClient } from "@/components/openvi/dashboard-client";
import { getDashboardData } from "@/lib/openvi/firestore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const initialData = await getDashboardData();
  return <DashboardClient initialData={initialData} />;
}