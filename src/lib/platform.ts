import { Capacitor } from '@capacitor/core';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = r.result as string;
      resolve(s.split(',')[1] ?? '');
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function webIndir(blob: Blob, dosyaAdi: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// Mobilde paylaş/kaydet, masaüstü/web'de indir.
export async function dosyaPaylasVeyaIndir(
  blob: Blob,
  dosyaAdi: string,
  _mime: string,
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const data = await blobToBase64(blob);
    const yazma = await Filesystem.writeFile({
      path: dosyaAdi,
      data,
      directory: Directory.Cache,
    });
    try {
      await Share.share({
        title: dosyaAdi,
        url: yazma.uri,
        dialogTitle: 'Vardiya paylaş / kaydet',
      });
    } catch {
      // Kullanıcı paylaşımı iptal etti — dosya yine de cache'e yazıldı.
    }
    return;
  }
  // Web + Electron
  webIndir(blob, dosyaAdi);
}

export const ESM = mimeMap();
function mimeMap() {
  return {
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}
