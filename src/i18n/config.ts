export type SupportedLocale = 'en' | 'hi' | 'mr';

export interface LocaleMeta {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LOCALES: Record<SupportedLocale, LocaleMeta> = {
  en: {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
  },
  hi: {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
  },
  mr: {
    code: 'mr',
    label: 'Marathi',
    nativeLabel: 'मराठी',
  },
};

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const STORAGE_KEY = 'vyren_locale';

export function isValidLocale(locale: string | null | undefined): locale is SupportedLocale {
  return typeof locale === 'string' && (locale === 'en' || locale === 'hi' || locale === 'mr');
}

export function getInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isValidLocale(saved)) return saved;
  } catch (e) {
    console.warn('Unable to access localStorage for locale:', e);
  }
  return DEFAULT_LOCALE;
}
