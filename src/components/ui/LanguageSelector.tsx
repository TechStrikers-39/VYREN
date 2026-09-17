import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, SupportedLocale, SUPPORTED_LOCALES } from '@/i18n';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'compact' | 'card' | 'dropdown' | 'capsule';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { locale, setLocale, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (variant === 'card') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]).map((locKey) => {
            const loc = SUPPORTED_LOCALES[locKey];
            const isSelected = locale === locKey;
            return (
              <button
                key={locKey}
                type="button"
                onClick={() => setLocale(locKey)}
                className={`p-3.5 rounded-xl border text-left transition-all duration-150 flex items-center justify-between ${
                  isSelected
                    ? 'border-primary-navy bg-primary-navy/5 shadow-xs'
                    : 'border-border bg-surface hover:bg-surface-alt'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <span>{loc.nativeLabel}</span>
                    {locKey !== 'en' && (
                      <span className="text-[10px] font-normal text-text-secondary font-mono">
                        ({loc.label})
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-text-secondary mt-0.5 font-mono uppercase">
                    {locKey === 'en' ? 'Default' : 'Regional Official'}
                  </div>
                </div>
                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-primary-navy text-on-primary flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-border shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const currentMeta = SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES.en;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={t('common.selectLanguage', {}, 'Select Language')}
        aria-label={t('common.selectLanguage', {}, 'Select Language')}
        className={
          variant === 'capsule'
            ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-surface-alt text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-navy'
            : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-alt text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors duration-150 shadow-2xs'
        }
      >
        <Globe className="w-3.5 h-3.5 text-primary-navy shrink-0" />
        <span className="font-medium text-text-primary">{currentMeta.nativeLabel}</span>
        <ChevronDown className={`w-3 h-3 text-text-secondary/70 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-44 rounded-xl border border-border bg-surface shadow-lg py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3 py-1.5 border-b border-border/60 text-[10px] font-mono uppercase tracking-wider text-text-secondary/70">
            {t('common.selectLanguage', {}, 'Select Language')}
          </div>
          {(Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]).map((locKey) => {
            const loc = SUPPORTED_LOCALES[locKey];
            const isSelected = locale === locKey;
            return (
              <button
                key={locKey}
                type="button"
                onClick={() => {
                  setLocale(locKey);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-alt transition-colors ${
                  isSelected ? 'font-bold text-primary-navy bg-primary-navy/5' : 'text-text-primary font-medium'
                }`}
                role="menuitem"
              >
                <div className="flex items-center gap-2">
                  <span>{loc.nativeLabel}</span>
                  <span className="text-[10px] text-text-secondary font-mono">({loc.label})</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary-navy shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
