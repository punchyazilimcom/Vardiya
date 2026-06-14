import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, NS } from '../firebase';
import type {
  Personel,
  SubeKod,
  SubeOnayar,
  Hafta,
} from '../types';
import type { DurumRenkAyar } from '../constants';
import { GENEL_PRESET, BAHCELIEVLER_OVERRIDE } from '../constants';

// ---- Doc/Collection referansları (hepsi `vardiya/` ad alanı altında) ----
// personel:  vardiya/personel/{sube}/{id}
// onayarlar: vardiya/onayarlar/sube/{sube}
// haftalar:  vardiya/haftalar/{sube}/{isoHafta}

const personelCol = (sube: SubeKod) => collection(db, NS, 'personel', sube);
const personelDoc = (sube: SubeKod, id: string) =>
  doc(db, NS, 'personel', sube, id);
const onayarDoc = (sube: SubeKod) => doc(db, NS, 'onayarlar', 'sube', sube);
const haftaDoc = (sube: SubeKod, iso: string) =>
  doc(db, NS, 'haftalar', sube, iso);

// ---- Personel ----
export function dinlePersonel(
  sube: SubeKod,
  cb: (liste: Personel[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    personelCol(sube),
    (snap) => {
      const liste = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Personel, 'id'>) }));
      liste.sort((a, b) => a.sira - b.sira);
      cb(liste);
    },
    (e) => onError?.(e),
  );
}

export async function getPersonel(sube: SubeKod): Promise<Personel[]> {
  const snap = await getDocs(personelCol(sube));
  const liste = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Personel, 'id'>) }));
  liste.sort((a, b) => a.sira - b.sira);
  return liste;
}

export async function kaydetPersonel(sube: SubeKod, p: Personel): Promise<void> {
  const { id, ...data } = p;
  await setDoc(personelDoc(sube, id), data, { merge: true });
}

export async function silPersonel(sube: SubeKod, id: string): Promise<void> {
  // Geçmiş haftalar personelSnapshot ile korunur; sadece aktif listeden çıkar.
  await deleteDoc(personelDoc(sube, id));
}

export async function siraGuncelle(
  sube: SubeKod,
  sirali: { id: string; sira: number }[],
): Promise<void> {
  const batch = writeBatch(db);
  for (const { id, sira } of sirali) {
    batch.set(personelDoc(sube, id), { sira }, { merge: true });
  }
  await batch.commit();
}

// ---- Ön ayarlar ----
export function dinleOnayar(
  sube: SubeKod,
  cb: (o: SubeOnayar) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    onayarDoc(sube),
    (snap) => {
      if (snap.exists()) cb(snap.data() as SubeOnayar);
      else cb(varsayilanOnayar(sube));
    },
    (e) => onError?.(e),
  );
}

export async function getOnayar(sube: SubeKod): Promise<SubeOnayar> {
  const snap = await getDoc(onayarDoc(sube));
  return snap.exists() ? (snap.data() as SubeOnayar) : varsayilanOnayar(sube);
}

export async function kaydetOnayar(sube: SubeKod, o: SubeOnayar): Promise<void> {
  await setDoc(onayarDoc(sube), o);
}

export function varsayilanOnayar(sube: SubeKod): SubeOnayar {
  const o: SubeOnayar = { genel: GENEL_PRESET };
  if (sube === 'bahcelievler') o.override = BAHCELIEVLER_OVERRIDE;
  return o;
}

// ---- Haftalar ----
export function dinleHafta(
  sube: SubeKod,
  iso: string,
  cb: (h: Hafta | null) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    haftaDoc(sube, iso),
    (snap) => {
      cb(snap.exists() ? (snap.data() as Hafta) : null);
    },
    (e) => onError?.(e),
  );
}

export async function getHafta(sube: SubeKod, iso: string): Promise<Hafta | null> {
  const snap = await getDoc(haftaDoc(sube, iso));
  return snap.exists() ? (snap.data() as Hafta) : null;
}

export async function kaydetHafta(
  sube: SubeKod,
  iso: string,
  h: Hafta,
): Promise<void> {
  await setDoc(haftaDoc(sube, iso), h);
}

// ---- Genel ayarlar (durum renkleri) ----
const durumRenkDoc = () => doc(db, NS, 'ayarlar', 'global', 'durumRenk');

export async function getDurumRenk(): Promise<DurumRenkAyar | null> {
  const snap = await getDoc(durumRenkDoc());
  return snap.exists() ? (snap.data() as DurumRenkAyar) : null;
}

export async function kaydetDurumRenk(map: DurumRenkAyar): Promise<void> {
  await setDoc(durumRenkDoc(), map);
}

// ---- Tüm personel (tüm şubeler) ----
export async function getTumPersonel(): Promise<
  { sube: SubeKod; personeller: Personel[] }[]
> {
  const subeler: SubeKod[] = ['demetevler', 'bahcelievler', 'etlik', 'batikent'];
  return Promise.all(
    subeler.map(async (sube) => ({ sube, personeller: await getPersonel(sube) })),
  );
}
