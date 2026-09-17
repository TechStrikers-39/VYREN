import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import { useTranslation } from '@/i18n';
import LanguageSelector from '@/components/ui/LanguageSelector';
import { LogOut } from 'lucide-react';

interface TopNavHeaderProps {
  roleBadge: string;
  roleBadgeColor: string;
  subTitle: string;
}

export const TopNavHeader: React.FC<TopNavHeaderProps> = ({
  roleBadge,
  roleBadgeColor,
  subTitle,
}) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate(ROUTES.AUTH.LOGIN);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between shrink-0 shadow-2xs">
      {/* Left: Role & Workspace Indicator */}
      <div className="flex items-center gap-3">
        <span
          className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${roleBadgeColor}`}
        >
          {roleBadge}
        </span>
        <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary border-l border-border pl-3">
          <span className="font-semibold text-text-primary">{subTitle}</span>
          <span className="text-text-secondary/50">•</span>
          <span className="text-[11px] font-mono text-text-secondary/80">MoSPI &amp; NSSTA</span>
        </div>
      </div>

      {/* Right: Language Selector, User Profile & Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        <LanguageSelector variant="compact" />

        <div className="flex items-center gap-2.5 text-right">
          <div className="hidden md:block">
            <span className="block text-xs font-bold text-text-primary leading-tight">
              {user?.name || t('auth.governmentOfficial', {}, 'Authorized Officer')}
            </span>
            <span className="block text-[10px] text-text-secondary font-mono truncate max-w-[200px]">
              {user?.designation || 'Statistical Cadre'} &bull; {user?.department || 'MoSPI'}
            </span>
          </div>

          <div className="w-8 h-8 rounded-full bg-primary-navy/10 border border-primary-navy/20 text-primary-navy flex items-center justify-center font-mono font-bold text-xs shrink-0">
            {getInitials(user?.name)}
          </div>
        </div>

        <button
          onClick={handleSignOut}
          title={t('navigation.switchPersona', {}, 'Sign out or switch workspace')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-alt text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors duration-150 shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('navigation.switchPersona', {}, 'Switch Persona')}</span>
        </button>
      </div>
    </header>
  );
};

export default TopNavHeader;
