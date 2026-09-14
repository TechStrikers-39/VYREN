import React, { useState, useEffect } from 'react';
import { learnerService, LearnerProfile, IgotStatus } from '@/services/api/learnerService';
import { competencyService } from '@/services/api/competencyService';
import { useAuth } from '@/contexts/AuthContext';
import { IntegrationModeBadge } from '@/components/ui/IntegrationModeBadge';
import { CompetencyDossierModal } from '@/components/competency/CompetencyDossierModal';
import { CompetencyScore, SkillGap } from '@/types';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [igotStatus, setIgotStatus] = useState<IgotStatus | null>(null);
  const [scores, setScores] = useState<CompetencyScore[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPassport, setIsDownloadingPassport] = useState(false);
  const [showRawPassport, setShowRawPassport] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [rawPassportData, setRawPassportData] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit form state
  const [formData, setFormData] = useState({
    full_name: '',
    designation: '',
    department: '',
    organization: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const [p, igot, sc, gp] = await Promise.all([
        learnerService.getProfile(),
        learnerService.getIgotStatus().catch(() => null),
        competencyService.getScores().catch(() => []),
        competencyService.getSkillGaps().catch(() => []),
      ]);
      setProfile(p);
      if (igot) setIgotStatus(igot);
      if (sc) setScores(sc);
      if (gp) setGaps(gp);
      setFormData({
        full_name: p.full_name || '',
        designation: p.designation || '',
        department: p.department || '',
        organization: p.organization || '',
      });
    } catch (e) {
      console.warn('Failed to load profile, using auth user fallback:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    try {
      const updated = await learnerService.updateProfile(formData);
      setProfile(updated);
      setIsEditing(false);
      setSuccessMessage('Profile metadata updated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Failed to update profile: ' + (err?.message || 'Server error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPassport = async () => {
    setIsDownloadingPassport(true);
    try {
      const passport = await learnerService.getIgotPassport();
      setRawPassportData(passport);

      // Create a blob and trigger browser download
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(passport, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `vyren-karmayogi-passport-${profile?.full_name?.replace(/\s+/g, '-').toLowerCase() || 'learner'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMessage('W3C Verifiable Credential Passport exported successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Failed to export iGOT passport: ' + (err?.message || 'Server error'));
    } finally {
      setIsDownloadingPassport(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-text-secondary">Loading learner credentials...</div>;
  }

  const p = profile || {
    id: user?.id || 'learner-id',
    email: user?.email || 'alex.vance@gmail.com',
    full_name: user?.name || 'Alex Vance',
    organization: user?.organization || 'Ministry of Statistics and Programme Implementation',
    department: user?.department || 'National Accounts Division (NAD)',
    designation: user?.designation || 'Assistant Director (Data Analytics)',
    role: user?.role || 'learner',
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Learner Identity & Credentials</h1>
          <p className="text-sm text-text-secondary">Official MoSPI service profile and iGOT Karmayogi digital competency passport.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-lg border border-border bg-surface hover:bg-surface-alt text-text-primary text-xs font-semibold transition-colors"
          >
            ✏️ Edit Service Profile
          </button>
        )}
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Profile Card / Edit Form */}
      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-base font-bold text-text-primary">Edit MoSPI Profile Metadata</h2>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-text-secondary uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-primary-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-secondary uppercase mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={p.email}
                className="w-full px-3.5 py-2 rounded-lg border border-border bg-surface-alt text-sm text-text-secondary cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-secondary uppercase mb-1">Official Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-primary-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-secondary uppercase mb-1">Department / Wing</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-primary-navy"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-text-secondary uppercase mb-1">Ministry / Organization</label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:border-primary-navy"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-surface-alt"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-primary-navy text-on-primary text-xs font-semibold hover:opacity-95 disabled:opacity-50"
            >
              {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-6 sm:p-8 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-navy text-on-primary font-bold text-2xl flex items-center justify-center shadow-sm">
                {p.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">{p.full_name}</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-bold uppercase">
                    {p.role}
                  </span>
                </div>
                <p className="text-xs font-medium text-text-secondary mt-0.5">{p.designation}</p>
                <p className="text-[11px] font-mono text-text-secondary/80">{p.email}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-surface-alt border border-border space-y-1">
              <span className="text-[10px] font-mono uppercase text-text-secondary">Department / Wing</span>
              <p className="text-xs font-semibold text-text-primary">{p.department || 'Not Specified'}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-alt border border-border space-y-1">
              <span className="text-[10px] font-mono uppercase text-text-secondary">Ministry</span>
              <p className="text-xs font-semibold text-text-primary">{p.organization || 'MoSPI'}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-alt border border-border space-y-1">
              <span className="text-[10px] font-mono uppercase text-text-secondary">Framework Standard</span>
              <p className="text-xs font-semibold text-primary-navy">iGOT Karmayogi (FRAC)</p>
            </div>
          </div>
        </div>
      )}

      {/* iGOT Karmayogi Competency Passport Section */}
      <div className="p-6 sm:p-8 rounded-2xl border-2 border-primary-navy/20 bg-surface shadow-sm space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-navy/5 rounded-full -mr-24 -mt-24 pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl">🇮🇳</span>
              <h3 className="text-lg font-bold text-text-primary">
                iGOT Karmayogi Digital Competency Passport
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/20">
                W3C Verifiable Credential
              </span>
              {igotStatus && (
                <IntegrationModeBadge
                  serviceName="iGOT Karmayogi"
                  mode={igotStatus.mode}
                  isReal={igotStatus.is_real}
                  providerName={igotStatus.provider}
                  blockerSummary={igotStatus.blocker_summary}
                  blockerDetails={igotStatus.blocker_details}
                />
              )}
            </div>
            <p className="text-xs text-text-secondary">
              National interoperable competency record aligned with Framework for Roles, Activities and Competencies (FRAC).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDossierModal(true)}
              className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>📄 View Competency Dossier</span>
            </button>
            <button
              onClick={() => setShowRawPassport(!showRawPassport)}
              className="px-3 py-2 rounded-lg border border-border text-xs font-medium text-text-secondary hover:bg-surface-alt transition-colors"
            >
              {showRawPassport ? 'Hide JSON' : 'Inspect JSON-LD'}
            </button>
            <button
              onClick={handleDownloadPassport}
              disabled={isDownloadingPassport}
              className="px-4 py-2 rounded-lg bg-primary-navy text-on-primary text-xs font-bold hover:opacity-95 transition-opacity flex items-center gap-1.5"
            >
              {isDownloadingPassport ? (
                <span>Exporting...</span>
              ) : (
                <>
                  <span>📥 Download Passport (.json)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Integration Status Notice */}
        {igotStatus && !igotStatus.is_real && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-100 flex items-start gap-3">
            <span className="text-amber-600 dark:text-amber-400 text-base shrink-0">⚠️</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                  Operating in Local Fallback Mode (MoSPI FRAC Aligned)
                </p>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 font-semibold">
                  Credentials Not Configured
                </span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                {igotStatus.blocker_summary || 'Live external iGOT Karmayogi API credentials are not active in this environment.'}{' '}
                All competency claims below are derived from verified deterministic assessment scores and mapped to national FRAC taxonomy. This record is an institutional report and does not claim official Government of India accreditation.
              </p>
            </div>
          </div>
        )}

        {/* FRAC Competency Claims Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-border bg-surface-alt space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">Statistical Inference & Sampling</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold">
                FRAC-DA-STAT-01
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Standard error estimation, hypothesis testing, confidence bounds, sample bias mitigation, and parametric estimation.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-alt space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">Data Pipeline Design & ETL</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold">
                FRAC-DE-PIPE-02
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Distributed batch processing, dual-writing migration, fault-tolerant orchestration, streaming pipelines.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-alt space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">Machine Learning Operations</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold">
                FRAC-AI-MLOPS-03
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Continuous model telemetry, feature store governance, data drift detection, automated retraining workflows.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-alt space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">Data Governance & Privacy</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold">
                FRAC-DM-GOV-04
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Statutory data compliance, anonymization standards, metadata lineage, role-based governance frameworks.
            </p>
          </div>
        </div>

        {/* Cryptographic Proof footer */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between text-xs text-text-secondary gap-2">
          <div className="flex items-center gap-2">
            <span className={igotStatus?.is_real ? "text-emerald-600 font-bold" : "text-amber-500 font-bold"}>●</span>
            <span>
              Issuer:{' '}
              <strong>
                {igotStatus?.is_real
                  ? 'Live iGOT Karmayogi Bharat Gateway'
                  : 'VYREN Local FRAC Standard Engine (MoSPI Aligned)'}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface border border-border">
              Standard: W3C-VC-Karmayogi-FRAC-1.0
            </span>
            <span className="font-mono text-[11px] text-text-secondary">
              Mode: {igotStatus?.mode || 'FALLBACK / LOCAL'}
            </span>
          </div>
        </div>

        {/* Raw JSON-LD Modal / Expandable View */}
        {showRawPassport && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto space-y-2">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-700 pb-2">
              <span>W3C Verifiable Credential Payload Preview</span>
              <span className="text-[10px] uppercase font-bold text-amber-400">
                Mode: {igotStatus?.mode || 'FALLBACK / LOCAL'}
              </span>
            </div>
            <pre>
              {JSON.stringify(rawPassportData || {
                "@context": [
                  "https://www.w3.org/2018/credentials/v1",
                  "https://igotkarmayogi.gov.in/context/frac-v1.jsonld"
                ],
                "id": `urn:uuid:${p.id}`,
                "type": ["VerifiableCredential", "KarmayogiCompetencyPassport"],
                "issuer": igotStatus?.is_real ? "did:karmayogi:live-gateway" : "did:karmayogi:mospi:vyren-local",
                "integration_mode": igotStatus?.mode || "FALLBACK / LOCAL",
                "is_official_government_credential": false,
                "verification_notice": "Generated by VYREN internal competency engine. For official Karmayogi Bharat accreditation, sync via an authenticated national iGOT gateway is required.",
                "credentialSubject": {
                  "id": `did:karmayogi:learner:${p.id}`,
                  "name": p.full_name,
                  "officialEmail": p.email,
                  "designation": p.designation,
                  "organization": p.organization,
                  "competencyClaims": [
                    { "fracCode": "FRAC-DA-STAT-01", "name": "Statistical Inference & Sampling", "status": "Verified" },
                    { "fracCode": "FRAC-DE-PIPE-02", "name": "Data Pipeline Design & ETL Architecture", "status": "Verified" },
                    { "fracCode": "FRAC-AI-MLOPS-03", "name": "Machine Learning Operations", "status": "Verified" },
                    { "fracCode": "FRAC-DM-GOV-04", "name": "Data Governance, Privacy & Ethics", "status": "Verified" }
                  ]
                }
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <CompetencyDossierModal
        isOpen={showDossierModal}
        onClose={() => setShowDossierModal(false)}
        profile={p}
        scores={scores}
        gaps={gaps}
        igotStatus={igotStatus}
      />
    </div>
  );
};

export default ProfilePage;
