import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';

// Firebase web yapılandırması. Web config istemciye gömülür ve gizli değildir;
// güvenlik Firestore kuralları + Auth ile sağlanır. Bu yüzden gerçek değerleri
// varsayılan olarak gömüyoruz; .env varsa onunla geçersiz kılınabilir.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCO3uqO0Eo0qExmM3uCjJFjMd-NSJqEm-k',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'vardiya-9b064.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'vardiya-9b064',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'vardiya-9b064.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '716599746954',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:716599746954:web:afaf6f821592d0f68aa873',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-0HD8Q2H3VB',
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

// Analytics yalnızca destekli web ortamında (Electron/Capacitor'da atlanır).
export function analyticsBaslat(): void {
  if (typeof window === 'undefined') return;
  import('firebase/analytics')
    .then(async ({ isSupported, getAnalytics }) => {
      if (await isSupported()) getAnalytics(app);
    })
    .catch(() => {
      /* analytics opsiyonel; hata yutulur */
    });
}
