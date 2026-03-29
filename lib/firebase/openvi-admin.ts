import "server-only";

import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getPrivateKey() {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) {
    throw new Error("Missing FIREBASE_PRIVATE_KEY");
  }
  return key.replace(/\\n/g, "\n");
}

function createAdminApp(): App {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail) {
    throw new Error(
      "Missing Firebase admin env vars: FIREBASE_PROJECT_ID or FIREBASE_CLIENT_EMAIL"
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export const adminApp = getApps().length ? getApps()[0]! : createAdminApp();
export const adminDb = getFirestore(adminApp);