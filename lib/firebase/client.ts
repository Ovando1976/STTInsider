import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function hasValidFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

export const firebaseEnabled = hasValidFirebaseConfig();

function getClientApp(): FirebaseApp | null {
  if (!firebaseEnabled) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const clientApp: FirebaseApp | null = getClientApp();
export const auth: Auth | null = clientApp ? getAuth(clientApp) : null;
export const db: Firestore | null = clientApp ? getFirestore(clientApp) : null;
export const storage: FirebaseStorage | null = clientApp
  ? getStorage(clientApp)
  : null;
