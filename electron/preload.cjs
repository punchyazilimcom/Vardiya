// Preload — şu an köprüye gerek yok; indirme/işlemler renderer'da yapılıyor.
// İleride native köprü gerekirse contextBridge buraya eklenir.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('basakVardiya', {
  platform: 'electron',
  surum: '1.0.0',
});
