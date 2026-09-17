import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/i18n';

export interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <I18nProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </I18nProvider>
  );
};

export default AppProviders;
