import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const NS = (import.meta.env.VITE_VARDIYA_NAMESPACE as string) || 'vardiya';

export const app: FirebaseApp = initializeApp(firebaseConfig);

// Offline-first: kalıcı yerel önbellek + çoklu sekme yöneticisi.
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const auth: Auth = getAuth(app);

let authReady: Promise<void> | null = null;

// Anonim giriş — Firestore kuralları kimliği doğrulanmış istemci ister.
export function ensureAuth(): Promise<void> {
  if (!authReady) {
    authReady = signInAnonymously(auth)
      .then(() => undefined)
      .catch((err) => {
        // Offline iken anonim giriş başarısız olabilir; önbellekten okumaya
        // devam edilebilmesi için hatayı yutuyoruz.
        console.warn('Anonim giriş başarısız (offline olabilir):', err?.message);
      });
  }
  return authReady;
}
