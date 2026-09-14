import React, { useState, useEffect } from 'react';
import { igotService, IgotCourse, IgotStatus } from '@/services/api/igotService';
import { Search, ExternalLink, BookOpen, Clock, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

const QUICK_SUGGESTIONS = [
  'Overview of Basic Statistics',
  'Data Governance',
  'Python for Data Science',
  'Survey Sampling',
  'Machine Learning',
  'MoSPI',
];

export const IgotSearchCatalog: React.FC = () => {
  const [query, setQuery] = useState('Statistics');
  const [courses, setCourses] = useState<IgotCourse[]>([]);
  const [status, setStatus] = useState<IgotStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch live provider status on mount
    igotService.getStatus().then(setStatus).catch(() => null);
    // Initial search
    executeSearch('Statistics');
  }, []);

  const executeSearch = async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await igotService.searchCourses(searchTerm);
      setCourses(results || []);
    } catch (err: any) {
      console.error('Failed to search iGOT courses:', err);
      setError(err?.message || 'Failed to search live iGOT catalog.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      executeSearch(query.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    executeSearch(suggestion);
  };

  return (
    <div className="space-y-6">
      {/* Header & Gateway Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-text-primary">Live iGOT Karmayogi Catalog</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              <Sparkles className="w-3 h-3" /> Sunbird API
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Search live courses hosted across Karmayogi Bharat and National Statistical Systems Training Academy (NSSTA).
          </p>
        </div>

        {status && (
          <div className="flex items-center gap-2 text-xs bg-surface-alt px-3 py-1.5 rounded-xl border border-border shrink-0">
            <span className={`w-2 h-2 rounded-full ${status.is_real ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-text-secondary font-mono text-[11px]">
              Provider: <strong className="text-text-primary">{status.provider}</strong> ({status.mode})
            </span>
          </div>
        )}
      </div>

      {/* Search Input & Quick Chips */}
      <div className="space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search competencies, official statistical topics, DO_IDs..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary-navy shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-primary-navy text-on-primary font-semibold text-xs sm:text-sm hover:opacity-95 transition disabled:opacity-50 shrink-0"
          >
            {loading ? 'Searching...' : 'Search Catalog'}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
          <span className="font-mono text-[11px] mr-1">Popular Topics:</span>
          {QUICK_SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleSuggestionClick(tag)}
              className="px-2.5 py-1 rounded-lg bg-surface-alt hover:bg-border/60 text-text-primary border border-border text-[11px] transition"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary-navy border-t-transparent animate-spin" />
          <p className="text-xs text-text-secondary font-mono">Querying Sunbird content discovery gateway...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl p-8 bg-surface-alt/50">
          <BookOpen className="w-10 h-10 text-text-secondary mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-bold text-text-primary">No Matching iGOT Courses Found</h3>
          <p className="text-xs text-text-secondary mt-1">
            Try searching for other keywords like "Statistics", "Sampling", "Data", or "Survey".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => {
            const externalUrl =
              c.external_url ||
              (c.do_id ? `https://igotkarmayogi.gov.in/app/toc/${c.do_id}/overview` : 'https://igotkarmayogi.gov.in');

            return (
              <div
                key={c.id || c.do_id}
                className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-primary-navy/50 hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-primary-navy/10 text-primary-navy border border-primary-navy/20 uppercase truncate max-w-[170px]">
                      {c.provider || 'iGOT Karmayogi'}
                    </span>
                    {c.do_id && (
                      <span className="text-[10px] font-mono text-text-secondary/70 bg-surface-alt px-1.5 py-0.5 rounded border border-border shrink-0">
                        {c.do_id.substring(0, 12)}...
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-text-primary leading-snug line-clamp-2">
                    {c.title}
                  </h3>

                  <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed">
                    {c.description || 'Comprehensive competency building course offered via Karmayogi Bharat framework.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-[11px] text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {c.duration || 'Self-paced'}
                    </span>
                    {c.competency_area && (
                      <span className="flex items-center gap-1 font-mono text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {c.competency_area}
                      </span>
                    )}
                  </div>

                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-surface-alt hover:bg-primary-navy hover:text-on-primary text-text-primary border border-border hover:border-transparent text-xs font-semibold flex items-center justify-center gap-1.5 transition group"
                  >
                    <span>Open on iGOT Karmayogi</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IgotSearchCatalog;
