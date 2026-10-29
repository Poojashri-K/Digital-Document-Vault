import React, { useEffect, useState, useCallback } from 'react';
import { api, getErrorMessage } from '../api/client';
import { ApiResponse, DocumentStatus, DocumentSummary, PagedResponse, PermissionType } from '../types';
import { formatBytes, formatRelativeDate, getFileCategory } from '../utils/formatters';
import { StatusBadge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { Dropzone } from '../components/Dropzone';
import { useToast } from '../contexts/ToastContext';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Share2,
  Trash2,
  Plus,
  RefreshCw,
  Eye,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  File as FileIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const MyDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('ACTIVE');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modals state
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [shareDoc, setShareDoc] = useState<DocumentSummary | null>(null);
  const [newVersionDoc, setNewVersionDoc] = useState<DocumentSummary | null>(null);

  // Share form state
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<PermissionType>('VIEW');
  const [shareExpiry, setShareExpiry] = useState('');
  const [submittingShare, setSubmittingShare] = useState(false);

  // New version state
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [submittingVersion, setSubmittingVersion] = useState(false);

  const { success, error } = useToast();

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        size: '10',
        sortBy,
        sortDirection,
      });

      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim());
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const res = await api.get<ApiResponse<PagedResponse<DocumentSummary>>>(`/api/documents?${params.toString()}`);
      setDocuments(res.data.data.content);
      setTotalPages(res.data.data.totalPages);
      setTotalElements(res.data.data.totalElements);
    } catch (err) {
      error('Failed to load documents', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, sortBy, sortDirection, error]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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

  const handleDelete = async () => {
    if (!deleteDocId) return;
    try {
      await api.delete(`/api/documents/${deleteDocId}`);
      success('Document Deleted', 'The document has been safely archived/deleted.');
      setDeleteDocId(null);
      fetchDocuments();
    } catch (err) {
      error('Delete Failed', getErrorMessage(err));
    }
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareDoc || !shareEmail.trim()) return;

    setSubmittingShare(true);
    try {
      let expiresAt: string | null = null;
      if (shareExpiry) {
        expiresAt = new Date(shareExpiry).toISOString();
      }

      await api.post(`/api/documents/${shareDoc.id}/shares`, {
        recipientEmail: shareEmail.trim(),
        permissionType: sharePermission,
        expiresAt,
      });

      success('Document Shared', `Shared with ${shareEmail} with ${sharePermission} permission.`);
      setShareDoc(null);
      setShareEmail('');
      setShareExpiry('');
    } catch (err) {
      error('Share Failed', getErrorMessage(err));
    } finally {
      setSubmittingShare(false);
    }
  };

  const handleNewVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionDoc || !versionFile) return;

    setSubmittingVersion(true);
    try {
      const formData = new FormData();
      formData.append('file', versionFile);

      await api.post(`/api/documents/${newVersionDoc.id}/versions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      success('New Version Uploaded', `Uploaded v${newVersionDoc.currentVersionNumber + 1} successfully.`);
      setNewVersionDoc(null);
      setVersionFile(null);
      fetchDocuments();
    } catch (err) {
      error('Version Upload Failed', getErrorMessage(err));
    } finally {
      setSubmittingVersion(false);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Documents</h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, manage version history, and grant secure shares
          </p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-vault-800 hover:bg-vault-900 text-white font-medium text-sm rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search by title or description..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault-500 focus:bg-white transition"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(0);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-vault-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
              <option value="">All Statuses</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(0);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-vault-500"
            >
              <option value="createdAt">Created Date</option>
              <option value="title">Title</option>
              <option value="updatedAt">Updated Date</option>
            </select>
            <button
              onClick={() => {
                setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC');
                setPage(0);
              }}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              title="Toggle Sort Direction"
            >
              {sortDirection}
            </button>
          </div>

          <button
            onClick={() => fetchDocuments()}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Refresh documents"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="p-16 text-center">
            <FileIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800">No documents found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or upload a new file.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Title & Description</th>
                    <th className="px-6 py-3.5">File Details</th>
                    <th className="px-6 py-3.5">Version</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Last Updated</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
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
                        <div className="flex items-center gap-2.5">
                          {renderFileIcon(doc.currentContentType, doc.currentFileName)}
                          <div>
                            <p className="text-xs font-medium text-slate-900 truncate max-w-[170px]">
                              {doc.currentFileName}
                            </p>
                            <p className="text-[11px] text-slate-400">{formatBytes(doc.currentFileSizeBytes)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700">v{doc.currentVersionNumber}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{formatRelativeDate(doc.updatedAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/documents/${doc.id}`}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="View Metadata & Versions"
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
                          <button
                            onClick={() => setShareDoc(doc)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                            title="Share Document"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setNewVersionDoc(doc)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="Upload New Version"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteDocId(doc.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Archive / Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {documents.length} of {totalElements} documents (Page {page + 1} of {Math.max(1, totalPages)})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Share Document Modal */}
      {shareDoc && (
        <Modal
          isOpen={!!shareDoc}
          onClose={() => setShareDoc(null)}
          title={`Share "${shareDoc.title}"`}
          description="Grant VIEW or DOWNLOAD permissions to a registered user"
        >
          <form onSubmit={handleShareSubmit} className="space-y-4">
            <div>
              <label htmlFor="shareEmail" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Recipient Email
              </label>
              <input
                id="shareEmail"
                type="email"
                required
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="colleague@vault.local"
                className="mt-1.5 block w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Permission Level
              </label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                <label className={`p-3 rounded-xl border cursor-pointer text-center transition ${
                  sharePermission === 'VIEW'
                    ? 'border-vault-600 bg-vault-50 text-vault-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}>
                  <input
                    type="radio"
                    name="permission"
                    value="VIEW"
                    checked={sharePermission === 'VIEW'}
                    onChange={() => setSharePermission('VIEW')}
                    className="sr-only"
                  />
                  <div className="text-sm">View Only</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Metadata only; no download</div>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer text-center transition ${
                  sharePermission === 'DOWNLOAD'
                    ? 'border-vault-600 bg-vault-50 text-vault-800 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}>
                  <input
                    type="radio"
                    name="permission"
                    value="DOWNLOAD"
                    checked={sharePermission === 'DOWNLOAD'}
                    onChange={() => setSharePermission('DOWNLOAD')}
                    className="sr-only"
                  />
                  <div className="text-sm">Download</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Full download permission</div>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="shareExpiry" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Expiry Date & Time (Optional)
              </label>
              <input
                id="shareExpiry"
                type="datetime-local"
                value={shareExpiry}
                onChange={(e) => setShareExpiry(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShareDoc(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingShare}
                className="px-4 py-2 text-sm font-semibold text-white bg-vault-800 hover:bg-vault-900 rounded-xl disabled:opacity-50"
              >
                {submittingShare ? 'Sharing...' : 'Confirm Share'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Upload New Version Modal */}
      {newVersionDoc && (
        <Modal
          isOpen={!!newVersionDoc}
          onClose={() => {
            setNewVersionDoc(null);
            setVersionFile(null);
          }}
          title={`Upload New Version for "${newVersionDoc.title}"`}
          description={`Current version is v${newVersionDoc.currentVersionNumber}. Uploading will create v${newVersionDoc.currentVersionNumber + 1}.`}
        >
          <form onSubmit={handleNewVersionSubmit} className="space-y-4">
            <Dropzone onFileSelect={setVersionFile} selectedFile={versionFile} />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setNewVersionDoc(null);
                  setVersionFile(null);
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingVersion || !versionFile}
                className="px-4 py-2 text-sm font-semibold text-white bg-vault-800 hover:bg-vault-900 rounded-xl disabled:opacity-50"
              >
                {submittingVersion ? 'Uploading...' : 'Upload New Version'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteDocId}
        onClose={() => setDeleteDocId(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message="Are you sure you want to delete/archive this document? Document metadata will be preserved in archived records for security audit purposes, but active access will be revoked."
        confirmText="Delete Document"
        isDestructive={true}
      />
    </div>
  );
};
