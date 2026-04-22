import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/app/Layout';
import { useStore } from '@/core/store';

const DashboardPage = lazy(() =>
  import('@/modules/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const TasksPage = lazy(() =>
  import('@/modules/tasks/TasksPage').then((module) => ({ default: module.TasksPage })),
);
const NotesPage = lazy(() =>
  import('@/modules/notes/NotesPage').then((module) => ({ default: module.NotesPage })),
);
const FinancePage = lazy(() =>
  import('@/modules/finance/FinancePage').then((module) => ({ default: module.FinancePage })),
);
const SettingsPage = lazy(() =>
  import('@/modules/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);
const ShareTargetPage = lazy(() =>
  import('@/modules/share/ShareTargetPage').then((module) => ({ default: module.ShareTargetPage })),
);
const OnboardingPage = lazy(() =>
  import('@/modules/onboarding/OnboardingPage').then((module) => ({ default: module.OnboardingPage })),
);

function OnboardingGate() {
  const onboarding = useStore((state) => state.onboarding);
  const hasResolvedOnboarding = Boolean(onboarding.completedAt || onboarding.skippedAt);

  if (!hasResolvedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Layout />;
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <Routes>
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route element={<OnboardingGate />}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="share" element={<ShareTargetPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
