/**
 * Gerçek kadro verisiyle örnek bir dışa-aktarma Excel'i üretir (uygulamadaki
 * "Tüm Şubeler Dışa" ile aynı disaAktar kodunu kullanır). Haftalık grid boş;
 * amaç yeni "PERSONEL" özlük sayfasını ve şube sayfası düzenini göstermek.
 *
 *   npx tsx scripts/ornek-excel.ts   →  vardiya_ornek.xlsx
 */
import { writeFileSync } from 'node:fs';
import { VERI } from './personel-veri';
import { disaAktar, type ExportSube } from '../src/lib/excel';
import { GENEL_PRESET, BAHCELIEVLER_OVERRIDE } from '../src/constants';
import type { Personel, SubeKod, SubeOnayar } from '../src/types';

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

const veriler: ExportSube[] = (Object.keys(VERI) as SubeKod[]).map((sube) => {
  let sira = 0;
  const personeller: Personel[] = VERI[sube].map((k) => ({
    id: slug(k.ad),
    ad: k.ad,
    rol: k.rol,
    sira: sira++,
    aktif: true,
    izinGunu: k.izinGunu ?? '',
    not: k.not ?? '',
    telefon: k.telefon,
    iban: k.iban,
    iseGiris: k.iseGiris,
    tcKimlik: k.tcKimlik,
    maas: k.maas,
    izinHakki: k.izinHakki,
  }));
  return { sube, personeller, hafta: null, onayar: onayar(sube) };
});

const buf = disaAktar(veriler);
const ad = 'vardiya_ornek.xlsx';
writeFileSync(ad, Buffer.from(buf));
const toplam = veriler.reduce((n, v) => n + v.personeller.length, 0);
console.log(`✓ ${ad} yazıldı  (${veriler.length} şube sayfası + PERSONEL, toplam ${toplam} kişi)`);
