import React from 'react';
import { useTranslation } from '@/i18n';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface AssessmentPreparationErrorProps {
  onRetry: () => void;
  onReturnToDashboard: () => void;
}

export const AssessmentPreparationError: React.FC<AssessmentPreparationErrorProps> = ({
  onRetry,
  onReturnToDashboard,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="max-w-xl mx-auto my-12 p-6 sm:p-8 rounded-2xl bg-surface border border-red-200/90 shadow-xs text-center space-y-5"
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
          {t('assessment.errorHeading', {}, 'Assessment preparation was interrupted')}
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
          {t('assessment.errorBody', {}, 'VYREN could not prepare your competency diagnostic right now.')}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onRetry}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary font-bold text-xs sm:text-sm transition shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy min-h-[44px]"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('assessment.retryBtn', {}, 'Retry Assessment Preparation')}</span>
        </button>

        <button
          type="button"
          onClick={onReturnToDashboard}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-alt border border-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('assessment.returnToDashboard', {}, 'Return to Dashboard')}</span>
        </button>
      </div>
    </div>
  );
};

export default AssessmentPreparationError;
