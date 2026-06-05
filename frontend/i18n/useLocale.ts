import { useState, useEffect } from 'react';
import tr from './messages/tr.json';
import en from './messages/en.json';
import { Locale, defaultLocale } from './config';

const messages = { tr, en };

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const saved = localStorage.getItem('tripzy_locale') as Locale;
    if (saved && (saved === 'tr' || saved === 'en')) {
      setLocaleState(saved);
      return;
    }

    if (typeof navigator !== 'undefined') {
      const navLangs = navigator.languages || [navigator.language];
      for (const lang of navLangs) {
        const baseLang = lang.split('-')[0] as Locale;
        if (baseLang === 'tr' || baseLang === 'en') {
          setLocaleState(baseLang);
          return;
        }
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('tripzy_locale', newLocale);
  };

  const t = (key: string): string => {
    const parts = key.split('.');
    let current: any = messages[locale];
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback to English
        let fallback: any = messages.en;
        let found = true;
        for (const p of parts) {
          if (fallback && typeof fallback === 'object' && p in fallback) {
            fallback = fallback[p];
          } else {
            found = false;
            break;
          }
        }
        return found && typeof fallback === 'string' ? fallback : key;
      }
    }
    return typeof current === 'string' ? current : key;
  };

  return { locale, setLocale, t };
}
export type TranslateFn = ReturnType<typeof useLocale>['t'];
