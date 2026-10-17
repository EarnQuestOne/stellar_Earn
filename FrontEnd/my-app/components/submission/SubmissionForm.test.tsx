import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubmissionForm } from './SubmissionForm';

const mockState = vi.hoisted(() => ({
  initialStep: 'type',
  canGoNext: true,
  errorMessage: null as string | null,
}));

const fixtureResponse = vi.hoisted(() => ({
  id: 'sub-123',
  questId: 'quest-1',
  userId: 'user-1',
  status: 'Pending',
  proof: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}));

vi.mock('@/lib/hooks/useSubmission', async () => {
  const { useState } = await import('react');

  const stepOrder = ['type', 'proof', 'preview'];

  return {
    useSubmission: (options: {
      questId: string;
      onSuccess?: (response: typeof fixtureResponse) => void;
    }) => {
      const [currentStep, setCurrentStep] = useState<string>(
        mockState.initialStep
      );
      const [formData, setFormData] = useState({
        questId: options.questId,
        proofType: 'link' as 'link' | 'text' | 'file',
        link: '',
        text: '',
        file: null as File | null,
        additionalNotes: '',
      });

      return {
        formData,
        setFormData,
        updateField: (field: string, value: unknown) =>
          setFormData((prev) => ({ ...prev, [field]: value })),
        currentStep,
        setCurrentStep,
        goToNextStep: () => {
          if (currentStep === 'preview') {
            setCurrentStep('success');
            return;
          }
          const idx = stepOrder.indexOf(currentStep);
          if (idx !== -1 && idx < stepOrder.length - 1) {
            setCurrentStep(stepOrder[idx + 1]);
          }
        },
        goToPreviousStep: () => {
          const idx = stepOrder.indexOf(currentStep);
          if (idx > 0) setCurrentStep(stepOrder[idx - 1]);
        },
        canGoNext: mockState.canGoNext,
        canGoBack: currentStep !== 'type',
        errors: [],
        validateCurrentStep: () => true,
        getFieldError: () => undefined,
        isSubmitting: false,
        submitProgress: 0,
        submit: async () => {
          setCurrentStep('submitting');
          options.onSuccess?.(fixtureResponse);
          setCurrentStep('success');
        },
        submissionResponse: currentStep === 'success' ? fixtureResponse : null,
        submissionError:
          mockState.errorMessage !== null
            ? new Error(mockState.errorMessage)
            : null,
        reset: () => setCurrentStep('type'),
        isWalletConnected: false,
      };
    },
  };
});

describe('SubmissionForm (consolidated component)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.initialStep = 'type';
    mockState.canGoNext = true;
    mockState.errorMessage = null;
  });

  describe('availability states (shared by quest detail and modal use cases)', () => {
    it('renders the expired message instead of the wizard', () => {
      render(<SubmissionForm questId="q1" questTitle="Quest One" isExpired />);

      expect(
        screen.getByText(
          'This quest has expired and is no longer accepting submissions.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByText('Submit Proof')).not.toBeInTheDocument();
    });

    it('renders the full message instead of the wizard', () => {
      render(<SubmissionForm questId="q1" questTitle="Quest One" isFull />);

      expect(
        screen.getByText(
          'This quest has reached its maximum number of participants.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByText('Submit Proof')).not.toBeInTheDocument();
    });
  });

  describe('quest-detail use case (formerly components/quest/SubmissionForm)', () => {
    it('walks through type → proof → review → submit and fires onSubmit/onSuccess', async () => {
      const onSubmit = vi.fn();
      const onSuccess = vi.fn();

      render(
        <SubmissionForm
          questId="quest-1"
          questTitle="Complete a Smart Contract Tutorial"
          onSubmit={onSubmit}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText('Submit Proof')).toBeInTheDocument();
      expect(
        screen.getByText(/Complete a Smart Contract Tutorial/)
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

      expect(screen.getByText('Enter Proof URL')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/Proof URL/), {
        target: { value: 'https://github.com/you/proof' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Review' }));

      expect(screen.getByText('Review & Submit')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Submit Proof' }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalledWith(fixtureResponse);
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        questId: 'quest-1',
        proofType: 'link',
        proof: null,
        link: 'https://github.com/you/proof',
        text: undefined,
        notes: '',
      });

      expect(screen.getByText('Proof Submitted!')).toBeInTheDocument();
      expect(screen.getByText('Submission ID: sub-123')).toBeInTheDocument();
    });

    it('allows submitting again after reset without duplicating callbacks', async () => {
      const onSubmit = vi.fn();

      const { rerender } = render(
        <SubmissionForm
          questId="quest-1"
          questTitle="Quest One"
          onSubmit={onSubmit}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      fireEvent.change(screen.getByLabelText(/Proof URL/), {
        target: { value: 'https://example.com/a' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Review' }));
      fireEvent.click(screen.getByRole('button', { name: 'Submit Proof' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

      fireEvent.click(
        screen.getByRole('button', { name: 'Submit another proof' })
      );
      expect(screen.getByText('Submit Proof')).toBeInTheDocument();

      rerender(
        <SubmissionForm
          questId="quest-1"
          questTitle="Quest One"
          onSubmit={onSubmit}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
      fireEvent.change(screen.getByLabelText(/Proof URL/), {
        target: { value: 'https://example.com/b' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Review' }));
      fireEvent.click(screen.getByRole('button', { name: 'Submit Proof' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
      expect(onSubmit).toHaveBeenLastCalledWith(
        expect.objectContaining({ link: 'https://example.com/b' })
      );
    });
  });

  describe('modal use case (formerly used by app/[locale]/submissions page)', () => {
    it('renders a Cancel button that invokes onClose', () => {
      const onClose = vi.fn();

      render(
        <SubmissionForm questId="q1" questTitle="Quest One" onClose={onClose} />
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Cancel submission' })
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not render a Cancel button when onClose is not provided', () => {
      render(<SubmissionForm questId="q1" questTitle="Quest One" />);

      expect(
        screen.queryByRole('button', { name: 'Cancel submission' })
      ).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows the submission error with a retry action', async () => {
      mockState.initialStep = 'error';
      mockState.errorMessage = 'Please connect your wallet to submit';

      render(<SubmissionForm questId="q1" questTitle="Quest One" />);

      expect(screen.getByText('Submission Failed')).toBeInTheDocument();
      expect(
        screen.getByText('Please connect your wallet to submit')
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

      await waitFor(() => {
        expect(screen.getByText('Submit Proof')).toBeInTheDocument();
      });
    });
  });

  describe('validation gating', () => {
    it('disables Continue when the current step is incomplete', () => {
      mockState.canGoNext = false;

      render(<SubmissionForm questId="q1" questTitle="Quest One" />);

      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });
  });
});
