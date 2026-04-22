import { Bell, Moon } from 'lucide-react';
import { PreferenceToggle } from '../components/PreferenceToggle';
import type { OnboardingStepProps } from '../types';

export default function PreferencesStep({ profile, onPreferenceChange }: OnboardingStepProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PreferenceToggle
        label="Notifications"
        description="Enable reminder-ready defaults for future local nudges."
        enabled={profile.preferences.notifications}
        icon={Bell}
        onToggle={() => onPreferenceChange({ notifications: !profile.preferences.notifications })}
      />
      <PreferenceToggle
        label="Dark mode"
        description="Titan opens in a calm dark workspace by default."
        enabled={profile.preferences.darkMode}
        icon={Moon}
        onToggle={() => onPreferenceChange({ darkMode: !profile.preferences.darkMode })}
      />
    </div>
  );
}
