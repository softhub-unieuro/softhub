import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { rotas } from './configuracoes/rotas';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { msalInstance } from './configuracoes/msal';

// Registro automático do Service Worker
registerSW({ immediate: true });

// 🛡️ Inicialização obrigatória do MSAL (Warning 1e88vg)
// Resolve a exigência de inicialização assíncrona antes do uso de qualquer método.
msalInstance.initialize().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RouterProvider router={rotas} />
    </React.StrictMode>
  );
}).catch(err => {
  console.error('[CRÍTICO] Falha ao inicializar motor de autenticação:', err);
});
