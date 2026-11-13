import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './store/auth';
import { CartProvider } from './store/cart';
import { PrefsProvider } from './store/prefs';
import { SettingsProvider } from './store/settings';
import { ToastProvider } from './store/toast';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <PrefsProvider>
          <SettingsProvider>
            <AuthProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </AuthProvider>
          </SettingsProvider>
        </PrefsProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
