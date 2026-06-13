/**
 * Firestore seed script — Başak Vardiya
 *
 * 4 şubenin saat ön ayarlarını, örnek personeli ve örnek bir haftayı yükler.
 * Diğer modüllere dokunmaz; yalnızca `vardiya/` ad alanına yazar.
 *
 * Çalıştırma:
 *   1) .env dosyasını doldurun (.env.example'dan kopyalayın)
 *   2) npm run seed
 *      (package.json: "seed": "tsx scripts/seed.ts" — .env otomatik okunur)
 */
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// ---- .env yükle ----
function envYukle() {
  try {
    const ham = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const satir of ham.split('\n')) {
      const t = satir.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim();
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    console.warn('.env bulunamadı; ortam değişkenleri kullanılacak.');
  }
}
envYukle();

const NS = process.env.VITE_VARDIYA_NAMESPACE || 'vardiya';

// Gerçek değerler varsayılan olarak gömülüdür; .env varsa override eder.
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCO3uqO0Eo0qExmM3uCjJFjMd-NSJqEm-k',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'vardiya-9b064.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'vardiya-9b064',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'vardiya-9b064.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '716599746954',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:716599746954:web:afaf6f821592d0f68aa873',
};

if (!firebaseConfig.projectId || firebaseConfig.apiKey?.includes('XXXX')) {
  console.error('HATA: Firebase yapılandırması geçersiz görünüyor.');
  process.exit(1);
}

// ---- Sabitler (constants ile aynı) ----
const GENEL_PRESET = {
  usta: {
    acilis: { baslangic: '06:30', bitis: '16:30' },
    araci: { baslangic: '08:00', bitis: '18:00' },
    kapanis: { baslangic: '09:30', bitis: '19:30' },
  },
  tezgah: {
    acilis: { baslangic: '07:00', bitis: '17:30' },
    araci: { baslangic: '09:00', bitis: '19:30' },
    kapanis: { baslangic: '10:30', bitis: 'KAPANIŞ' },
  },
};
const BAHCELIEVLER_OVERRIDE = {
  usta: { acilis: { baslangic: '07:15', bitis: '17:15' } },
  tezgah: { acilis: { baslangic: '08:00', bitis: '18:00' } },
};

const SUBELER = ['demetevler', 'bahcelievler', 'etlik', 'batikent'] as const;
type SubeKod = (typeof SUBELER)[number];

// Örnek personel (her şube)
const ORNEK_PERSONEL: Record<SubeKod, { ad: string; rol: 'usta' | 'tezgahtar' }[]> = {
  demetevler: [
    { ad: 'Mehmet Usta', rol: 'usta' },
    { ad: 'Ali Usta', rol: 'usta' },
    { ad: 'Veli Tezgah', rol: 'tezgahtar' },
    { ad: 'Hasan Tezgah', rol: 'tezgahtar' },
  ],
  bahcelievler: [
    { ad: 'Osman Usta', rol: 'usta' },
    { ad: 'Murat Tezgah', rol: 'tezgahtar' },
    { ad: 'Kemal Tezgah', rol: 'tezgahtar' },
  ],
  etlik: [
    { ad: 'Ahmet Usta', rol: 'usta' },
    { ad: 'Yusuf Tezgah', rol: 'tezgahtar' },
  ],
  batikent: [
    { ad: 'İbrahim Usta', rol: 'usta' },
    { ad: 'Salih Tezgah', rol: 'tezgahtar' },
  ],
};

// ---- Hafta yardımcısı (ISO) ----
const DAY = 86400000;
function haftaBasi(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const gun = x.getDay();
  const fark = gun === 0 ? -6 : 1 - gun;
  return new Date(x.getTime() + fark * DAY);
}
function isoTarih(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoHafta(d: Date) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const dayNr = (t.getDay() + 6) % 7;
  t.setDate(t.getDate() - dayNr + 3);
  const yil = t.getFullYear();
  const ilk = new Date(yil, 0, 4);
  const ilkNr = (ilk.getDay() + 6) % 7;
  ilk.setDate(ilk.getDate() - ilkNr + 3);
  const h = 1 + Math.round((t.getTime() - ilk.getTime()) / (7 * DAY));
  return `${yil}-W${String(h).padStart(2, '0')}`;
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  await signInAnonymously(auth);
  console.log('Anonim giriş tamam. Yazılıyor…');

  // 1) Ön ayarlar
  for (const sube of SUBELER) {
    const onayar: Record<string, unknown> = { genel: GENEL_PRESET };
    if (sube === 'bahcelievler') onayar.override = BAHCELIEVLER_OVERRIDE;
    await setDoc(doc(db, NS, 'onayarlar', 'sube', sube), onayar);
    console.log(`  ✓ onayar: ${sube}`);
  }

  // 2) Personel + ID toplama
  const idMap: Record<SubeKod, { id: string; ad: string; rol: string; sira: number }[]> = {
    demetevler: [],
    bahcelievler: [],
    etlik: [],
    batikent: [],
  };
  for (const sube of SUBELER) {
    const liste = ORNEK_PERSONEL[sube];
    let sira = 0;
    for (const p of liste) {
      const ref = doc(collection(db, NS, 'personel', sube));
      const veri = { ad: p.ad, rol: p.rol, sira, aktif: true, izinGunu: '', not: '' };
      await setDoc(ref, veri);
      idMap[sube].push({ id: ref.id, ...veri });
      sira++;
    }
    console.log(`  ✓ personel: ${sube} (${liste.length})`);
  }

  // 3) Örnek hafta (içinde bulunulan hafta)
  const bugun = new Date();
  const pzt = haftaBasi(bugun);
  const iso = isoHafta(pzt);
  const bitis = new Date(pzt.getTime() + 6 * DAY);
  const gunler = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'];

  for (const sube of SUBELER) {
    const kisiler = idMap[sube];
    const hucreler: Record<string, Record<string, unknown>> = {};
    const snap: Record<string, unknown> = {};
    kisiler.forEach((k, idx) => {
      const satir: Record<string, unknown> = { izinGunu: idx === 0 ? 'Pazartesi' : '', not: '' };
      gunler.forEach((g, gi) => {
        if (gi === 0 && idx === 0) {
          satir[g] = { tip: 'durum', durum: 'izinli' };
        } else if (k.rol === 'usta') {
          satir[g] = { tip: 'grup', grup: gi % 2 === 0 ? 'acilis' : 'araci' };
        } else {
          satir[g] = { tip: 'grup', grup: gi % 2 === 0 ? 'araci' : 'kapanis' };
        }
      });
      // Örnek başka şube görevlendirmesi
      if (sube === 'demetevler' && idx === 1) {
        satir['cuma'] = { tip: 'baskaSube', baskaSube: { sube: 'batikent', tip: 'ozelSaat', ozelSaat: '08:00-18:00' } };
      }
      hucreler[k.id] = satir;
      snap[k.id] = { ad: k.ad, rol: k.rol, sira: k.sira };
    });

    await setDoc(doc(db, NS, 'haftalar', sube, iso), {
      baslangic: isoTarih(pzt),
      bitis: isoTarih(bitis),
      hucreler,
      personelSnapshot: snap,
      guncelleyen: 'seed',
      guncelTarih: new Date().toISOString(),
    });
    console.log(`  ✓ hafta ${iso}: ${sube}`);
  }

  console.log('\nSeed tamamlandı ✓');
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed hatası:', e);
  process.exit(1);
});
