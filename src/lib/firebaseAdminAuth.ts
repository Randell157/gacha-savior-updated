import "server-only";

import { getAuth } from "firebase-admin/auth";
import { adminApp } from "@/lib/firebaseAdmin";

// Kept apart from firebaseAdmin.ts so that only the routes needing it load it: a
// failure in this package's dependencies once took username login down as well.
export const adminAuth = getAuth(adminApp);
