import { create } from 'zustand';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY';

export interface AppSettings {
  currency: CurrencyCode;
  notifications: boolean;
  compactMode: boolean;
  animations: boolean;
  appPin?: string;
  pinEnabled: boolean;
}

interface SettingsStore extends AppSettings {
  setCurrency: (currency: CurrencyCode) => void;
  setNotifications: (enabled: boolean) => void;
  setCompactMode: (enabled: boolean) => void;
  setAnimations: (enabled: boolean) => void;
  setPin: (pin?: string) => void;
  setPinEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'titan-settings';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        currency: parsed.currency ?? 'USD',
        notifications: parsed.notifications ?? true,
        compactMode: parsed.compactMode ?? false,
        animations: parsed.animations ?? true,
        appPin: parsed.appPin,
        pinEnabled: parsed.pinEnabled ?? false,
      };
    }
  } catch {
    // ignore
  }
  return { currency: 'USD', notifications: true, compactMode: false, animations: true, pinEnabled: false };
}

function persist(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function makeUpdater<K extends keyof AppSettings>(key: K) {
  return (store: SettingsStore, value: AppSettings[K]): Partial<SettingsStore> => {
    const next = { ...store, [key]: value } as AppSettings;
    persist(next);
    return { [key]: value };
  };
}

const initial = loadSettings();

export const useSettings = create<SettingsStore>((set, get) => ({
  ...initial,

  setCurrency: (currency) => set(makeUpdater('currency')(get(), currency)),
  setNotifications: (notifications) => set(makeUpdater('notifications')(get(), notifications)),
  setCompactMode: (compactMode) => set(makeUpdater('compactMode')(get(), compactMode)),
  setAnimations: (animations) => set(makeUpdater('animations')(get(), animations)),
  setPin: (appPin) => set(makeUpdater('appPin')(get(), appPin)),
  setPinEnabled: (pinEnabled) => set(makeUpdater('pinEnabled')(get(), pinEnabled)),
}));

/**
 * Format a cent-integer amount using the user's preferred currency.
 */
export function formatMoney(cents: number, currency: CurrencyCode): string {
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
  };

  return new Intl.NumberFormat(undefined, formatOptions)
    .format(cents / 100);
}
