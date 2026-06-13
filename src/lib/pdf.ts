import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DEJAVU_REGULAR_B64, DEJAVU_BOLD_B64 } from './fonts/dejavu';
import type { Personel, Hafta, SubeOnayar, SubeKod } from '../types';
import { GUNLER, subeAd, GRUP_RENK } from '../constants';
import { hucrePdf } from './cell';
import { personelOzet } from './analiz';
import { gunTarihleri, tarihEtiket, aralikEtiket, haftaAralik } from './week';

// Her jsPDF örneği kendi sanal dosya sistemine sahip; fontu her belgeye ekleriz.
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

function subeSayfasi(
  doc: jsPDF,
  veri: SubePdfVeri,
  tarih: Date,
  ilkSayfa: boolean,
) {
  if (!ilkSayfa) doc.addPage('a4', 'landscape');
  const sayfaW = doc.internal.pageSize.getWidth();
  const sayfaH = doc.internal.pageSize.getHeight();
  const a = haftaAralik(tarih);
  const gunTar = gunTarihleri(tarih);

  // Başlık
  doc.setFont('DejaVu', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(20, 20, 20);
  doc.text(`${subeAd(veri.sube).toLocaleUpperCase('tr-TR')} HAFTALIK VARDİYA`, 12, 14);
  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(aralikEtiket(a), 12, 20);

  const basliklar = [
    'PERSONEL',
    ...GUNLER.map((g, i) => `${g.ad}\n${tarihEtiket(gunTar[i])}`),
    'İZİN GÜNÜ',
    'NOT',
  ];

  let y = 25;

  function blok(baslik: string, liste: Personel[]) {
    if (liste.length === 0) return;
    doc.setFont('DejaVu', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(150, 120, 10);
    doc.text(baslik, 12, y + 4);
    y += 6;

    const body = liste.map((p) => {
      const satir = veri.hafta?.hucreler?.[p.id];
      const ozet = personelOzet(satir);
      const hucreler = GUNLER.map((g) => hucrePdf(satir?.[g.kod], p.rol, veri.onayar));
      return {
        ad: `${p.ad}\n${ozet.calismaGun}g · ${ozet.izinGun}i`,
        gunler: hucreler,
        izin: satir?.izinGunu ?? p.izinGunu ?? '',
        not: satir?.not ?? p.not ?? '',
      };
    });

    autoTable(doc, {
      startY: y,
      head: [basliklar],
      body: body.map((b) => [
        b.ad,
        ...b.gunler.map((h) => h.metin),
        b.izin,
        b.not,
      ]),
      theme: 'grid',
      styles: {
        font: 'DejaVu',
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [210, 210, 210],
        lineWidth: 0.2,
        textColor: [30, 30, 30],
        valign: 'middle',
        halign: 'center',
      },
      headStyles: {
        font: 'DejaVu',
        fontStyle: 'bold',
        fillColor: [28, 28, 28],
        textColor: [240, 240, 240],
        fontSize: 7.5,
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 38, fontStyle: 'bold' },
        8: { halign: 'left', cellWidth: 24 },
        9: { halign: 'left', cellWidth: 30 },
      },
      margin: { left: 12, right: 12 },
      tableWidth: sayfaW - 24,
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const col = data.column.index;
        if (col >= 1 && col <= 7) {
          const fill = body[data.row.index].gunler[col - 1].fill;
          data.cell.styles.fillColor = fill;
        }
      },
    });
    // @ts-expect-error autotable son Y'yi doc'a ekler
    y = doc.lastAutoTable.finalY + 6;
  }

  blok('USTALAR', veri.personeller.filter((p) => p.aktif && p.rol === 'usta'));
  blok('TEZGAHTAR', veri.personeller.filter((p) => p.aktif && p.rol === 'tezgahtar'));

  // Renk açıklaması (lejant)
  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(7);
  let lx = 12;
  const ly = Math.min(y + 1, sayfaH - 14);
  for (const [g, ad] of [
    ['acilis', 'Açılış'],
    ['araci', 'Aracı'],
    ['kapanis', 'Kapanış'],
  ] as const) {
    const c = GRUP_RENK[g].pdf;
    doc.setFillColor(c[0], c[1], c[2]);
    doc.setDrawColor(180, 180, 180);
    doc.rect(lx, ly - 3, 4, 4, 'FD');
    doc.setTextColor(90, 90, 90);
    doc.text(ad, lx + 6, ly);
    lx += 26;
  }
  doc.setFillColor(250, 246, 224);
  doc.setDrawColor(180, 150, 20);
  doc.rect(lx, ly - 3, 4, 4, 'FD');
  doc.text('Başka şube', lx + 6, ly);

  // Footer: PUNCHYAZILIM
  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(136, 136, 136);
  doc.text('PUNCHYAZILIM', sayfaW / 2, sayfaH - 6, { align: 'center' });
}

export function pdfOlustur(
  veriler: SubePdfVeri[],
  tarih: Date,
): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  fontKur(doc);
  doc.setFont('DejaVu', 'normal');
  veriler.forEach((v, i) => subeSayfasi(doc, v, tarih, i === 0));
  return doc.output('blob');
}

export function pdfDosyaAdi(veriler: SubePdfVeri[], tarih: Date): string {
  const iso = haftaAralik(tarih).anahtar;
  if (veriler.length === 1) {
    return `vardiya_${veriler[0].sube}_${iso}.pdf`;
  }
  return `vardiya_tum_subeler_${iso}.pdf`;
}
