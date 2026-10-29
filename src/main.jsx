import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/800.css';
import App from './App.jsx';
import './styles.css'; 

window.__bip = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__bip = e;
  window.dispatchEvent(new Event('bip-ready'));
});
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
