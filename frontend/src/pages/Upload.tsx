import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle2, AlertCircle, ArrowLeft, Info } from 'lucide-react';
import { api, getErrorMessage } from '../api/client';
import { Dropzone } from '../components/Dropzone';
import { useToast } from '../contexts/ToastContext';
import { ApiResponse, DocumentSummary } from '../types';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg(null);
    if (!title.trim()) {
      // Clean up filename as default title (strip extension)
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(baseName.replace(/[_-]+/g, ' '));
    }
  };

  const handleFileRemove = () => {
    setFile(null);
  };

  // Button disabled state: required fields are file and title, and not currently submitting
  const canSubmit = !loading && Boolean(file) && title.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please enter a document title.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      await api.post<ApiResponse<DocumentSummary>>('/api/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      success('Document Uploaded', 'Document was encrypted and stored successfully.');
      // Navigate to My Documents to display the refreshed document repository list
      navigate('/documents');
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setErrorMsg(msg);
      showError('Upload Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top breadcrumb navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/documents')}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          title="Back to Documents"
          type="button"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Document</h1>
          <p className="text-sm text-slate-500">
            Upload files securely. Binary magic bytes and extensions will be strictly verified.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6"
            noValidate={false}
          >
            {errorMsg && (
              <div
                className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm animate-fade-in"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-rose-900">Upload Rejected</p>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Document File <span className="text-rose-500">*</span>
              </label>
              <Dropzone
                onFileSelect={(f) => (f ? handleFileSelect(f) : handleFileRemove())}
                selectedFile={file}
                maxSizeMb={25}
              />
            </div>

            <div>
              <label htmlFor="doc-title" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Document Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="doc-title"
                type="text"
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 Compliance & Audit Report"
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-vault-500 focus:border-vault-500 text-sm transition-colors"
              />
            </div>

            <div>
              <label htmlFor="doc-desc" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="doc-desc"
                rows={3}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a concise description of the document purpose, version or background..."
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-vault-500 focus:border-vault-500 text-sm transition-colors"
              />
            </div>

            {/* Actions Bar */}
            <div className="pt-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/documents')}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-center"
              >
                Cancel
              </button>

              <button
                type="submit"
                id="upload-submit-btn"
                disabled={!canSubmit}
                className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-vault-500 focus:ring-offset-2 ${
                  canSubmit
                    ? 'bg-vault-800 hover:bg-vault-900 active:bg-vault-950 text-white cursor-pointer shadow-vault-900/10 hover:shadow-md'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Uploading Document...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 flex-shrink-0" />
                    <span>Upload Document</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security & Validation details card */}
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-vault-600 flex-shrink-0" />
              Upload Security Controls
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Magic-Byte Inspection:</strong> Apache Tika deep content inspection detects true MIME types, preventing renamed executables (`.exe`, `.sh`, `.bat`).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Opaque Storage Identifier:</strong> Files are stored with cryptographically generated UUIDs outside the web root. Path traversal characters (`../`, `..\`) are stripped.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Integrity Verification:</strong> Files are hashed via SHA-256 upon arrival to guarantee tamper-evident versioning.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Size Limitation:</strong> Enforces maximum 25 MB file size limit per upload.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 text-sm space-y-3">
            <h4 className="font-semibold text-slate-900">Supported Document Formats</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <span className="font-semibold text-red-600">PDF</span>
                <span className="text-slate-500 font-mono text-[11px]">.pdf</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <span className="font-semibold text-blue-600">Word</span>
                <span className="text-slate-500 font-mono text-[11px]">.docx</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <span className="font-semibold text-emerald-600">Excel</span>
                <span className="text-slate-500 font-mono text-[11px]">.xlsx, .csv</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <span className="font-semibold text-amber-600">PowerPoint</span>
                <span className="text-slate-500 font-mono text-[11px]">.pptx</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <span className="font-semibold text-purple-600">Image</span>
                <span className="text-slate-500 font-mono text-[11px]">.png, .jpg</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <span className="font-semibold text-slate-700">Text</span>
                <span className="text-slate-500 font-mono text-[11px]">.txt</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
