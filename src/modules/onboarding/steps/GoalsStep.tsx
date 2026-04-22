import { Check, LineChart, ListChecks, ReceiptText, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import type { FinancialGoal } from '@/core/store';
import { cn } from '@/utils/cn';
import { goalOptions } from '../onboardingFlow';
import type { OnboardingStepProps } from '../types';

const goalIcons: Record<FinancialGoal, typeof LineChart> = {
  'save-money': LineChart,
  'track-spending': ReceiptText,
  'improve-productivity': ListChecks,
  'reduce-expenses': TrendingDown,
};

export default function GoalsStep({ profile, onGoalToggle }: OnboardingStepProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="grid gap-3 sm:grid-cols-2">
        {goalOptions.map((goal) => {
          const selected = profile.goals.includes(goal.id);
          const Icon = goalIcons[goal.id];

          return (
            <motion.button
              key={goal.id}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onGoalToggle(goal.id)}
              aria-pressed={selected}
              className={cn(
                'min-h-32 rounded-lg border p-5 text-left transition-all',
                selected
                  ? 'border-primary bg-primary/12 shadow-glow'
                  : 'border-border/60 bg-background/45 hover:border-primary/40 hover:bg-secondary/40',
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="text-lg font-black tracking-tight text-foreground">{goal.label}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{goal.description}</p>
                </div>
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all',
                    selected ? 'border-primary bg-primary text-white' : 'border-border text-transparent',
                  )}
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
