import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ensureAuth, analyticsBaslat } from './firebase';
import { Capacitor } from '@capacitor/core';

// Offline-first için açılışta anonim giriş dene (başarısızsa önbellekle devam).
ensureAuth();

// Analytics yalnızca web'de (native uygulamalarda atla).
if (!Capacitor.isNativePlatform()) analyticsBaslat();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
