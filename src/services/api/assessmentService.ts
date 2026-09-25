import { apiClient } from '../apiClient';
import { AssessmentResult } from '@/types';

export interface AssessmentSubmission {
  assessmentId: string;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
}

export const assessmentService = {
  async getAssessmentById(id: string): Promise<any> {
    try {
      const res = await apiClient<any>(`/assessments/${id}`);
      return {
        id: res.id,
        title: res.title,
        description: res.description,
        durationMinutes: res.time_limit_minutes,
        questionsCount: res.items?.length || 0,
        generationMode: res.generation_mode,
        blueprint: res.blueprint,
        competenciesEvaluated: ['Statistical Inference', 'Data Pipeline Design', 'MLOps', 'Data Governance'],
        items: (res.items || []).map((it: any) => ({
          id: it.id,
          prompt: it.prompt,
          options: it.options,
          weight: it.weight,
          difficulty: it.difficulty,
          itemSource: it.item_source,
          questionType: it.question_type,
          targetCompetency: it.competency_id,
        })),
      };
    } catch (e) {
      console.warn('Falling back to default assessment structure:', e);
      throw e;
    }
  },

  async submitAssessment(submission: AssessmentSubmission): Promise<AssessmentResult> {
    const answersList = Object.entries(submission.answers).map(([item_id, idx]) => ({
      item_id,
      selected_option_index: idx,
    }));

    const res = await apiClient<any>(`/assessments/${submission.assessmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers: answersList }),
    });

    return {
      id: res.id,
      assessmentId: res.assessment_id,
      score: Math.round(res.overall_score),
      passed: res.overall_score >= 70,
      completedAt: res.submitted_at,
      competencyBreakdown: res.competency_breakdown || {},
      itemLog: res.item_log || [],
      resultingGaps: res.resulting_gaps || [],
      topRecommendation: res.top_recommendation ?? null,
    };
  },


  async getLatestResult(assessmentId: string): Promise<AssessmentResult> {
    const res = await apiClient<any>(`/assessments/${assessmentId}/latest-result`);
    return {
      id: res.id,
      assessmentId: res.assessment_id,
      score: Math.round(res.overall_score),
      passed: res.overall_score >= 70,
      completedAt: res.submitted_at,
      competencyBreakdown: res.competency_breakdown || {},
      itemLog: res.item_log || [],
      resultingGaps: res.resulting_gaps || [],
      topRecommendation: res.top_recommendation ?? null,
    };
  },

  async getResultById(resultId: string): Promise<AssessmentResult> {
    const res = await apiClient<any>(`/assessments/results/${resultId}`);
    return {
      id: res.id,
      assessmentId: res.assessment_id,
      score: Math.round(res.overall_score),
      passed: res.overall_score >= 70,
      completedAt: res.submitted_at,
      competencyBreakdown: res.competency_breakdown || {},
      itemLog: res.item_log || [],
      resultingGaps: res.resulting_gaps || [],
      topRecommendation: res.top_recommendation ?? null,
    };
  },
};
