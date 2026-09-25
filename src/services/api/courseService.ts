import { apiClient } from '../apiClient';
import { Course } from '@/types';

export const courseService = {
  async getCourses(): Promise<Course[]> {
    try {
      const res = await apiClient<any[]>('/courses');
      if (res && res.length > 0) {
        return res.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          category: c.category || 'General',
          level: `Level ${c.level}`,
          duration: `${c.duration_minutes} min`,
          competenciesCovered: c.competencies_covered || [],
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch real courses, fallback:', e);
    }
    return [];
  },

  async getCourseById(id: string): Promise<any> {
    try {
      const c = await apiClient<any>(`/courses/${id}`);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category || 'General',
        level: `Level ${c.level}`,
        duration: `${c.duration_minutes} min`,
        competenciesCovered: c.competencies_covered || [],
        provider: c.provider ?? null,
        external_id: c.external_id || null,
        external_url: c.external_url || null,
        integration_mode: c.integration_mode || (c.external_url ? 'REAL / SUNBIRD' : 'FALLBACK / LOCAL'),
        totalModules: c.modules?.length || 0,
        completedModules: 0,
        lessons: (c.modules || []).map((m: any) => ({
          id: m.id,
          title: m.title,
          type: m.type,
          duration: `${m.duration_minutes} min`,
          content: m.content,
          completed: false,
          competencyId: m.competency_id,
        })),
      };
    } catch (e) {
      console.warn('Failed to fetch course detail:', e);
      throw e;
    }
  },

  async enroll(courseId: string): Promise<any> {
    return apiClient(`/courses/${courseId}/enroll`, { method: 'POST' });
  },

  async completeLesson(courseId: string, lessonId: string): Promise<any> {
    try {
      const res = await apiClient<any>(`/courses/${courseId}/modules/${lessonId}/complete`, {
        method: 'POST',
      });
      console.log('Module completion recalibration result:', res);
      return courseService.getCourseById(courseId);
    } catch (e) {
      console.warn('Module completion call error:', e);
      throw e;
    }
  },
};
