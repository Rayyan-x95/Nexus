import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface OnboardingStepperProps {
  currentStep: number;
  totalSteps: number;
  onSkip: () => void;
  disabled?: boolean;
}

export function OnboardingStepper({ currentStep, totalSteps, onSkip, disabled }: OnboardingStepperProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <header className="flex items-center gap-4">
      <button
        type="button"
        onClick={onSkip}
        disabled={disabled}
        className="h-10 rounded-lg px-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        Skip
      </button>

      <div className="min-w-0 flex-1">
        <div className="h-1 overflow-hidden rounded-full bg-secondary/80">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary via-sky-300 to-emerald-300"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.38, ease: [0.22, 0.61, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="flex w-[4.5rem] justify-end gap-1.5" aria-label={`Step ${currentStep + 1} of ${totalSteps}`}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              index === currentStep ? 'w-4 bg-foreground' : index < currentStep ? 'w-1.5 bg-primary' : 'w-1.5 bg-border',
            )}
          />
        ))}
      </div>
    </header>
  );
}
