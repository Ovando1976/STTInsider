import { HearingsClient } from "@/components/openvi/hearings-client";
import { getReferenceData } from "@/lib/openvi/firestore";
import { adminDb } from "@/lib/firebase/openvi-admin";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";
import type { Hearing } from "@/types/openvi";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getHearingsPageData() {
  const hearingsSnapshot = await adminDb
    .collection(OPENVI_COLLECTIONS.hearings)
    .orderBy("scheduledAt", "asc")
    .limit(100)
    .get();

  const hearings = hearingsSnapshot.docs.map(
    (doc) => ({ id: doc.id, ...(doc.data() as Omit<Hearing, "id">) } as Hearing)
  );

  const reference = await getReferenceData();

  return {
    hearings,
    agencies: reference.agencies,
    bills: reference.issues ? [] : [], // replaced below
    issues: reference.issues,
  };
}

export default async function HearingsPage() {
  const reference = await getReferenceData();

  const hearingsSnapshot = await adminDb
    .collection(OPENVI_COLLECTIONS.hearings)
    .orderBy("scheduledAt", "asc")
    .limit(100)
    .get();

  const billsSnapshot = await adminDb
    .collection(OPENVI_COLLECTIONS.bills)
    .orderBy("lastActionAt", "desc")
    .limit(200)
    .get();

  const hearings = hearingsSnapshot.docs.map(
    (doc) => ({ id: doc.id, ...(doc.data() as Omit<Hearing, "id">) } as Hearing)
  );

  const bills = billsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return (
    <HearingsClient
      initialData={{
        hearings,
        agencies: reference.agencies,
        issues: reference.issues,
      }}
    />
  );
}
