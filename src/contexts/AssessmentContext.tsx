import React, { createContext, useContext, useState } from 'react';
import { DetailedAssessment } from '@/services/mock/assessmentMock';
import { assessmentService, AssessmentSubmission } from '@/services/api/assessmentService';
import { AssessmentResult } from '@/types';

interface AssessmentContextType {
  assessment: DetailedAssessment | null;
  isLoading: boolean;
  error: string | null;
  currentQuestionIndex: number;
  answers: Record<string, number>;
  result: AssessmentResult | null;
  isSubmitting: boolean;
  timeRemaining: number;
  isUrgent: boolean;
  hasExpired: boolean;
  loadAssessment: (id: string) => Promise<void>;
  selectAnswer: (questionId: string, optionIndex: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  goToQuestion: (index: number) => void;
  submitAssessment: () => Promise<AssessmentResult>;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const AssessmentContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assessment, setAssessment] = useState<DetailedAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(900); // default 15 mins (in seconds)
  const [hasExpired, setHasExpired] = useState(false);

  const isUrgent = timeRemaining <= 120 && timeRemaining > 0;

  const loadAssessment = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await assessmentService.getAssessmentById(id);
      setAssessment(data);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setResult(null);
      setHasExpired(false);
      const totalSeconds = ((data as any).time_limit_minutes || 15) * 60;
      setTimeRemaining(totalSeconds);
    } catch (err: any) {
      console.error('Failed to load assessment:', err);
      setError(err?.message || 'Failed to prepare assessment.');
      setAssessment(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time countdown timer & graceful auto-submission on expiry
  React.useEffect(() => {
    if (!assessment || result || isSubmitting || hasExpired) return;

    if (timeRemaining <= 0) {
      setHasExpired(true);
      submitAssessment().catch(err => console.error('Auto-submit error:', err));
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [assessment, result, isSubmitting, timeRemaining, hasExpired]);

  const selectAnswer = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const nextQuestion = () => {
    if (assessment && currentQuestionIndex < assessment.items.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToQuestion = (index: number) => {
    if (assessment && index >= 0 && index < assessment.items.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const submitAssessment = async () => {
    if (!assessment) throw new Error('No assessment loaded');
    setIsSubmitting(true);
    try {
      const res = await assessmentService.submitAssessment({
        assessmentId: assessment.id,
        answers,
      });
      setResult(res);
      return res;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AssessmentContext.Provider value={{
      assessment,
      isLoading,
      error,
      currentQuestionIndex,
      answers,
      result,
      isSubmitting,
      timeRemaining,
      isUrgent,
      hasExpired,
      loadAssessment,
      selectAnswer,
      nextQuestion,
      prevQuestion,
      goToQuestion,
      submitAssessment,
    }}>
      {children}
    </AssessmentContext.Provider>
  );
};

export const useAssessment = () => {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new Error('useAssessment must be used within an AssessmentContextProvider');
  }
  return context;
};
