import { CalendarDays } from 'lucide-react';
import type { OnboardingStepProps } from '../types';
import { formatDob } from '../onboardingFlow';

export default function DobStep({ profile, onProfileChange }: OnboardingStepProps) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <CalendarDays className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
      <label className="mt-8 block rounded-lg border border-border/60 bg-background/55 p-4 transition-colors focus-within:border-primary">
        <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
          Date of birth
        </span>
        <input
          type="date"
          value={profile.dob ?? ''}
          max={new Date().toISOString().split('T')[0]}
          onChange={(event) => onProfileChange({ dob: event.target.value })}
          className="mt-3 w-full bg-transparent text-center text-3xl font-black tracking-tight text-foreground outline-none sm:text-5xl"
          aria-label="Date of birth"
        />
      </label>
      <p className="mt-4 text-sm text-muted-foreground">{formatDob(profile.dob)}</p>
    </div>
  );
}
