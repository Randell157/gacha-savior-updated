import { initializeApp , getApp, getApps} from "firebase/app";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from "firebase/auth";

// Each variable is read by its full name so Next.js can inline it into the
// browser bundle. Values come from .env.local locally and from the Vercel
// project settings when deployed.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missing.length) {
  throw new Error(
    `Missing Firebase config: ${missing.join(", ")}. Copy .env.example to .env.local and fill in the values.`
  );
}

// Initialize Firebase
const isFirstInit = !getApps().length;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// Parsed game data uses `undefined` for missing optional fields, which
// Firestore rejects unless told to skip them. initializeFirestore can only run
// once per app, so hot reloads fall back to the existing instance.
let db: Firestore;
try {
  db = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  db = getFirestore(app);
}
const auth = getAuth(app);

// `npm run dev:emu` points the app at the local Firebase emulators
// (`npm run emulators`) instead of the real project.
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" && isFirstInit) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// Set persistence to local
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Persistence set to local')
  })
  .catch((error) => {
    console.error('Error setting persistence:', error)
  })

export { app, db, auth };