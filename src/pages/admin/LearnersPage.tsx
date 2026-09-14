import React, { useEffect, useState } from 'react';
import { adminService, AdminUser } from '@/services/api/adminService';
import {
  FileSpreadsheet,
  RefreshCw,
  Search,
  CheckCircle2,
  Users,
  ShieldCheck,
  Award
} from 'lucide-react';

export const AdminLearnersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'learner' | 'trainer' | 'admin'>('all');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (e) {
      console.warn('Failed to load admin users:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const csvData = await adminService.exportWorkforceMatrixCsv();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `vyren_workforce_competency_matrix_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export matrix: ' + (err?.message || 'Server error'));
    } finally {
      setIsExporting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Workforce Directory</h1>
          <p className="text-sm text-text-secondary">
            Manage organization data professionals, active roles, and measured competency indices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span>{isExporting ? 'Exporting Matrix...' : 'Export Workforce Matrix (CSV)'}</span>
          </button>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-alt text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Directory</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, designation, or department..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary-navy"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-surface border border-border p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {(['all', 'learner', 'trainer', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                roleFilter === r
                  ? 'bg-primary-navy text-on-primary font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt'
              }`}
            >
              {r === 'all' ? 'All Roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <span className="text-xs font-mono text-text-secondary">
            Showing {filteredUsers.length} of {users.length} Data Professionals
          </span>
          <span className="text-xs font-mono text-text-secondary">
            MoSPI Roster • Supabase Synced
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-text-secondary text-sm">
            Fetching organization directory from Supabase...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-text-secondary text-sm">
            No users found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-mono uppercase text-text-secondary">
                  <th className="py-3 px-3 font-semibold">Data Professional</th>
                  <th className="py-3 px-3 font-semibold">Designation & Department</th>
                  <th className="py-3 px-3 font-semibold">Role</th>
                  <th className="py-3 px-3 font-semibold">Competency Index</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((u) => {
                  const roleBadge =
                    u.role === 'admin'
                      ? 'bg-purple-500/10 text-purple-700 border-purple-500/20'
                      : u.role === 'trainer'
                      ? 'bg-blue-500/10 text-blue-700 border-blue-500/20'
                      : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';

                  const estimatedLevel = Math.min(4, Math.floor((u.competency_index || 0) / 25));

                  return (
                    <tr key={u.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-text-primary">{u.full_name || u.email.split('@')[0]}</div>
                        <div className="text-xs text-text-secondary font-mono">{u.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-xs font-medium text-text-primary">{u.designation || 'Staff Officer'}</div>
                        <div className="text-[11px] text-text-secondary">{u.department || 'MoSPI Wing'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase ${roleBadge}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-primary-navy">
                            {u.competency_index}%
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.2 rounded bg-surface-alt border border-border text-text-secondary">
                            Level {estimatedLevel}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-700 font-bold border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLearnersPage;
