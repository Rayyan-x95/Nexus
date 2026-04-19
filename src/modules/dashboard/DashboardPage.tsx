import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { toDollars, useStore } from '@/core/store';
import type { Note, Task } from '@/core/store/types';
import { DashboardCard } from './DashboardCard';
import { QuickActions } from './QuickActions';

const maxTaskItems = 7;
const maxNoteItems = 5;

function toInputDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDueTodayTasks(tasks: Task[]) {
  const today = toInputDateString(new Date());

  return tasks.filter((task) => {
    if (!task.dueDate) {
      return false;
    }

    const dueDate = new Date(task.dueDate);

    if (Number.isNaN(dueDate.getTime())) {
      return false;
    }

    return toInputDateString(dueDate) === today;
  });
}

function getPendingTasks(tasks: Task[]) {
  return tasks.filter((task) => task.status === 'todo' || task.status === 'doing');
}

function getRecentNotes(notes: Note[]) {
  return [...notes].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, maxNoteItems);
}

function getContentPreview(content: string) {
  const compact = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
    .trim();

  if (!compact) {
    return 'Empty note';
  }

  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}

function getContinueItem(tasks: Task[], notes: Note[]) {
  const latestTask = [...tasks].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const latestNote = [...notes].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

  if (!latestTask && !latestNote) {
    return null;
  }

  if (!latestNote) {
    return { type: 'task' as const, title: latestTask.title, to: '/tasks' };
  }

  if (!latestTask) {
    return { type: 'note' as const, title: getContentPreview(latestNote.content), to: '/notes' };
  }

  if (latestTask.createdAt >= latestNote.createdAt) {
    return { type: 'task' as const, title: latestTask.title, to: '/tasks' };
  }

  return { type: 'note' as const, title: getContentPreview(latestNote.content), to: '/notes' };
}

export function DashboardPage() {
  const tasks = useStore((state) => state.tasks);
  const notes = useStore((state) => state.notes);
  const expenses = useStore((state) => state.expenses);

  const dueTodayTasks = useMemo(() => getDueTodayTasks(tasks), [tasks]);
  const pendingTasks = useMemo(() => getPendingTasks(tasks), [tasks]);
  const visibleTaskItems = useMemo(
    () => [...pendingTasks].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, maxTaskItems),
    [pendingTasks],
  );

  const recentNotes = useMemo(() => getRecentNotes(notes), [notes]);

  const todayExpenseSummary = useMemo(() => {
    const today = toInputDateString(new Date());
    let totalCents = 0;
    let transactions = 0;

    for (const expense of expenses) {
      const date = new Date(expense.createdAt);

      if (Number.isNaN(date.getTime())) {
        continue;
      }

      if (toInputDateString(date) !== today) {
        continue;
      }

      totalCents += expense.amount;
      transactions += 1;
    }

    return {
      totalFormatted: new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(toDollars(totalCents)),
      transactions,
    };
  }, [expenses]);

  const continueItem = useMemo(() => getContinueItem(tasks, notes), [notes, tasks]);

  return (
    <PageShell
      title="Dashboard"
      description="A focused overview of tasks, notes, and spending so you can decide your next move in seconds."
    >
      <QuickActions />

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard
          title="Today tasks"
          subtitle={`${dueTodayTasks.length} due today · ${pendingTasks.length} pending`}
          action={
            <Link to="/tasks" className="text-sm font-medium text-primary hover:underline">
              Open
            </Link>
          }
        >
          {visibleTaskItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending tasks right now.</p>
          ) : (
            <ul className="space-y-2">
              {visibleTaskItems.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-2">
                  <p className="min-w-0 truncate text-sm text-foreground">{task.title}</p>
                  <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground">
                    {task.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard
          title="Recent notes"
          subtitle={`${recentNotes.length} latest captures`}
          action={
            <Link to="/notes" className="text-sm font-medium text-primary hover:underline">
              Open
            </Link>
          }
        >
          {recentNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentNotes.map((note) => (
                <li key={note.id} className="rounded-2xl border border-border bg-background px-3 py-2">
                  <p className="text-sm text-foreground">{getContentPreview(note.content)}</p>
                  {note.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {note.tags.slice(0, 3).map((tag) => (
                        <span
                          key={`${note.id}-${tag}`}
                          className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard title="Today spend" subtitle={todayExpenseSummary.totalFormatted}>
          <p className="text-sm text-muted-foreground">
            {todayExpenseSummary.transactions} transaction{todayExpenseSummary.transactions === 1 ? '' : 's'} today.
          </p>
          <div className="mt-3">
            <Link to="/finance" className="text-sm font-medium text-primary hover:underline">
              Open finance
            </Link>
          </div>
        </DashboardCard>

        <DashboardCard title="Continue" subtitle={continueItem ? `Last ${continueItem.type}` : 'Nothing yet'}>
          {continueItem ? (
            <>
              <p className="text-sm text-foreground">{continueItem.title}</p>
              <div className="mt-3">
                <Link to={continueItem.to} className="text-sm font-medium text-primary hover:underline">
                  Continue where you left off
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Create a task or note to get started.</p>
          )}
        </DashboardCard>
      </div>
    </PageShell>
  );
}