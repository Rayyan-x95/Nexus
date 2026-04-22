import { UserRound } from 'lucide-react';
import type { OnboardingStepProps } from '../types';

export default function NameStep({ profile, onProfileChange }: OnboardingStepProps) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <UserRound className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
      <input
        autoFocus
        value={profile.name}
        onChange={(event) => onProfileChange({ name: event.target.value })}
        placeholder="Your name"
        className="mt-8 w-full bg-transparent text-center text-5xl font-black tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30 sm:text-7xl"
        autoComplete="name"
        aria-label="Your name"
      />
      <div className="mx-auto mt-5 h-px max-w-sm bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
