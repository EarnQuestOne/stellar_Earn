"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultOnboardingState,
  getOnboardingState,
  onboardingSteps,
  setOnboardingState,
  type OnboardingState,
} from "@/lib/utils/onboarding";

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(() => getOnboardingState());
  const [isReady] = useState(true);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    setOnboardingState(state);
  }, [state, isReady]);

  const currentStep = useMemo(
    () => onboardingSteps[state.currentStepIndex] ?? null,
    [state.currentStepIndex],
  );

  const progress = useMemo(() => {
    if (onboardingSteps.length === 0) {
      return 0;
    }

    return Math.round((state.completedStepIds.length / onboardingSteps.length) * 100);
  }, [state.completedStepIds.length]);

  const start = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasStarted: true,
      skipped: false,
      completed: false,
      currentStepIndex: 0,
    }));
  }, []);

  const setTutorialMode = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      tutorialMode: enabled,
    }));
  }, []);

  const markCurrentStepComplete = useCallback(() => {
    setState((prev) => {
      const step = onboardingSteps[prev.currentStepIndex];

      if (!step) {
        return prev;
      }

      if (prev.completedStepIds.includes(step.id)) {
        return prev;
      }

      return {
        ...prev,
        completedStepIds: [...prev.completedStepIds, step.id],
      };
    });
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      const step = onboardingSteps[prev.currentStepIndex];
      const completedStepIds = step && !prev.completedStepIds.includes(step.id)
        ? [...prev.completedStepIds, step.id]
        : prev.completedStepIds;

      const nextIndex = prev.currentStepIndex + 1;
      const isLast = nextIndex >= onboardingSteps.length;

      if (isLast) {
        return {
          ...prev,
          completed: true,
          hasStarted: false,
          currentStepIndex: onboardingSteps.length - 1,
          completedStepIds,
        };
      }

      return {
        ...prev,
        currentStepIndex: nextIndex,
        completedStepIds,
      };
    });
  }, []);

  const previousStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
    }));
  }, []);

  const skip = useCallback(() => {
    setState((prev) => ({
      ...prev,
      skipped: true,
      hasStarted: false,
    }));
  }, []);

  const complete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      completed: true,
      skipped: false,
      hasStarted: false,
      completedStepIds: onboardingSteps.map((step) => step.id),
      currentStepIndex: onboardingSteps.length - 1,
    }));
  }, []);

  const restart = useCallback(() => {
    setState((prev) => ({
      ...defaultOnboardingState,
      tutorialMode: prev.tutorialMode,
      hasStarted: true,
    }));
  }, []);

  return {
    onboardingSteps,
    currentStep,
    currentStepIndex: state.currentStepIndex,
    progress,
    state,
    isReady,
    start,
    nextStep,
    previousStep,
    skip,
    complete,
    restart,
    setTutorialMode,
    markCurrentStepComplete,
  };
}
