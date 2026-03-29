import { AlertsClient } from "@/components/openvi/alerts-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AlertsPage() {
  return <AlertsClient />;
}