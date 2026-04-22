import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PreferenceToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  icon: ComponentType<LucideProps>;
  onToggle: () => void;
}

export function PreferenceToggle({
  label,
  description,
  enabled,
  icon: Icon,
  onToggle,
}: PreferenceToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={onToggle}
      className="group flex w-full items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/45 p-4 text-left transition-all hover:border-primary/40 hover:bg-secondary/40"
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-foreground">{label}</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
        </span>
      </div>
      <span
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full border transition-colors',
          enabled ? 'border-primary bg-primary' : 'border-border bg-secondary',
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            enabled ? 'translate-x-5' : 'translate-x-1',
          )}
        />
      </span>
    </button>
  );
}
