import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { OnboardingStepId } from '../onboardingFlow';

interface OnboardingControlsProps {
  stepId: OnboardingStepId;
  canGoBack: boolean;
  isSaving: boolean;
  onBack: () => void;
  onNext: () => void;
  onComplete: () => void;
}

export function OnboardingControls({
  stepId,
  canGoBack,
  isSaving,
  onBack,
  onNext,
  onComplete,
}: OnboardingControlsProps) {
  const isReady = stepId === 'ready';

  return (
    <footer className="flex items-center justify-between gap-3">
      <Button type="button" variant="ghost" disabled={!canGoBack || isSaving} onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Button
        type="button"
        disabled={isSaving}
        onClick={isReady ? onComplete : onNext}
        className="px-7 shadow-glow"
      >
        {isReady ? (isSaving ? 'Setting up...' : 'Enter Titan') : stepId === 'welcome' ? 'Start' : 'Next'}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </footer>
  );
}
