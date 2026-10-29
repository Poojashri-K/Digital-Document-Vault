import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Share2,
  Trash2,
  Upload,
  Clock,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  AlertTriangle,
  Info,
  XCircle,
  Plus,
} from 'lucide-react';
import { api, getErrorMessage } from '../api/client';
import { ApiResponse, DocumentDetail, DocumentPermissionItem, PermissionType } from '../types';
import { formatBytes, formatDate, formatRelativeDate } from '../utils/formatters';
import { StatusBadge, PermissionBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dropzone } from '../components/Dropzone';
import { useToast } from '../contexts/ToastContext';

export const DocumentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [downloadingVersion, setDownloadingVersion] = useState<number | null>(null);

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [revokePermissionTarget, setRevokePermissionTarget] = useState<DocumentPermissionItem | null>(null);

  // Share form state
  const [shareIdentifier, setShareIdentifier] = useState('');
  const [sharePermission, setSharePermission] = useState<PermissionType>('VIEW');
  const [shareExpiresAt, setShareExpiresAt] = useState('');
  const [submittingShare, setSubmittingShare] = useState(false);

  // New version form state
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [submittingVersion, setSubmittingVersion] = useState(false);

  // Deletion state
  const [deleting, setDeleting] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const fetchDocument = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get<ApiResponse<DocumentDetail>>(`/api/documents/${id}/metadata`);
      setDoc(res.data.data);
    } catch (err: unknown) {
      showError('Error Loading Document', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleCopyChecksum = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
    success('Copied to Clipboard', 'SHA-256 checksum copied.');
  };

  const handleDownload = async (versionNumber?: number, fileName?: string) => {
    if (!doc) return;
    try {
      setDownloadingVersion(versionNumber ?? (doc.versions[0]?.versionNumber || 1));
      const url = versionNumber
        ? `/api/documents/${doc.id}/download?version=${versionNumber}`
        : `/api/documents/${doc.id}/download`;

      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName || doc.versions[0]?.fileName || 'document');
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      success('Download Started', `Downloading ${fileName || doc.title}`);
    } catch (err: unknown) {
      showError('Download Failed', getErrorMessage(err));
    } finally {
      setDownloadingVersion(null);
    }
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc || !shareIdentifier.trim()) return;

    try {
      setSubmittingShare(true);
      const payload: {
        identifier: string;
        permissionType: PermissionType;
        expiresAt?: string;
      } = {
        identifier: shareIdentifier.trim(),
        permissionType: sharePermission,
      };

      if (shareExpiresAt) {
        payload.expiresAt = new Date(shareExpiresAt).toISOString();
      }

      await api.post(`/api/documents/${doc.id}/shares`, payload);
      success('Document Shared', `Successfully granted ${sharePermission} permission to ${shareIdentifier.trim()}`);
      setIsShareModalOpen(false);
      setShareIdentifier('');
      setShareExpiresAt('');
      fetchDocument();
    } catch (err: unknown) {
      showError('Share Failed', getErrorMessage(err));
    } finally {
      setSubmittingShare(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!doc || !revokePermissionTarget) return;

    try {
      setRevoking(true);
      await api.delete(`/api/documents/${doc.id}/shares/${revokePermissionTarget.id}`);
      success('Permission Revoked', `Revoked access for ${revokePermissionTarget.email || revokePermissionTarget.username}`);
      setRevokePermissionTarget(null);
      fetchDocument();
    } catch (err: unknown) {
      showError('Revocation Failed', getErrorMessage(err));
    } finally {
      setRevoking(false);
    }
  };

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc || !newVersionFile) return;

    try {
      setSubmittingVersion(true);
      const formData = new FormData();
      formData.append('file', newVersionFile);

      await api.post(`/api/documents/${doc.id}/versions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      success('Version Uploaded', 'New document version has been stored.');
      setIsNewVersionModalOpen(false);
      setNewVersionFile(null);
      fetchDocument();
    } catch (err: unknown) {
      showError('Version Upload Failed', getErrorMessage(err));
    } finally {
      setSubmittingVersion(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!doc) return;

    try {
      setDeleting(true);
      await api.delete(`/api/documents/${doc.id}`);
      success('Document Deleted', 'Document and historical records archived successfully.');
      navigate('/documents');
    } catch (err: unknown) {
      showError('Delete Failed', getErrorMessage(err));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Decrypting document metadata & access policies...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-16 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Document Not Found</h2>
        <p className="text-sm text-slate-500">
          The document could not be retrieved. You may lack permission, the share may have been revoked or expired, or the document was deleted.
        </p>
        <button
          onClick={() => navigate('/documents')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </button>
      </div>
    );
  }

  const latestVersion = doc.versions[0];
  const canDownload = doc.isOwner || doc.userPermission === 'DOWNLOAD' || doc.userPermission === 'OWNER';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{doc.title}</h1>
              <StatusBadge status={doc.status} />
              {doc.isOwner ? (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-brand-100 text-brand-800 border border-brand-200">
                  Owner
                </span>
              ) : (
                <PermissionBadge permission={doc.userPermission as PermissionType} />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span>Created {formatDate(doc.createdAt)} by <strong>{doc.ownerFullName || doc.ownerUsername}</strong></span>
              <span>•</span>
              <span>Updated {formatRelativeDate(doc.updatedAt)}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {canDownload && (
            <button
              onClick={() => handleDownload(latestVersion?.versionNumber, latestVersion?.fileName)}
              disabled={downloadingVersion !== null}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download (v{latestVersion?.versionNumber || 1})</span>
            </button>
          )}

          {doc.isOwner && (
            <>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              <button
                onClick={() => setIsNewVersionModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>New Version</span>
              </button>

              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="p-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                title="Archive / Delete Document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details and Version History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Overview Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              Document Overview
            </h2>

            {doc.description ? (
              <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 p-4 rounded-lg border border-slate-100">
                {doc.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">No description provided for this document.</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block font-medium">Latest File Name</span>
                <span className="font-semibold text-slate-800 break-all mt-0.5 block font-mono">
                  {latestVersion?.fileName || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block font-medium">Size</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {formatBytes(latestVersion?.fileSizeBytes || 0)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block font-medium">Content Type</span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                  {latestVersion?.contentType || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Version History Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-600" />
                  Version History ({doc.versions.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tamper-evident record of all revisions. Historical versions cannot be overwritten.
                </p>
              </div>

              {doc.isOwner && (
                <button
                  onClick={() => setIsNewVersionModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 p-1.5 hover:bg-brand-50 rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Upload Revision
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-4">SHA-256 Checksum</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Uploaded</th>
                    <th className="py-3 px-4 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {doc.versions.map((ver) => (
                    <tr key={ver.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono bg-brand-50 text-brand-700 border border-brand-200">
                          v{ver.versionNumber}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-900 font-medium">
                        {ver.fileName}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[120px]" title={ver.checksumSha256}>
                            {ver.checksumSha256 ? `${ver.checksumSha256.substring(0, 10)}...` : 'N/A'}
                          </span>
                          {ver.checksumSha256 && (
                            <button
                              onClick={() => handleCopyChecksum(ver.checksumSha256)}
                              className="text-slate-400 hover:text-slate-700 p-1 rounded"
                              title="Copy SHA-256 Checksum"
                            >
                              {copiedHash === ver.checksumSha256 ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {formatBytes(ver.fileSizeBytes)}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        <div>{formatDate(ver.createdAt)}</div>
                        <span className="text-[11px] text-slate-400">by {ver.uploadedByUsername}</span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {canDownload ? (
                          <button
                            onClick={() => handleDownload(ver.versionNumber, ver.fileName)}
                            disabled={downloadingVersion === ver.versionNumber}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-50"
                            title={`Download Version ${ver.versionNumber}`}
                          >
                            {downloadingVersion === ver.versionNumber ? (
                              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs italic">Restricted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar: Security Info and Sharing Management */}
        <div className="space-y-6">
          {/* Integrity & Security Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 text-sm">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Cryptographic Integrity
            </h3>
            <div className="space-y-2">
              <span className="text-xs text-slate-500 font-medium block">Latest SHA-256 Digest:</span>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700 break-all select-all flex items-center justify-between gap-2">
                <span>{latestVersion?.checksumSha256 || 'Calculating...'}</span>
                {latestVersion?.checksumSha256 && (
                  <button
                    onClick={() => handleCopyChecksum(latestVersion.checksumSha256)}
                    className="p-1 text-slate-400 hover:text-slate-700 flex-shrink-0"
                    title="Copy hash"
                  >
                    {copiedHash === latestVersion.checksumSha256 ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-500 space-y-2 pt-2 border-t border-slate-200/60">
              <p>
                ✓ Stored outside public web root with opaque UUID storage key.
              </p>
              <p>
                ✓ Binary payload inspected via Apache Tika to confirm {latestVersion?.contentType}.
              </p>
            </div>
          </div>

          {/* Access Control & Sharing List (Owner Only) */}
          {doc.isOwner ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-brand-600" />
                    Active Access Grants
                  </h3>
                  <p className="text-xs text-slate-500">Users permitted to access this document</p>
                </div>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                >
                  + Grant
                </button>
              </div>

              {doc.permissions.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  Document has not been shared with any users yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {doc.permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {perm.fullName || perm.username}
                          </span>
                          <PermissionBadge permission={perm.permissionType} />
                        </div>
                        <span className="text-slate-500 font-mono block text-[11px]">
                          {perm.email}
                        </span>

                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                          {perm.expiresAt ? (
                            <span className={perm.expired ? 'text-red-500 font-medium' : 'text-amber-600'}>
                              {perm.expired ? 'Expired' : `Expires ${formatRelativeDate(perm.expiresAt)}`}
                            </span>
                          ) : (
                            <span className="text-emerald-600">Never expires</span>
                          )}
                          <span>•</span>
                          <span>Granted {formatRelativeDate(perm.createdAt)}</span>
                        </div>

                        {!perm.active && perm.revokedAt && (
                          <span className="text-red-500 text-[10px] font-medium block">
                            Revoked on {formatDate(perm.revokedAt)}
                          </span>
                        )}
                      </div>

                      {perm.active && !perm.expired && (
                        <button
                          onClick={() => setRevokePermissionTarget(perm)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Revoke Access Immediately"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 space-y-2">
              <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-brand-600" />
                Your Access Level
              </h4>
              <p>
                You are granted <strong>{doc.userPermission}</strong> access by the document owner. Re-sharing and altering permissions is restricted to the owner.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Share Document Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Document"
        description={`Grant access to "${doc.title}"`}
      >
        <form onSubmit={handleShareSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Recipient Email or Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={shareIdentifier}
              onChange={(e) => setShareIdentifier(e.target.value)}
              placeholder="e.g. colleague@vault.local"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Recipient must have a registered vault account.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Permission Level <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-lg border cursor-pointer flex flex-col gap-1 transition-colors ${
                  sharePermission === 'VIEW'
                    ? 'border-brand-500 bg-brand-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="permission"
                    value="VIEW"
                    checked={sharePermission === 'VIEW'}
                    onChange={() => setSharePermission('VIEW')}
                    className="text-brand-600"
                  />
                  <span className="font-semibold text-sm text-slate-900">VIEW</span>
                </div>
                <span className="text-xs text-slate-500">Metadata viewing only; download disabled.</span>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer flex flex-col gap-1 transition-colors ${
                  sharePermission === 'DOWNLOAD'
                    ? 'border-brand-500 bg-brand-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="permission"
                    value="DOWNLOAD"
                    checked={sharePermission === 'DOWNLOAD'}
                    onChange={() => setSharePermission('DOWNLOAD')}
                    className="text-brand-600"
                  />
                  <span className="font-semibold text-sm text-slate-900">DOWNLOAD</span>
                </div>
                <span className="text-xs text-slate-500">Full access to download document binary files.</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Access Expiry <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={shareExpiresAt}
              onChange={(e) => setShareExpiresAt(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Leave empty for indefinite access until revoked.</p>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingShare || !shareIdentifier.trim()}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {submittingShare ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Granting...</span>
                </>
              ) : (
                <span>Grant Share Permission</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload New Version Modal */}
      <Modal
        isOpen={isNewVersionModalOpen}
        onClose={() => setIsNewVersionModalOpen(false)}
        title="Upload New Version"
        description={`Upload revision for "${doc.title}" (Current: v${doc.versions[0]?.versionNumber || 1})`}
      >
        <form onSubmit={handleUploadVersion} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Revision File <span className="text-red-500">*</span>
            </label>
            <Dropzone
              onFileSelect={(f) => setNewVersionFile(f)}
              selectedFile={newVersionFile}
              maxSizeMb={25}
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsNewVersionModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingVersion || !newVersionFile}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {submittingVersion ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Storing Revision...</span>
                </>
              ) : (
                <span>Upload New Version</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Revoke Permission Confirmation Dialog */}
      <ConfirmDialog
        isOpen={revokePermissionTarget !== null}
        onClose={() => setRevokePermissionTarget(null)}
        onConfirm={handleRevokeShare}
        title="Revoke Document Share?"
        message={`Are you sure you want to revoke access for ${
          revokePermissionTarget?.fullName || revokePermissionTarget?.username
        }? They will be immediately denied access upon revocation.`}
        confirmText="Revoke Access"
        isDestructive={true}
        loading={revoking}
      />

      {/* Delete Document Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteDocument}
        title="Archive / Delete Document?"
        message={`Are you sure you want to delete "${doc.title}"? All versions and permissions will be marked as deleted and unlinked.`}
        confirmText="Delete Document"
        isDestructive={true}
        loading={deleting}
      />
    </div>
  );
};

export default DocumentDetails;
