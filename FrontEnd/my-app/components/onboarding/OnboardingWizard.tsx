"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OnboardingStep } from "@/components/onboarding/OnboardingStep";
import { TourTooltip } from "@/components/onboarding/TourTooltip";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { useOnboarding } from "@/lib/hooks/useOnboarding";

interface OnboardingWizardProps {
  forceOpen?: boolean;
}

export function OnboardingWizard({ forceOpen = false }: OnboardingWizardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRoutedStepIndexRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const {
    onboardingSteps,
    currentStep,
    currentStepIndex,
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
  } = useOnboarding();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isReady || !currentStep || !state.hasStarted) {
      return;
    }

    if (lastRoutedStepIndexRef.current === currentStepIndex) {
      return;
    }

    if (currentStep.route && pathname !== currentStep.route) {
      router.push(currentStep.route);
    }

    lastRoutedStepIndexRef.current = currentStepIndex;
  }, [
    currentStep,
    currentStepIndex,
    isReady,
    pathname,
    router,
    state.hasStarted,
  ]);

  useEffect(() => {
    if (!forceOpen || !isReady) {
      return;
    }

    restart();
  }, [forceOpen, isReady, restart]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (searchParams.get("onboarding") === "restart") {
      lastRoutedStepIndexRef.current = null;
      restart();
      router.replace(pathname);
    }
  }, [isReady, pathname, restart, router, searchParams]);

  if (!mounted || !isReady) {
    return null;
  }

  const shouldShowWelcome =
    !state.hasStarted && !state.completed && !state.skipped && !forceOpen;
  const shouldShowWizard = state.hasStarted && currentStep;

  return (
    <>
      <WelcomeModal
        isOpen={shouldShowWelcome}
        tutorialMode={state.tutorialMode}
        onTutorialModeChange={setTutorialMode}
        onStart={start}
        onSkip={skip}
      />

      {shouldShowWizard && currentStep ? (
        <>
          {state.tutorialMode && currentStep.targetSelector ? (
            <TourTooltip
              targetSelector={currentStep.targetSelector}
              title={currentStep.title}
              description={currentStep.description}
              placement={currentStep.placement}
            />
          ) : null}

          <div className="pointer-events-none fixed bottom-5 right-5 z-[60] w-full max-w-md px-4">
            <div className="pointer-events-auto">
              <OnboardingStep
                title={currentStep.title}
                description={currentStep.description}
                currentStep={currentStepIndex + 1}
                totalSteps={onboardingSteps.length}
                progress={progress}
                isFirstStep={currentStepIndex === 0}
                isLastStep={currentStepIndex === onboardingSteps.length - 1}
                onPrevious={previousStep}
                onNext={nextStep}
                onSkip={skip}
                onComplete={complete}
              />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
