import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, getErrorMessage } from '../api/client';
import { ApiResponse, DocumentSummary, PagedResponse } from '../types';
import { formatBytes, formatRelativeDate, getFileCategory } from '../utils/formatters';
import { StatusBadge, PermissionBadge } from '../components/Badge';
import {
  Files,
  Share2,
  Upload,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCode,
  File as FileIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

export const Dashboard: React.FC = () => {
  const { user, isSystemAdmin, isVaultAdmin } = useAuth();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [sharedDocs, setSharedDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, success } = useToast();

  useEffect(() => {
    if (isSystemAdmin) {
      setLoading(false);
      return;
    }

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [docsRes, sharedRes] = await Promise.all([
          api.get<ApiResponse<PagedResponse<DocumentSummary>>>('/api/documents?page=0&size=5'),
          api.get<ApiResponse<PagedResponse<DocumentSummary>>>('/api/documents/shared-with-me?page=0&size=5'),
        ]);

        setDocuments(docsRes.data.data.content);
        setSharedDocs(sharedRes.data.data.content);
      } catch (err) {
        error('Dashboard Error', getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [isSystemAdmin]);

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const response = await api.get(`/api/documents/${docId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      success('Download Started', `Downloading ${fileName}`);
    } catch (err) {
      error('Download Failed', getErrorMessage(err));
    }
  };

  const renderFileIcon = (contentType: string, fileName: string) => {
    const cat = getFileCategory(contentType, fileName);
    switch (cat) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500" />;
      case 'image':
        return <FileImage className="w-5 h-5 text-blue-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case 'word':
        return <FileText className="w-5 h-5 text-indigo-500" />;
      case 'text':
        return <FileCode className="w-5 h-5 text-amber-500" />;
      default:
        return <FileIcon className="w-5 h-5 text-slate-400" />;
    }
  };

  if (isSystemAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Administration Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            System account configuration, user lifecycle, and security governance
          </p>
        </div>

        {/* Least Privilege Banner */}
        <div className="p-5 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-4">
          <div className="p-2.5 bg-purple-600 text-white rounded-xl flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-950 text-base">Least Privilege Architecture Enforced</h3>
            <p className="text-sm text-purple-900/80 mt-1 leading-relaxed">
              As mandated by the security specification, System Administration credentials do not automatically confer unrestricted access to private business vault documents. User and role administration is isolated from document contents.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/admin/users"
            className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-vault-300 transition group flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">User Directory</p>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Manage Users & Status</h2>
              <p className="text-xs text-slate-500 mt-1">Configure account locking, activation, and role assignments</p>
            </div>
            <div className="p-3 bg-vault-50 rounded-xl text-vault-700 group-hover:bg-vault-800 group-hover:text-white transition">
              <ArrowRight className="w-5 h-5" />
            </div>
          </Link>

          <Link
            to="/admin/audit"
            className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-vault-300 transition group flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security Observability</p>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Inspect Audit Logs</h2>
              <p className="text-xs text-slate-500 mt-1">Review authenticated actions, denied access events, and correlation IDs</p>
            </div>
            <div className="p-3 bg-vault-50 rounded-xl text-vault-700 group-hover:bg-vault-800 group-hover:text-white transition">
              <ArrowRight className="w-5 h-5" />
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome, {user?.fullName}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Secure digital repository for verified documents and controlled shares
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-vault-800 hover:bg-vault-900 text-white font-medium text-sm rounded-xl transition shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Documents</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Files className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{documents.length}</p>
          <p className="text-xs text-slate-500 mt-1">Documents in personal vault</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shared with Me</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{sharedDocs.length}</p>
          <p className="text-xs text-slate-500 mt-1">Active shared records</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security State</span>
            <div className="p-2 bg-vault-50 text-vault-700 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">Protected</p>
          <p className="text-xs text-slate-500 mt-1">Opaque keys & zero webroot</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role Scope</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            {isVaultAdmin ? 'Vault Admin' : 'Doc Owner'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Self-service & workflow</p>
        </div>
      </div>

      {/* Recent My Documents */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 text-base">Recent Owned Documents</h2>
            <p className="text-xs text-slate-500">Your latest uploaded repository items</p>
          </div>
          <Link
            to="/documents"
            className="text-xs font-semibold text-vault-600 hover:text-vault-700 flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <Files className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No documents uploaded yet</p>
            <p className="text-xs text-slate-500 mt-1">Upload your first document to store it securely in the vault</p>
            <Link
              to="/upload"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-vault-800 text-white text-xs font-semibold rounded-xl"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Document Title</th>
                  <th className="px-6 py-3">File / Size</th>
                  <th className="px-6 py-3">Version</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Uploaded</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <Link to={`/documents/${doc.id}`} className="font-semibold text-slate-900 hover:text-vault-600">
                        {doc.title}
                      </Link>
                      {doc.description && (
                        <p className="text-xs text-slate-500 truncate max-w-xs">{doc.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {renderFileIcon(doc.currentContentType, doc.currentFileName)}
                        <div>
                          <p className="text-xs font-medium text-slate-900 truncate max-w-[150px]">
                            {doc.currentFileName}
                          </p>
                          <p className="text-[11px] text-slate-400">{formatBytes(doc.currentFileSizeBytes)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">v{doc.currentVersionNumber}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{formatRelativeDate(doc.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDownload(doc.id, doc.currentFileName)}
                          className="p-1.5 text-vault-700 hover:text-vault-900 hover:bg-vault-50 rounded-lg transition"
                          title="Download File"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Shared with Me */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 text-base">Shared With Me</h2>
            <p className="text-xs text-slate-500">Documents shared with your account</p>
          </div>
          <Link
            to="/shared-with-me"
            className="text-xs font-semibold text-vault-600 hover:text-vault-700 flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading shared documents...</div>
        ) : sharedDocs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No documents have been shared with your email yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Document Title</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3">Permission</th>
                  <th className="px-6 py-3">Shared Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sharedDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">{doc.title}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{doc.ownerFullName}</td>
                    <td className="px-6 py-4">
                      {doc.sharedPermissionType && (
                        <PermissionBadge permission={doc.sharedPermissionType} />
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{formatRelativeDate(doc.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {doc.sharedPermissionType === 'DOWNLOAD' && (
                          <button
                            onClick={() => handleDownload(doc.id, doc.currentFileName)}
                            className="p-1.5 text-vault-700 hover:text-vault-900 hover:bg-vault-50 rounded-lg transition"
                            title="Download File"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
