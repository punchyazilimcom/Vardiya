import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ensureAuth } from './firebase';

// Offline-first için açılışta anonim giriş dene (başarısızsa önbellekle devam).
ensureAuth();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
