interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

export function canPromptInstall() {
  return deferredInstallPrompt !== null;
}

export async function promptInstall() {
  if (!deferredInstallPrompt) {
    return false;
  }

  await deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;

  window.dispatchEvent(new CustomEvent('titan:pwa-install-availability', { detail: false }));

  return choice.outcome === 'accepted';
}

export function registerPWA() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('titan:pwa-install-availability', { detail: true }));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('titan:pwa-install-availability', { detail: false }));
  });
}
