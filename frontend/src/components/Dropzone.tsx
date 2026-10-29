import React, { useRef, useState } from 'react';
import { UploadCloud, File, AlertCircle, X, Check } from 'lucide-react';
import { formatBytes } from '../utils/formatters';

interface DropzoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  error?: string | null;
  maxSizeMb?: number;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx', '.txt', '.csv'];

export const Dropzone: React.FC<DropzoneProps> = ({
  onFileSelect,
  selectedFile,
  error: parentError,
  maxSizeMb = 25,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSet = (file: File) => {
    setLocalError(null);

    // Size check
    if (file.size > maxSizeMb * 1024 * 1024) {
      setLocalError(`File size exceeds maximum allowed ${maxSizeMb} MB limit.`);
      return;
    }

    // Extension check
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setLocalError(`File extension '${extension}' is not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSet(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSet(e.target.files[0]);
    }
  };

  const displayError = parentError || localError;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
        accept={ALLOWED_EXTENSIONS.join(',')}
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragOver
              ? 'border-vault-500 bg-vault-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-vault-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              inputRef.current?.click();
            }
          }}
          aria-label="Upload document file dropzone"
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-vault-100 text-vault-700 flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-700">
            <span className="text-vault-600 font-semibold underline">Click to select</span> or drag & drop document
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Allowed: PDF, DOCX, XLSX, PNG, JPG, TXT, CSV (up to {maxSizeMb} MB)
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 bg-vault-50/70 border border-vault-200 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-vault-600 text-white rounded-lg">
              <File className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{selectedFile.name}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{formatBytes(selectedFile.size)}</span>
                <span>•</span>
                <span className="flex items-center text-emerald-600 font-medium gap-0.5">
                  <Check className="w-3.5 h-3.5" /> Ready for upload
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition"
            aria-label="Remove selected file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {displayError && (
        <p className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{displayError}</span>
        </p>
      )}
    </div>
  );
};
