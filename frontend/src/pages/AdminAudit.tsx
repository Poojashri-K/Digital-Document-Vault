import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Activity,
  Info,
} from 'lucide-react';
import { api, getErrorMessage } from '../api/client';
import { ApiResponse, AuditEventItem, PagedResponse } from '../types';
import { formatDate, formatRelativeDate } from '../utils/formatters';
import { useToast } from '../contexts/ToastContext';

const EVENT_TYPE_OPTIONS = [
  { label: 'All Event Types', value: '' },
  { label: 'AUTH_LOGIN_SUCCESS', value: 'AUTH_LOGIN_SUCCESS' },
  { label: 'AUTH_LOGIN_FAILED', value: 'AUTH_LOGIN_FAILED' },
  { label: 'AUTH_LOGOUT', value: 'AUTH_LOGOUT' },
  { label: 'AUTH_REGISTER', value: 'AUTH_REGISTER' },
  { label: 'DOCUMENT_UPLOAD', value: 'DOCUMENT_UPLOAD' },
  { label: 'DOCUMENT_VERSION_UPLOAD', value: 'DOCUMENT_VERSION_UPLOAD' },
  { label: 'DOCUMENT_DOWNLOAD', value: 'DOCUMENT_DOWNLOAD' },
  { label: 'DOCUMENT_DELETE', value: 'DOCUMENT_DELETE' },
  { label: 'SHARE_GRANT', value: 'SHARE_GRANT' },
  { label: 'SHARE_REVOKE', value: 'SHARE_REVOKE' },
  { label: 'ACCESS_DENIED', value: 'ACCESS_DENIED' },
  { label: 'USER_STATUS_CHANGE', value: 'USER_STATUS_CHANGE' },
  { label: 'PROFILE_UPDATE', value: 'PROFILE_UPDATE' },
];

export const AdminAudit: React.FC = () => {
  const [logs, setLogs] = useState<AuditEventItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [eventType, setEventType] = useState('');
  const [actorUsername, setActorUsername] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { error: showError, success } = useToast();

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });

      if (eventType) params.append('eventType', eventType);
      if (actorUsername.trim()) params.append('actorUsername', actorUsername.trim());
      if (resourceType.trim()) params.append('resourceType', resourceType.trim());
      if (fromDate) params.append('fromDate', new Date(fromDate).toISOString());
      if (toDate) params.append('toDate', new Date(toDate).toISOString());

      const res = await api.get<ApiResponse<PagedResponse<AuditEventItem>>>(
        `/api/admin/audit-logs?${params.toString()}`
      );

      setLogs(res.data.data.content);
      setTotalElements(res.data.data.totalElements);
      setTotalPages(res.data.data.totalPages);
    } catch (err: unknown) {
      showError('Error Loading Audit Trail', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, size, eventType, actorUsername, resourceType, fromDate, toDate, showError]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
    success('Copied', `${label} copied to clipboard.`);
  };

  const handleResetFilters = () => {
    setEventType('');
    setActorUsername('');
    setResourceType('');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  const getEventBadgeClass = (type: string) => {
    if (type.includes('DENIED') || type.includes('FAILED')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (type.includes('REVOKE') || type.includes('DELETE')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (type.includes('SHARE') || type.includes('GRANT')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (type.includes('UPLOAD') || type.includes('DOWNLOAD')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-brand-600" />
            Security & Compliance Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable system-wide event logs capturing authentication, document access, sharing, revocations, and policy denials (AC-05).
          </p>
        </div>

        <button
          onClick={() => fetchAuditLogs()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Trail
        </button>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            Filter Audit Events
          </h3>
          <button
            onClick={handleResetFilters}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => {
                setEventType(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            >
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Actor Username</label>
            <input
              type="text"
              placeholder="e.g. owner@vault.local"
              value={actorUsername}
              onChange={(e) => {
                setActorUsername(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Resource Type</label>
            <input
              type="text"
              placeholder="e.g. Document, Share, User"
              value={resourceType}
              onChange={(e) => {
                setResourceType(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">From Date (UTC)</label>
            <input
              type="datetime-local"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Querying security audit repository...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Activity className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-slate-900 text-base">No audit events found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              No audit records match the selected filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4 text-right">Correlation ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <div className="font-medium text-slate-900">{formatDate(log.createdAt)}</div>
                      <span className="text-[10px] text-slate-400">{formatRelativeDate(log.createdAt)}</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getEventBadgeClass(
                          log.eventType
                        )}`}
                      >
                        {log.eventType}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{log.actorUsername || 'SYSTEM'}</div>
                      {log.actorId && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {log.actorId.substring(0, 8)}...
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{log.resourceType || '-'}</div>
                      {log.resourceId && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {log.resourceId.substring(0, 8)}...
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={log.actionDetails || ''}>
                      {log.actionDetails || '-'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {log.ipAddress || '-'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      {log.correlationId ? (
                        <button
                          onClick={() => handleCopy(log.correlationId, 'Correlation ID')}
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-slate-800 p-1 rounded bg-slate-50 border border-slate-200"
                          title={`Copy: ${log.correlationId}`}
                        >
                          <span>{log.correlationId.substring(0, 8)}...</span>
                          {copiedId === log.correlationId ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing {page * size + 1} to {Math.min((page + 1) * size, totalElements)} of {totalElements} audit entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium"
              >
                Previous
              </button>
              <span className="font-medium text-slate-700">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security notice card */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Zero-Knowledge Audit Trail Compliance</p>
          <p>
            Audit events strictly exclude sensitive authorization tokens, user passwords, session secrets, and document payloads.
            Correlation IDs uniquely tie each HTTP request to application server logging and persistent database entries without data disclosure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAudit;
