import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  SupportedLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  STORAGE_KEY,
  getInitialLocale,
  isValidLocale,
  LocaleMeta,
} from './config';
import {
  formatNumber as fmtNumber,
  formatPercent as fmtPercent,
  formatDate as fmtDate,
  formatTime as fmtTime,
} from './formatters';

import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';

const DICTIONARIES: Record<SupportedLocale, any> = {
  en,
  hi,
  mr,
};

export interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: Record<string, string | number>, fallback?: string) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number, decimals?: number) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  supportedLocales: Record<SupportedLocale, LocaleMeta>;
}

const I18nContext = createContext<I18nContextType | null>(null);

function resolvePath(obj: any, path: string): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = curr[part];
  }
  return typeof curr === 'string' ? curr : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return params[key] != null ? String(params[key]) : match;
  });
}

export interface I18nProviderProps {
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => getInitialLocale());

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isValidLocale(e.newValue)) {
        setLocaleState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    if (!isValidLocale(newLocale)) return;
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLocale;
      }
    } catch (e) {
      console.warn('Failed to persist locale to localStorage:', e);
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>, fallback?: string): string => {
      const currentDict = DICTIONARIES[locale] || DICTIONARIES.en;
      let val = resolvePath(currentDict, key);

      if (val === undefined && locale !== 'en') {
        val = resolvePath(DICTIONARIES.en, key);
      }

      if (val === undefined) {
        if (fallback !== undefined) {
          return interpolate(fallback, params);
        }
        const lastPart = key.split('.').pop() || key;
        return interpolate(lastPart, params);
      }

      return interpolate(val, params);
    },
    [locale]
  );

  const formatNumber = useCallback(
    (val: number, options?: Intl.NumberFormatOptions) => fmtNumber(val, locale, options),
    [locale]
  );

  const formatPercent = useCallback(
    (val: number, decimals: number = 1) => fmtPercent(val, locale, decimals),
    [locale]
  );

  const formatDate = useCallback(
    (d: Date | string | number, options?: Intl.DateTimeFormatOptions) => fmtDate(d, locale, options),
    [locale]
  );

  const formatTime = useCallback(
    (d: Date | string | number, options?: Intl.DateTimeFormatOptions) => fmtTime(d, locale, options),
    [locale]
  );

  const value = useMemo<I18nContextType>(
    () => ({
      locale,
      setLocale,
      t,
      formatNumber,
      formatPercent,
      formatDate,
      formatTime,
      supportedLocales: SUPPORTED_LOCALES,
    }),
    [locale, setLocale, t, formatNumber, formatPercent, formatDate, formatTime]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useTranslation = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: string, params?: Record<string, string | number>, fallback?: string) => {
        let val = resolvePath(DICTIONARIES.en, key) ?? fallback ?? key.split('.').pop() ?? key;
        return interpolate(val, params);
      },
      formatNumber: (v) => String(v),
      formatPercent: (v) => `${v}%`,
      formatDate: (d) => String(d),
      formatTime: (d) => String(d),
      supportedLocales: SUPPORTED_LOCALES,
    };
  }
  return context;
};

export default I18nContext;
