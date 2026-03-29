import { ContractsClient } from "@/components/openvi/contracts-client";
import { adminDb } from "@/lib/firebase/openvi-admin";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";
import { getReferenceData } from "@/lib/openvi/firestore";
import type { Bill, Contract } from "@/types/openvi";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ContractsPage() {
  const reference = await getReferenceData();

  const contractsSnapshot = await adminDb
    .collection(OPENVI_COLLECTIONS.contracts)
    .orderBy("awardDate", "desc")
    .limit(100)
    .get();

  const billsSnapshot = await adminDb
    .collection(OPENVI_COLLECTIONS.bills)
    .orderBy("lastActionAt", "desc")
    .limit(200)
    .get();

  const contracts = contractsSnapshot.docs.map(
    (doc) => ({ id: doc.id, ...(doc.data() as Omit<Contract, "id">) }) as Contract
  );

  const bills = billsSnapshot.docs.map(
    (doc) => ({ id: doc.id, ...(doc.data() as Omit<Bill, "id">) }) as Bill
  );

  return (
    <ContractsClient
      initialData={{
        contracts,
        agencies: reference.agencies,
        vendors: reference.vendors,
        bills,
        issues: reference.issues,
      }}
    />
  );
}