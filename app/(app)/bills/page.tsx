import { BillsClient } from "@/components/openvi/bills-client";
import { getBillsPageData } from "@/lib/openvi/firestore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BillsPage() {
  const initialData = await getBillsPageData();
  return <BillsClient initialData={initialData} />;
}