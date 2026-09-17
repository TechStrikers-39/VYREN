import { SupportedLocale } from './config';

const LOCALE_MAP: Record<SupportedLocale, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
};

export function formatNumber(
  value: number,
  locale: SupportedLocale,
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(LOCALE_MAP[locale] || 'en-IN', options).format(value);
  } catch {
    return String(value);
  }
}

export function formatPercent(
  value: number,
  locale: SupportedLocale,
  decimals: number = 1
): string {
  try {
    return new Intl.NumberFormat(LOCALE_MAP[locale] || 'en-IN', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  } catch {
    return `${value.toFixed(decimals)}%`;
  }
}

export function formatDate(
  date: Date | string | number,
  locale: SupportedLocale,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...options,
    };
    return new Intl.DateTimeFormat(LOCALE_MAP[locale] || 'en-IN', defaultOptions).format(d);
  } catch {
    return String(date);
  }
}

export function formatTime(
  date: Date | string | number,
  locale: SupportedLocale,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    };
    return new Intl.DateTimeFormat(LOCALE_MAP[locale] || 'en-IN', defaultOptions).format(d);
  } catch {
    return String(date);
  }
}
