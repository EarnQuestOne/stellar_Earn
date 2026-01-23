'use client';

import { useState, useCallback } from 'react';
import {
  createSubmission,
  uploadProofFile,
  type CreateSubmissionData,
  type CreateSubmissionResponse,
} from '../api/submissions';
import {
  validateSubmissionForm,
  sanitizeSubmissionData,
  type SubmissionFormData,
  type ValidationError,
} from '../validation/submission';

export type SubmissionStep = 'type' | 'proof' | 'preview' | 'submitting' | 'success' | 'error';

interface UseSubmissionOptions {
  questId: string;
  questTitle: string;
  onSuccess?: (response: CreateSubmissionResponse) => void;
  onError?: (error: Error) => void;
}

interface UseSubmissionReturn {
  // Form state
  formData: SubmissionFormData;
  setFormData: React.Dispatch<React.SetStateAction<SubmissionFormData>>;
  updateField: <K extends keyof SubmissionFormData>(
    field: K,
    value: SubmissionFormData[K]
  ) => void;

  // Step management
  currentStep: SubmissionStep;
  setCurrentStep: (step: SubmissionStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canGoNext: boolean;
  canGoBack: boolean;

  // Validation
  errors: ValidationError[];
  validateCurrentStep: () => boolean;
  getFieldError: (field: string) => string | undefined;

  // Submission
  isSubmitting: boolean;
  submitProgress: number;
  submit: () => Promise<void>;
  submissionResponse: CreateSubmissionResponse | null;
  submissionError: Error | null;

  // Reset
  reset: () => void;

  // Wallet check
  isWalletConnected: boolean;
}

const initialFormData: SubmissionFormData = {
  questId: '',
  proofType: 'link',
  link: '',
  text: '',
  file: null,
  additionalNotes: '',
};

const stepOrder: SubmissionStep[] = ['type', 'proof', 'preview', 'submitting', 'success'];

export function useSubmission({
  questId,
  questTitle,
  onSuccess,
  onError,
}: UseSubmissionOptions): UseSubmissionReturn {
  const [formData, setFormData] = useState<SubmissionFormData>({
    ...initialFormData,
    questId,
  });
  const [currentStep, setCurrentStep] = useState<SubmissionStep>('type');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submissionResponse, setSubmissionResponse] = useState<CreateSubmissionResponse | null>(
    null
  );
  const [submissionError, setSubmissionError] = useState<Error | null>(null);

  // Check if wallet is connected (simplified - in real app would use wallet context)
  const isWalletConnected = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return !!(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
  }, []);

  const updateField = useCallback(
    <K extends keyof SubmissionFormData>(field: K, value: SubmissionFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear errors for the field being updated
      setErrors((prev) => prev.filter((e) => e.field !== field));
    },
    []
  );

  const getFieldError = useCallback(
    (field: string): string | undefined => {
      return errors.find((e) => e.field === field)?.message;
    },
    [errors]
  );

  const validateCurrentStep = useCallback((): boolean => {
    if (currentStep === 'type') {
      // Just need a proof type selected
      if (!formData.proofType) {
        setErrors([{ field: 'proofType', message: 'Please select a proof type' }]);
        return false;
      }
      setErrors([]);
      return true;
    }

    if (currentStep === 'proof') {
      // Validate the proof based on type
      const result = validateSubmissionForm(formData);
      setErrors(result.errors);
      return result.isValid;
    }

    if (currentStep === 'preview') {
      // Full validation before submission
      const result = validateSubmissionForm(formData);
      setErrors(result.errors);
      return result.isValid;
    }

    return true;
  }, [currentStep, formData]);

  const canGoNext = useCallback((): boolean => {
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex >= stepOrder.indexOf('preview')) {
      return false;
    }

    if (currentStep === 'type') {
      return !!formData.proofType;
    }

    if (currentStep === 'proof') {
      if (formData.proofType === 'link') return !!formData.link;
      if (formData.proofType === 'text') return !!formData.text;
      if (formData.proofType === 'file') return !!formData.file;
    }

    return true;
  }, [currentStep, formData]);

  const canGoBack = useCallback((): boolean => {
    const currentIndex = stepOrder.indexOf(currentStep);
    return currentIndex > 0 && currentStep !== 'submitting' && currentStep !== 'success';
  }, [currentStep]);

  const goToNextStep = useCallback(() => {
    if (!validateCurrentStep()) return;

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.indexOf('preview')) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  }, [currentStep, validateCurrentStep]);

  const goToPreviousStep = useCallback(() => {
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  }, [currentStep]);

  const submit = useCallback(async () => {
    if (!validateCurrentStep()) return;

    if (!isWalletConnected()) {
      setSubmissionError(new Error('Please connect your wallet to submit'));
      setCurrentStep('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(0);
    setCurrentStep('submitting');
    setSubmissionError(null);

    try {
      const sanitizedData = sanitizeSubmissionData(formData);

      // Build the submission data
      const submissionData: CreateSubmissionData = {
        questId: sanitizedData.questId,
        proofType: sanitizedData.proofType,
        proof: {
          type: sanitizedData.proofType,
          link: sanitizedData.link,
          text: sanitizedData.text,
        },
        additionalNotes: sanitizedData.additionalNotes,
      };

      setSubmitProgress(30);

      // Handle file upload separately if needed
      if (sanitizedData.proofType === 'file' && sanitizedData.file) {
        // For large files, upload separately
        if (sanitizedData.file.size > 5 * 1024 * 1024) {
          const uploadResult = await uploadProofFile(
            sanitizedData.questId,
            sanitizedData.file,
            (progress) => setSubmitProgress(30 + progress * 0.5)
          );
          submissionData.proof.link = uploadResult.fileUrl;
        }
        setSubmitProgress(80);
      }

      setSubmitProgress(90);

      const response = await createSubmission(submissionData, sanitizedData.file);

      setSubmitProgress(100);
      setSubmissionResponse(response);
      setCurrentStep('success');
      onSuccess?.(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Submission failed');
      setSubmissionError(err);
      setCurrentStep('error');
      onError?.(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateCurrentStep, isWalletConnected, onSuccess, onError]);

  const reset = useCallback(() => {
    setFormData({ ...initialFormData, questId });
    setCurrentStep('type');
    setErrors([]);
    setIsSubmitting(false);
    setSubmitProgress(0);
    setSubmissionResponse(null);
    setSubmissionError(null);
  }, [questId]);

  return {
    formData,
    setFormData,
    updateField,
    currentStep,
    setCurrentStep,
    goToNextStep,
    goToPreviousStep,
    canGoNext: canGoNext(),
    canGoBack: canGoBack(),
    errors,
    validateCurrentStep,
    getFieldError,
    isSubmitting,
    submitProgress,
    submit,
    submissionResponse,
    submissionError,
    reset,
    isWalletConnected: isWalletConnected(),
  };
}
