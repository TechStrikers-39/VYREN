import React, { useEffect, useState } from 'react';
import { adminService, TrainingEffectivenessItem } from '@/services/api/adminService';
import { useTranslation } from '@/i18n';
import { BookOpen, Users, CheckCircle2, TrendingUp, Sparkles, ExternalLink } from 'lucide-react';

export const AdminTrainingPage: React.FC = () => {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<TrainingEffectivenessItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getTrainingEffectiveness();
      setPrograms(data.programs || []);
    } catch (e) {
      console.warn('Failed to load training effectiveness metrics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const totalEnrollments = programs.reduce((acc, p) => acc + (p.enrolled_count || 0), 0);
  const totalCompleted = programs.reduce((acc, p) => acc + (p.completed_count || 0), 0);
  const avgCompletionRate = programs.length > 0
    ? Math.round(programs.reduce((acc, p) => acc + (p.completion_rate || 0), 0) / programs.length)
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('admin.trainingTitle')}</h1>
          <p className="text-sm text-text-secondary">
            {t('admin.trainingSubtitle')}
          </p>
        </div>
        <button
          onClick={loadPrograms}
          className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-surface-alt transition-colors shrink-0"
        >
          ↻ Refresh Effectiveness Metrics
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-1">
          <span className="text-[11px] font-mono text-text-secondary uppercase">Active Training Programs</span>
          <div className="text-2xl font-bold text-primary-navy mt-1">
            {isLoading ? '...' : programs.length}
          </div>
          <p className="text-[11px] text-text-secondary font-mono">Curated under MoSPI & Karmayogi Bharat</p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-1">
          <span className="text-[11px] font-mono text-text-secondary uppercase">Total Officer Enrollments</span>
          <div className="text-2xl font-bold text-primary-navy mt-1">
            {isLoading ? '...' : totalEnrollments}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold font-mono">
            {totalCompleted} modules fully verified
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-1">
          <span className="text-[11px] font-mono text-text-secondary uppercase">Enterprise Completion Rate</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {isLoading ? '...' : `${avgCompletionRate}%`}
          </div>
          <p className="text-[11px] text-text-secondary font-mono">Targeting 85% by Q4 FY26</p>
        </div>
      </div>

      {/* Training Programs Table */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-text-primary">Program Enrollment & Progress Roster</h3>
            <p className="text-xs text-text-secondary">
              Real-time progress aggregated across all active officer learning paths.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            ● Real-Time PostgREST Telemetry
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-text-secondary text-sm">
            Aggregating training metrics...
          </div>
        ) : programs.length === 0 ? (
          <div className="py-12 text-center text-text-secondary text-sm">
            No training enrollments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-text-secondary font-mono uppercase text-[11px]">
                  <th className="py-3 px-3">Program / Course</th>
                  <th className="py-3 px-3">Category & Provider</th>
                  <th className="py-3 px-3">Enrolled</th>
                  <th className="py-3 px-3">Completion Rate</th>
                  <th className="py-3 px-3">Avg Progress</th>
                  <th className="py-3 px-3">Governance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {programs.map((p) => (
                  <tr key={p.course_id} className="hover:bg-surface-alt/50 transition">
                    <td className="py-3.5 px-3 max-w-xs">
                      <div className="font-bold text-text-primary text-sm line-clamp-1">{p.title}</div>
                      <div className="text-[10px] font-mono text-text-secondary mt-0.5">ID: {p.course_id}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-primary-navy/10 text-primary-navy border border-primary-navy/20 mb-1">
                        {p.category || 'Statistical Core'}
                      </span>
                      <div className="text-[11px] text-text-secondary">{p.level || 'Level 1'}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 font-bold font-mono text-sm text-text-primary">
                        <Users className="w-3.5 h-3.5 text-text-secondary" />
                        <span>{p.enrolled_count}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="space-y-1 w-28">
                        <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                          <span>{p.completion_rate}%</span>
                          <span className="text-text-secondary font-normal">({p.completed_count}/{p.enrolled_count})</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden border border-border">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, p.completion_rate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs font-semibold text-text-primary">
                      {p.avg_progress}%
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Mandatory MoSPI
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTrainingPage;
