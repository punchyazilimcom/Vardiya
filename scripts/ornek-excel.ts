/**
 * Gerçek kadroyla örnek bir dışa-aktarma Excel'i üretir (uygulamadaki
 * "Tüm Şubeler Dışa" ile AYNI disaAktar kodunu kullanır). Haftalık grid boş;
 * amaç şube sayfası düzenini ve PERSONEL özlük sayfasını göstermek.
 *
 *   npm run ornek:excel    →  vardiya_ornek.xlsx
 */
import { writeFileSync } from 'node:fs';
import { KISILER, type SubeKod } from './personel-veri';
import { disaAktar, type ExportSube } from '../src/lib/excel';
import { GENEL_PRESET, BAHCELIEVLER_OVERRIDE, SUBELER } from '../src/constants';
import type { Personel, SubeOnayar } from '../src/types';

function slug(ad: string): string {
  return ad
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const onayar = (sube: SubeKod): SubeOnayar => ({
  genel: GENEL_PRESET,
  override: sube === 'bahcelievler' ? BAHCELIEVLER_OVERRIDE : undefined,
});

const veriler: ExportSube[] = SUBELER.map((s) => {
  const sube = s.kod as SubeKod;
  let sira = 0;
  const personeller: Personel[] = KISILER.filter((k) => k.sube === sube).map((k) => ({
    id: slug(k.ad),
    ad: k.ad,
    rol: k.rol,
    sira: sira++,
    aktif: k.aktif ?? true,
    izinGunu: k.izinGunu ?? '',
    not: k.not ?? '',
    telefon: k.telefon,
    iban: k.iban,
    iseGiris: k.iseGiris,
    tcKimlik: k.tcKimlik,
    maas: k.maas,
    yillikIzin: k.yillik,
    kullanilanIzin: k.kullanilan,
    kalanIzin: k.kalan,
  }));
  return { sube, personeller, hafta: null, onayar: onayar(sube) };
});

const buf = disaAktar(veriler);
writeFileSync('vardiya_ornek.xlsx', Buffer.from(buf));
const toplam = veriler.reduce((n, v) => n + v.personeller.length, 0);
console.log(`✓ vardiya_ornek.xlsx yazıldı (${veriler.length} şube sayfası + PERSONEL, toplam ${toplam} kişi)`);
