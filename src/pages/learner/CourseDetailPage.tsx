import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { courseService } from '@/services/api/courseService';
import { ROUTES } from '@/constants/routes';
import {
  ExternalLink,
  ShieldCheck,
  Sparkles,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Award,
} from 'lucide-react';

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any | null>(null);
  const [activeLesson, setActiveLesson] = useState<any | null>(null);
  const [isRecordingEvidence, setIsRecordingEvidence] = useState(false);
  const [evidenceRecorded, setEvidenceRecorded] = useState(false);

  useEffect(() => {
    courseService.getCourseById(courseId || 'b0100000-0000-0000-0000-000000000001').then((c) => {
      if (c) {
        setCourse(c);
        if (c.lessons && c.lessons.length > 0) {
          setActiveLesson(c.lessons[0]);
        }
      }
    });
  }, [courseId]);

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto p-16 text-center space-y-4">
        <div className="w-8 h-8 mx-auto border-3 border-primary-navy border-t-transparent rounded-full animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-text-primary">Loading Course Metadata</p>
          <p className="text-xs font-mono text-text-secondary">Retrieving FRAC competency mapping and iGOT curriculum...</p>
        </div>
      </div>
    );
  }

  const handleRecordLearningEvidence = async () => {
    if (!activeLesson) return;
    setIsRecordingEvidence(true);
    try {
      await courseService.completeLesson(course.id, activeLesson.id);
      setEvidenceRecorded(true);
    } catch (e) {
      console.warn('Failed to record learning evidence:', e);
    } finally {
      setIsRecordingEvidence(false);
    }
  };

  const hasExternalUrl = Boolean(course.external_url);
  const externalUrl = course.external_url || '#';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* ========================================================================= */}
      {/* 01 — COURSE HEADER & FRAC COMPETENCY ALIGNMENT                            */}
      {/* ========================================================================= */}
      <section className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-navy/5 border border-primary-navy/15 text-[11px] font-mono font-bold text-primary-navy uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                RECOMMENDED iGOT INTERVENTION
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-action-blue/10 text-action-blue border border-action-blue/20">
                <Sparkles className="w-3 h-3" />
                {hasExternalUrl ? 'LIVE iGOT / SUNBIRD' : 'MoSPI ALIGNED CURRICULUM'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
              {course.title}
            </h1>
            <p className="text-xs text-text-secondary max-w-3xl leading-relaxed">
              {course.description || 'Targeted training module aligned with MoSPI NSSTA capability building matrix.'}
            </p>
          </div>

          {/* Provider Badge */}
          <div className="p-4 rounded-xl bg-surface-alt border border-border shrink-0 text-left sm:text-right space-y-1">
            <span className="text-[10px] font-mono uppercase text-text-secondary block">Content Provider</span>
            <strong className="text-xs font-bold text-text-primary block">
              {course.provider || 'iGOT Karmayogi Bharat'}
            </strong>
            <span className="text-[10px] font-mono text-text-secondary block">
              Duration: {course.duration || '90 min'} &bull; {course.level || 'Level 2'}
            </span>
          </div>
        </div>

        {/* Competencies Covered */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-mono uppercase text-text-secondary font-semibold mr-2">
            Competencies Targeted:
          </span>
          {(course.competenciesCovered || []).length > 0 ? (
            course.competenciesCovered.map((comp: string) => (
              <span
                key={comp}
                className="px-2.5 py-1 rounded-lg bg-surface-alt border border-border text-xs font-mono text-text-primary font-medium"
              >
                {comp}
              </span>
            ))
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-surface-alt border border-border text-xs font-mono text-text-primary font-medium">
              Data Pipeline Design
            </span>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 02 — PRIMARY LEARNING ACTION (iGOT Launch + Assessment CTA)                */}
      {/* ========================================================================= */}
      <section className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-border/80 pb-3 flex items-baseline justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-semibold block">
              02 &mdash; LEARNING INTERVENTION LAUNCH
            </span>
            <h2 className="text-lg font-bold text-text-primary">
              iGOT Karmayogi Bharat Integration
            </h2>
          </div>
          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-semibold">
            {hasExternalUrl ? 'Verified iGOT Content' : 'Local Curriculum Representation'}
          </span>
        </div>

        {/* Launch Banner */}
        <div className="p-5 rounded-xl bg-surface-alt border border-border space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-action-blue/10 text-action-blue flex items-center justify-center shrink-0 mt-0.5 border border-action-blue/20 font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs leading-relaxed text-text-secondary">
              <p className="font-bold text-text-primary text-sm">
                External Learning Platform Guidance
              </p>
              <p>
                This learning module is hosted on the official <strong>iGOT Karmayogi Bharat</strong> portal.
                VYREN launches the verified curriculum directly on Mission Karmayogi. Studying this course builds learning activity evidence.
              </p>
              <p className="font-mono text-[11px] text-text-secondary pt-1">
                * Note: Under capacity building governance, course interaction records learning evidence. Verified competency score recalibration requires completing a post-learning assessment.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            {hasExternalUrl ? (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary font-bold text-xs transition shadow-xs"
              >
                <span>Launch Course on iGOT Karmayogi</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>External iGOT portal link unavailable. Viewing local syllabus representation below.</span>
              </div>
            )}

            <Link
              to={ROUTES.LEARNER.ASSESSMENT('a1000000-0000-0000-0000-000000000001')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface border border-border hover:bg-surface-alt text-text-primary font-bold text-xs transition shadow-2xs"
            >
              <span>Proceed to Post-Learning Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Local Modules / Syllabus View */}
        {course.lessons && course.lessons.length > 0 && (
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
              Curriculum Module Structure ({course.lessons.length} Modules)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {course.lessons.map((les: any, idx: number) => (
                <div
                  key={les.id || idx}
                  className={`p-4 rounded-xl border text-left space-y-2 transition ${
                    activeLesson?.id === les.id
                      ? 'border-primary-navy bg-white ring-1 ring-primary-navy/20 shadow-xs'
                      : 'border-border bg-surface-alt'
                  }`}
                  onClick={() => setActiveLesson(les)}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
                    <span>Module 0{idx + 1}</span>
                    <span>{les.duration}</span>
                  </div>
                  <div className="text-xs font-bold text-text-primary line-clamp-2">
                    {les.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Module Detail */}
        {activeLesson && (
          <div className="p-5 rounded-xl border border-border bg-surface space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-xs font-bold font-mono text-text-primary uppercase">
                Module Content Preview &bull; {activeLesson.title}
              </h4>
              <span className="text-[10px] font-mono text-text-secondary">
                Type: {activeLesson.type?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {activeLesson.content || 'Standard learning module content for this competency intervention.'}
            </p>

            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] font-mono text-text-secondary flex items-center gap-1.5">
                <CheckCircle2 className={`w-4 h-4 ${evidenceRecorded ? 'text-emerald-600' : 'text-text-secondary/40'}`} />
                <span>
                  {evidenceRecorded
                    ? 'Learning activity recorded as evidence.'
                    : 'Record learning activity to update pathway progress.'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRecordLearningEvidence}
                disabled={isRecordingEvidence || evidenceRecorded}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  evidenceRecorded
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono'
                    : 'bg-surface-alt hover:bg-surface border border-border text-text-primary'
                }`}
              >
                {isRecordingEvidence
                  ? 'Recording Evidence...'
                  : evidenceRecorded
                  ? 'Activity Recorded ✓'
                  : 'Record Learning Activity'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 03 — POST-LEARNING RECALIBRATION BRIDGE (Evidence-Based Architecture)     */}
      {/* ========================================================================= */}
      <section className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="border-b border-border/80 pb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-semibold block">
            03 &mdash; POST-LEARNING COMPETENCY RECALIBRATION
          </span>
          <h2 className="text-base font-bold text-text-primary">
            Evidence-Based Competency Verification
          </h2>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          Under the VYREN competency framework, completing learning modules on iGOT Karmayogi provides <strong>learning evidence</strong>. Official score recalibration and cadre gap reduction require <strong>assessment evidence</strong> established through a post-learning evaluation.
        </p>

        <div className="p-4 rounded-xl bg-surface-alt border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-text-primary block">
              Ready to verify your learning outcomes?
            </span>
            <span className="text-[11px] font-mono text-text-secondary block">
              Takes ~15 minutes &bull; Evaluates targeted competency items &bull; Updates score &amp; gap matrix
            </span>
          </div>

          <Link
            to={ROUTES.LEARNER.ASSESSMENT('a1000000-0000-0000-0000-000000000001')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-navy hover:bg-primary-navy/90 text-on-primary font-bold text-xs transition shadow-xs shrink-0"
          >
            <span>Start Post-Learning Assessment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CourseDetailPage;
