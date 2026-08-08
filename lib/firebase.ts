import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Skip client init when public Firebase env is incomplete — Supabase is the
// primary identity path; a half-configured Firebase app fatally crashes the UI.
const hasFirebaseConfig = !!(firebaseConfig.projectId && firebaseConfig.apiKey)

/** Mutable live bindings — may be null until ensureFirebase() succeeds in the browser. */
export let app: FirebaseApp | null = null
export let db: Database | null = null
export let auth: Auth | null = null

/**
 * Idempotent client-only Firebase init. Safe to call from effects / click
 * handlers. Returns true when auth + db are ready.
 *
 * Top-level `typeof window` init alone is not enough: if this module is first
 * evaluated during SSR, exports stay null unless something calls ensure later.
 */
export function ensureFirebase(): boolean {
  if (typeof window === 'undefined') return false
  if (!hasFirebaseConfig) return false
  if (app && db && auth) return true

  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  db = getDatabase(app)
  auth = getAuth(app)
  return !!(app && db && auth)
}

// Eager warm when this module first evaluates in the browser (landing, etc.).
ensureFirebase()
