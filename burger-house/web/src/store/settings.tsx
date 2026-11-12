import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { Settings } from '../lib/types';

export const FALLBACK_SETTINGS: Settings = {
  name: 'Burger House',
  tagline: 'Delicious Burgers Made Fresh',
  phone: '(555) 123-4567',
  email: 'contact@burgerhouse.com',
  address: '1200 Sunset Boulevard, Los Angeles, CA 90026',
  hours: 'Mon – Sun · 11:00 AM – 11:00 PM',
  deliveryFee: 3.5,
  freeDeliveryOver: 30,
  taxRate: 0.08,
  social: { facebook: '#', instagram: '#', twitter: '#', tiktok: '#' },
  hero: [],
  deal: {
    title: 'Hot Deals',
    subtitle: 'Combo Pack For Two',
    description: '',
    comboPrice: 16.9,
    originalPrice: 22.5,
    freeDelivery: true,
    endsAt: '',
  },
};

const SettingsContext = createContext<Settings>(FALLBACK_SETTINGS);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(FALLBACK_SETTINGS);

  useEffect(() => {
    let active = true;
    api<Settings>('/api/settings')
      .then((data) => {
        if (active && data) setSettings({ ...FALLBACK_SETTINGS, ...data });
      })
      .catch(() => {
        /* keep fallback copy if settings cannot be loaded */
      });
    return () => {
      active = false;
    };
  }, []);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
