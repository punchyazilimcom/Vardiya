import { jsPDF } from 'jspdf';
import autoTableImport from 'jspdf-autotable';

// Tarayıcı (Vite) ve Node (ESM) ortamlarında çalışsın diye interop koruması.
const autoTable = (
  (autoTableImport as unknown as { default?: typeof autoTableImport }).default ?? autoTableImport
) as typeof autoTableImport;
import { DEJAVU_REGULAR_B64, DEJAVU_BOLD_B64 } from './fonts/dejavu';
import type { Personel, Hafta, SubeOnayar, SubeKod } from '../types';
import { GUNLER, subeAd, grupRenkAktif, BASKA_SUBE_RENK } from '../constants';
import { hucrePdf } from './cell';
import { personelOzet } from './analiz';
import { gunKapsam } from './otomatik';
import { gunTarihleri, haftaAralik } from './week';

// Marka tonları
const SIYAH: [number, number, number] = [13, 13, 13];
const SARI: [number, number, number] = [244, 223, 22];
const CIZGI: [number, number, number] = [225, 225, 225];
const ZEBRA: [number, number, number] = [249, 249, 247];

const AYLAR_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const tarihKisa = (d: Date) => `${d.getDate()} ${AYLAR_KISA[d.getMonth()]}`;

function fontKur(doc: jsPDF) {
  doc.addFileToVFS('DejaVuSans.ttf', DEJAVU_REGULAR_B64);
  doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', DEJAVU_BOLD_B64);
  doc.addFont('DejaVuSans-Bold.ttf', 'DejaVu', 'bold');
}

export interface SubePdfVeri {
  sube: SubeKod;
  personeller: Personel[];
  hafta: Hafta | null;
  onayar: SubeOnayar;
}

// ---- Premium başlık bandı ----
function baslikBandi(doc: jsPDF, veri: SubePdfVeri, tarih: Date, W: number): number {
  const a = haftaAralik(tarih);
  const gt = gunTarihleri(tarih);
  const bandH = 23;

  doc.setFillColor(...SIYAH);
  doc.rect(0, 0, W, bandH, 'F');
  // ince sarı vurgu çizgisi
  doc.setFillColor(...SARI);
  doc.rect(0, bandH, W, 0.8, 'F');

  // Sol: sarı kare logo + marka
  doc.setFillColor(...SARI);
  doc.roundedRect(12, 6.5, 9, 9, 1.6, 1.6, 'F');
  doc.setFont('DejaVu', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(13, 13, 13);
  doc.text('BV', 16.5, 12.4, { align: 'center' });

  doc.setFontSize(15);
  doc.setTextColor(...SARI);
  doc.text('BAŞAK', 25, 12);
  const bw = doc.getTextWidth('BAŞAK');
  doc.setTextColor(245, 245, 245);
  doc.text(' VARDİYA', 25 + bw, 12);

  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(170, 170, 170);
  doc.text(
    `${subeAd(veri.sube).toLocaleUpperCase('tr-TR')} ŞUBESİ · HAFTALIK VARDİYA ÇİZELGESİ`,
    25,
    18,
  );

  // Sağ: tarih aralığı pill + hafta no
  const etiket = `${tarihKisa(gt[0])} – ${tarihKisa(gt[6])} ${gt[6].getFullYear()}`;
  doc.setFont('DejaVu', 'bold');
  doc.setFontSize(10);
  const tw = doc.getTextWidth(etiket);
  const pillW = tw + 12;
  const pillX = W - 12 - pillW;
  doc.setFillColor(28, 28, 28);
  doc.setDrawColor(...SARI);
  doc.setLineWidth(0.4);
  doc.roundedRect(pillX, 6.5, pillW, 8.5, 2, 2, 'FD');
  doc.setTextColor(...SARI);
  doc.text(etiket, pillX + pillW / 2, 12.2, { align: 'center' });

  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text(`Hafta ${a.anahtar}`, W - 12, 19.5, { align: 'right' });

  return bandH + 7;
}

// ---- Bölüm şeridi (USTALAR / TEZGAHTAR) — siyah bar + sarı yazı ----
function bolumSeridi(doc: jsPDF, baslik: string, adet: number, y: number, W: number) {
  const h = 6.5;
  doc.setFillColor(...SIYAH);
  doc.roundedRect(12, y - h + 1.5, W - 24, h, 1.2, 1.2, 'F');
  doc.setFillColor(...SARI);
  doc.roundedRect(12, y - h + 1.5, 2.4, h, 1.2, 1.2, 'F');
  doc.setFont('DejaVu', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...SARI);
  doc.text(baslik, 17, y - 0.5);
  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(190, 190, 190);
  doc.text(`${adet} kişi`, 17 + doc.getTextWidth(baslik) + 4, y - 0.5);
}

function subeSayfasi(doc: jsPDF, veri: SubePdfVeri, tarih: Date, ilkSayfa: boolean) {
  if (!ilkSayfa) doc.addPage('a4', 'landscape');
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const gt = gunTarihleri(tarih);
  const kapsam = gunKapsam(veri.sube, veri.hafta, veri.personeller, veri.onayar);

  let y = baslikBandi(doc, veri, tarih, W);

  const basliklar = [
    'PERSONEL',
    ...GUNLER.map((g, i) => `${g.ad.toLocaleUpperCase('tr-TR')}\n${tarihKisa(gt[i])}`),
    'İZİN GÜNÜ',
    'NOT',
  ];

  function blok(baslik: string, liste: Personel[]) {
    if (liste.length === 0) return;
    bolumSeridi(doc, baslik, liste.length, y + 4, W);
    y += 7;

    const body = liste.map((p) => {
      const satir = veri.hafta?.hucreler?.[p.id];
      const ozet = personelOzet(satir);
      const hucreler = GUNLER.map((g) => hucrePdf(satir?.[g.kod], p.rol, veri.onayar));
      return {
        ad: `${p.ad}\n${ozet.calismaGun} gün · ${ozet.izinGun} izin`,
        gunler: hucreler,
        izin: satir?.izinGunu ?? p.izinGunu ?? '',
        not: satir?.not ?? p.not ?? '',
      };
    });

    autoTable(doc, {
      startY: y,
      head: [basliklar],
      body: body.map((b) => [b.ad, ...b.gunler.map((h) => h.metin), b.izin, b.not]),
      theme: 'grid',
      styles: {
        font: 'DejaVu',
        fontSize: 7.5,
        cellPadding: { top: 2.4, bottom: 2.4, left: 2, right: 2 },
        lineColor: CIZGI,
        lineWidth: 0.15,
        textColor: [35, 35, 35],
        valign: 'middle',
        halign: 'center',
        minCellHeight: 9,
      },
      headStyles: {
        font: 'DejaVu',
        fontStyle: 'bold',
        fillColor: SIYAH,
        textColor: SARI,
        fontSize: 7,
        halign: 'center',
        valign: 'middle',
        lineColor: SIYAH,
        cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
      },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: {
        // İsim + İzin + Not sütunları: siyah zemin + sarı yazı (marka)
        0: { halign: 'left', cellWidth: 42, fontStyle: 'bold', fillColor: SIYAH, textColor: SARI },
        8: { halign: 'left', cellWidth: 26, fillColor: SIYAH, textColor: SARI },
        9: { halign: 'left', cellWidth: 32, fillColor: SIYAH, textColor: SARI },
      },
      margin: { left: 12, right: 12 },
      tableWidth: W - 24,
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const col = data.column.index;
        if (col >= 1 && col <= 7) {
          const fill = body[data.row.index].gunler[col - 1].fill;
          data.cell.styles.fillColor = fill;
        }
      },
    });
    // @ts-expect-error autotable finalY
    y = doc.lastAutoTable.finalY + 7;
  }

  blok('USTALAR', veri.personeller.filter((p) => p.aktif && p.rol === 'usta'));
  blok('TEZGAHTAR', veri.personeller.filter((p) => p.aktif && p.rol === 'tezgahtar'));

  // ---- Kapsam uyarıları (varsa) ----
  const eksikGunler = GUNLER.filter((g) => kapsam[g.kod].eksikler.length > 0);
  if (eksikGunler.length > 0 && y < H - 26) {
    doc.setFont('DejaVu', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 140, 10);
    doc.text('⚠ Kapsam uyarıları:', 12, y);
    doc.setFont('DejaVu', 'normal');
    doc.setTextColor(110, 110, 110);
    const metin = eksikGunler
      .map((g) => `${g.ad}: ${kapsam[g.kod].eksikler.join(', ')}`)
      .join('   ·   ');
    doc.text(metin, 12, y + 4, { maxWidth: W - 24 });
    y += 10;
  }

  // ---- Renk lejantı ----
  const ly = H - 13;
  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(7);
  let lx = 12;
  const chip = (fill: [number, number, number], ad: string, kenar?: [number, number, number]) => {
    doc.setFillColor(...fill);
    doc.setDrawColor(...(kenar ?? CIZGI));
    doc.setLineWidth(kenar ? 0.5 : 0.2);
    doc.roundedRect(lx, ly - 3, 4.5, 4.5, 0.8, 0.8, 'FD');
    doc.setTextColor(90, 90, 90);
    doc.text(ad, lx + 6.5, ly);
    lx += doc.getTextWidth(ad) + 14;
  };
  chip(grupRenkAktif.acilis.pdf, 'Açılış');
  chip(grupRenkAktif.araci.pdf, 'Aracı');
  chip(grupRenkAktif.kapanis.pdf, 'Kapanış');
  chip(BASKA_SUBE_RENK.pdf, 'Başka şube', BASKA_SUBE_RENK.pdfBorder);
}

// ---- Footer + sayfa numarası (tüm sayfalara) ----
function footerlar(doc: jsPDF) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const n = doc.getNumberOfPages();
  const bugun = new Date();
  const tarihStr = `${String(bugun.getDate()).padStart(2, '0')}.${String(bugun.getMonth() + 1).padStart(2, '0')}.${bugun.getFullYear()}`;
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...CIZGI);
    doc.setLineWidth(0.2);
    doc.line(12, H - 8.5, W - 12, H - 8.5);
    doc.setFont('DejaVu', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Oluşturma: ${tarihStr}`, 12, H - 5);
    doc.setFont('DejaVu', 'bold');
    doc.setTextColor(130, 130, 130);
    doc.text('PUNCHYAZILIM', W / 2, H - 5, { align: 'center' });
    doc.setFont('DejaVu', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Sayfa ${i} / ${n}`, W - 12, H - 5, { align: 'right' });
  }
}

export function pdfOlustur(veriler: SubePdfVeri[], tarih: Date): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  fontKur(doc);
  doc.setFont('DejaVu', 'normal');
  veriler.forEach((v, i) => subeSayfasi(doc, v, tarih, i === 0));
  footerlar(doc);
  return doc.output('blob');
}

export function pdfDosyaAdi(veriler: SubePdfVeri[], tarih: Date): string {
  const iso = haftaAralik(tarih).anahtar;
  if (veriler.length === 1) return `vardiya_${veriler[0].sube}_${iso}.pdf`;
  return `vardiya_tum_subeler_${iso}.pdf`;
}
