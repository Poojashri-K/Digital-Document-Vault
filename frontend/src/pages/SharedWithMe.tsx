import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Share2,
  Search,
  Download,
  Eye,
  Clock,
  User,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  RefreshCw,
  Info,
} from 'lucide-react';
import { api, getErrorMessage } from '../api/client';
import { ApiResponse, DocumentSummary, PagedResponse } from '../types';
import { formatBytes, formatRelativeDate, formatDate, isExpired, getFileCategory } from '../utils/formatters';
import { PermissionBadge } from '../components/Badge';
import { useToast } from '../contexts/ToastContext';

export const SharedWithMe: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { success, error: showError } = useToast();

  const fetchSharedDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });

      if (searchTerm.trim()) {
        params.append('query', searchTerm.trim());
      }

      const res = await api.get<ApiResponse<PagedResponse<DocumentSummary>>>(
        `/api/documents/shared-with-me?${params.toString()}`
      );

      setDocuments(res.data.data.content);
      setTotalElements(res.data.data.totalElements);
      setTotalPages(res.data.data.totalPages);
    } catch (err: unknown) {
      showError('Error Loading Shared Documents', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, size, searchTerm, showError]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSharedDocuments();
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [fetchSharedDocuments]);

  const handleDownload = async (doc: DocumentSummary) => {
    if (doc.sharedPermissionType === 'VIEW') {
      showError('Download Forbidden', 'This document was shared with VIEW-only permission.');
      return;
    }

    try {
      setDownloadingId(doc.id);
      const res = await api.get(`/api/documents/${doc.id}/download`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.currentFileName || 'downloaded-document');
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      success('Download Started', `Downloading ${doc.currentFileName}`);
    } catch (err: unknown) {
      showError('Download Failed', getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  const renderFileIcon = (contentType?: string, fileName?: string) => {
    const cat = getFileCategory(contentType || '', fileName || '');
    switch (cat) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'image':
        return <FileImage className="w-5 h-5 text-blue-500" />;
      case 'word':
        return <FileText className="w-5 h-5 text-blue-600" />;
      default:
        return <FileIcon className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Share2 className="w-6 h-6 text-brand-600" />
            Shared with Me
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access files shared securely by other document owners. Granular VIEW/DOWNLOAD policies apply.
          </p>
        </div>

        <button
          onClick={() => fetchSharedDocuments()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search shared documents by title..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && documents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Checking permissions & loading shared documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
              <Share2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">No shared documents found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Documents shared with your account by other vault owners will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Shared By</th>
                  <th className="py-3 px-4">Permission</th>
                  <th className="py-3 px-4">Expiry</th>
                  <th className="py-3 px-4">Size & Version</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc) => {
                  const expired = doc.sharedExpiresAt ? isExpired(doc.sharedExpiresAt) : false;
                  const canDownload = doc.sharedPermissionType === 'DOWNLOAD' && !expired;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 mt-0.5">
                            {renderFileIcon(doc.currentContentType, doc.currentFileName)}
                          </div>
                          <div>
                            <Link
                              to={`/documents/${doc.id}`}
                              className="font-medium text-slate-900 hover:text-brand-600 transition-colors line-clamp-1"
                            >
                              {doc.title}
                            </Link>
                            <span className="text-xs text-slate-400 font-mono block mt-0.5">
                              {doc.currentFileName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doc.ownerFullName || doc.ownerUsername}</span>
                        </div>
                        <span className="text-slate-400 text-[11px] block mt-0.5">
                          {formatRelativeDate(doc.createdAt)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {doc.sharedPermissionType ? (
                          <PermissionBadge permission={doc.sharedPermissionType} />
                        ) : (
                          <span className="text-xs text-slate-400 italic">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {doc.sharedExpiresAt ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Clock className={`w-3.5 h-3.5 ${expired ? 'text-red-500' : 'text-amber-500'}`} />
                              <span className={expired ? 'font-semibold text-red-600' : 'text-slate-700'}>
                                {expired ? 'Expired' : formatRelativeDate(doc.sharedExpiresAt)}
                              </span>
                            </div>
                            <span className="text-slate-400 text-[11px] block">
                              {formatDate(doc.sharedExpiresAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Never expires
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div>{formatBytes(doc.currentFileSizeBytes)}</div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] bg-slate-100 rounded text-slate-600 font-medium font-mono">
                          v{doc.currentVersionNumber || 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/documents/${doc.id}`}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="View Document Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {canDownload ? (
                            <button
                              onClick={() => handleDownload(doc)}
                              disabled={downloadingId === doc.id}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-50"
                              title="Download File"
                            >
                              {downloadingId === doc.id ? (
                                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <span
                              className="p-1.5 text-slate-300 cursor-not-allowed"
                              title={
                                expired
                                  ? 'Share permission has expired'
                                  : 'View-only permission (Download disabled)'
                              }
                            >
                              <Download className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing {page * size + 1} to {Math.min((page + 1) * size, totalElements)} of {totalElements} shared documents
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

      {/* Security Advisory note */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-900">Zero-Trust Access Enforcement</p>
          <p>
            Shared documents are evaluated against authorization policies, active statuses, and expiration timestamps on every individual request.
            Recipients are strictly prohibited from cascading shares. Revocations by document owners take effect immediately.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SharedWithMe;
