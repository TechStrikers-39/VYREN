import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService } from '@/services/api/courseService';
import { DetailedCourse, CourseLesson } from '@/services/mock/courseMock';
import { ROUTES } from '@/constants/routes';

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<DetailedCourse | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    courseService.getCourseById(courseId || 'course-101').then(c => {
      if (c) {
        setCourse(c);
        setActiveLesson(c.lessons[0]);
      }
    });
  }, [courseId]);

  if (!course || !activeLesson) {
    return <div className="p-12 text-center text-text-secondary">Loading course curriculum...</div>;
  }

  const handleCompleteLesson = async () => {
    setIsCompleting(true);
    await courseService.completeLesson(course.id, activeLesson.id);
    setIsCompleting(false);
    navigate(ROUTES.LEARNER.DASHBOARD);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded bg-primary-navy/10 text-primary-navy font-semibold">
              {course.category}
            </span>
            <span className="text-xs font-mono text-text-secondary">• {course.level}</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{course.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {course.competenciesCovered.map(c => (
            <span key={c} className="text-xs font-mono px-2.5 py-1 rounded bg-surface border border-border text-text-secondary">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
          <h3 className="text-base font-bold text-text-primary">Curriculum Modules</h3>
          <div className="space-y-2">
            {course.lessons.map(les => (
              <button
                key={les.id}
                onClick={() => setActiveLesson(les)}
                className={`w-full text-left p-3.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                  activeLesson.id === les.id
                    ? 'border-primary-navy bg-surface-alt font-semibold text-primary-navy'
                    : 'border-border bg-surface text-text-primary hover:bg-surface-alt'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-sm">{les.title}</div>
                  <div className="text-text-secondary font-mono text-[11px]">{les.duration}</div>
                </div>
                {les.completed && (
                  <span className="material-symbols-outlined text-sm text-emerald-500">check_circle</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-xl font-bold text-text-primary">{activeLesson.title}</h2>
            <span className="text-xs font-mono text-text-secondary">Type: {activeLesson.type.replace('_', ' ').toUpperCase()}</span>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">{activeLesson.content}</p>

          {activeLesson.codeSnippet && (
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase text-text-secondary">Interactive Telemetry Script</label>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
                <code>{activeLesson.codeSnippet}</code>
              </pre>
            </div>
          )}

          <div className="pt-6 border-t border-border flex items-center justify-between">
            <span className="text-xs font-mono text-text-secondary">Completing this module recalibrates your MLOps competency score.</span>
            <button
              onClick={handleCompleteLesson}
              disabled={isCompleting}
              className="px-6 py-2.5 rounded-lg bg-primary-navy text-on-primary font-medium text-sm hover:opacity-95 transition-opacity"
            >
              {isCompleting ? 'Updating Score...' : 'Complete Module & Recalibrate Score →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;
