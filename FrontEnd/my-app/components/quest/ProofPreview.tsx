'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  type ProofType,
  formatFileSize,
  isImageFile,
  isVideoFile,
  isPdfFile,
} from '@/lib/validation/submission';

interface ProofPreviewProps {
  proofType: ProofType;
  link?: string;
  text?: string;
  file?: File | null;
  additionalNotes?: string;
}

export function ProofPreview({
  proofType,
  link,
  text,
  file,
  additionalNotes,
}: ProofPreviewProps) {
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }

    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [file]);

  const proofTypeLabel = useMemo(() => {
    switch (proofType) {
      case 'link':
        return 'Link';
      case 'file':
        return 'File Upload';
      case 'text':
        return 'Text Description';
      default:
        return 'Unknown';
    }
  }, [proofType]);

  const proofTypeIcon = useMemo(() => {
    switch (proofType) {
      case 'link':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      case 'file':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'text':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        );
      default:
        return null;
    }
  }, [proofType]);

  const getFileIcon = () => {
    if (!file) return null;

    if (isVideoFile(file)) {
      return (
        <svg className="h-12 w-12 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }

    if (isPdfFile(file)) {
      return (
        <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }

    return (
      <svg className="h-12 w-12 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
        <span className="text-[#089ec3]">{proofTypeIcon}</span>
        <span>Proof Type: {proofTypeLabel}</span>
      </div>

      <div className="space-y-3">
        {proofType === 'link' && link && (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
              Submitted Link
            </p>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 break-all text-[#089ec3] hover:underline"
            >
              {link}
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        {proofType === 'text' && text && (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
              Proof Description
            </p>
            <div className="rounded-md bg-white p-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              <p className="whitespace-pre-wrap">{text}</p>
            </div>
          </div>
        )}

        {proofType === 'file' && file && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
              Uploaded File
            </p>
            <div className="flex items-center gap-4 rounded-md bg-white p-3 dark:bg-zinc-900">
              {filePreviewUrl ? (
                <img
                  src={filePreviewUrl}
                  alt="File preview"
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  {getFileIcon()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                  {file.name}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {formatFileSize(file.size)}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  {file.type || 'Unknown type'}
                </p>
              </div>
            </div>
          </div>
        )}

        {additionalNotes && (
          <div className="space-y-1 border-t border-zinc-200 pt-3 dark:border-zinc-700">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
              Additional Notes
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{additionalNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProofPreviewCompactProps {
  proofType: ProofType;
  link?: string;
  text?: string;
  file?: File | null;
}

export function ProofPreviewCompact({ proofType, link, text, file }: ProofPreviewCompactProps) {
  const getPreviewText = () => {
    switch (proofType) {
      case 'link':
        return link ? link.substring(0, 50) + (link.length > 50 ? '...' : '') : 'No link';
      case 'text':
        return text ? text.substring(0, 50) + (text.length > 50 ? '...' : '') : 'No text';
      case 'file':
        return file ? file.name : 'No file';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="capitalize">{proofType}:</span>
      <span className="truncate">{getPreviewText()}</span>
    </div>
  );
}
