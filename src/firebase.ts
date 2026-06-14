import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth } from 'firebase/auth';

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

// Bağlantı sağlamlığı: bellek önbelleği (IndexedDB devre dışı — mobilde
// kalıcı önbellek kaynaklı boş-ekran ihtimalini eler) + long-polling otomatik
// algılama (mobil veri/proxy ağlarında WebChannel engellenirse devreye girer).
function firestoreKur(): Firestore {
  return initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
}

export const db: Firestore = firestoreKur();

export const auth: Auth = getAuth(app);

let authReady: Promise<void> | null = null;

// Teşhis: anonim giriş durumu (UI'da gösterilir).
export const authDurum: { uid: string | null; hata: string | null } = {
  uid: null,
  hata: null,
};

// Anonim giriş — Firestore kuralları kimliği doğrulanmış istemci ister.
// currentUser hazır olunca çözülür; hata/askıda kalma durumunda da (zaman aşımı)
// çözülür ki UI kilitlenmesin ve teşhis görünsün.
export function ensureAuth(): Promise<void> {
  if (!authReady) {
    authReady = new Promise<void>((resolve) => {
      let bitti = false;
      const tamam = () => {
        if (bitti) return;
        bitti = true;
        resolve();
      };
      if (auth.currentUser) {
        authDurum.uid = auth.currentUser.uid;
        return tamam();
      }
      const off = onAuthStateChanged(auth, (user) => {
        if (user) {
          authDurum.uid = user.uid;
          authDurum.hata = null;
          off();
          tamam();
        }
      });
      signInAnonymously(auth).catch((err) => {
        authDurum.hata = err?.code || err?.message || 'bilinmeyen-hata';
        console.warn('Anonim giriş başarısız:', err?.code, err?.message);
        off();
        tamam();
      });
      // Askıda kalmaya karşı zaman aşımı
      setTimeout(() => {
        if (!auth.currentUser && !authDurum.hata) authDurum.hata = 'zaman-asimi (8sn)';
        tamam();
      }, 8000);
    });
  }
  return authReady;
}

// Girişin gerçekten tamamlanmasını bekler (yeniden bağlanma için).
export function authYenidenDene(): Promise<void> {
  authReady = null;
  authDurum.hata = null;
  return ensureAuth();
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
