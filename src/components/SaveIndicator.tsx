import type { KayitDurumu } from '../store';

export default function SaveIndicator({ durum }: { durum: KayitDurumu }) {
  const map: Record<KayitDurumu, { t: string; c: string }> = {
    idle: { t: '', c: '#666' },
    kaydediliyor: { t: '↻ Kaydediliyor…', c: '#9a9a9a' },
    kaydedildi: { t: '✓ Kaydedildi', c: '#4caf7d' },
    hata: { t: '⚠ Kayıt hatası', c: '#e0533d' },
  };
  const v = map[durum];
  return (
    <span
      style={{
        fontSize: 12,
        color: v.c,
        minWidth: 92,
        textAlign: 'right',
        fontFamily: 'JetBrains Mono, monospace',
        opacity: durum === 'idle' ? 0 : 1,
        transition: 'opacity .2s',
      }}
    >
      {v.t || '·'}
    </span>
  );
}
