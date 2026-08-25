'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  type ProofType,
  formatFileSize,
  isImageFile,
  isVideoFile,
  isPdfFile,
} from '@/lib/validation/submission';
import OptimizedImage from '@/components/ui/OptimizedImage';

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
    if (!file || !isImageFile(file)) {
      setFilePreviewUrl(null);
      return;
    }
    // Fix #2226: use createObjectURL and always revoke on cleanup
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const proofTypeLabel = useMemo(() => {
    switch (proofType) {
      case 'link': return 'Link';
      case 'file': return 'File Upload';
      case 'text': return 'Text Description';
      default: return 'Unknown';
    }
  }, [proofType]);

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
        <span>Proof Type: {proofTypeLabel}</span>
      </div>
      <div className="space-y-3">
        {proofType === 'link' && link && (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Submitted Link</p>
            <a href={link} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">
              {link}
            </a>
          </div>
        )}
        {proofType === 'text' && text && (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Proof Description</p>
            <div className="rounded-md bg-white p-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              <p className="whitespace-pre-wrap">{text}</p>
            </div>
          </div>
        )}
        {proofType === 'file' && file && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Uploaded File</p>
            <div className="flex items-center gap-4 rounded-md bg-white p-3 dark:bg-zinc-900">
              {filePreviewUrl ? (
                <OptimizedImage src={filePreviewUrl} alt="File preview" width={80} height={80} unoptimized className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  {isVideoFile(file) ? '🎥' : isPdfFile(file) ? '📄' : '📎'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{file.name}</p>
                <p className="text-sm text-zinc-500">{formatFileSize(file.size)}</p>
              </div>
            </div>
          </div>
        )}
        {additionalNotes && (
          <div className="space-y-1 border-t border-zinc-200 pt-3 dark:border-zinc-700">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Additional Notes</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{additionalNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}