import type { Task, TaskRecurrence } from '@/core/store/types';

export function calculateNextOccurrence(
  baseDate: string,
  recurrence: { type: 'daily' | 'weekly' | 'monthly'; interval: number },
): string {
  const date = new Date(baseDate);
  if (!Number.isFinite(date.getTime())) return baseDate;

  if (recurrence.type === 'daily') date.setDate(date.getDate() + recurrence.interval);
  else if (recurrence.type === 'weekly') date.setDate(date.getDate() + recurrence.interval * 7);
  else if (recurrence.type === 'monthly') date.setMonth(date.getMonth() + recurrence.interval);

  return date.toISOString();
}

export function normalizeRecurrence(value: unknown): TaskRecurrence | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const candidate = value as Record<string, unknown>;
  const type =
    candidate.type === 'daily' ||
    candidate.type === 'weekly' ||
    candidate.type === 'monthly'
      ? candidate.type
      : undefined;

  const interval =
    typeof candidate.interval === 'number' && Number.isFinite(candidate.interval) && candidate.interval > 0
      ? candidate.interval
      : undefined;

  return type && interval ? { type, interval } : undefined;
}

export function hasTaskParentCycle(taskId: string, parentTaskId: string, tasks: Task[]): boolean {
  let cursor: string | undefined = parentTaskId;
  const byId = new Map(tasks.map((task) => [task.id, task] as const));

  while (cursor) {
    if (cursor === taskId) return true;
    cursor = byId.get(cursor)?.parentTaskId;
  }

  return false;
}

export function validateTaskRelationships(task: Task, tasks: Task[]): string[] {
  const errors: string[] = [];

  if (task.parentTaskId) {
    if (task.parentTaskId === task.id) {
      errors.push('Task cannot be its own parent.');
    }

    const parent = tasks.find((item) => item.id === task.parentTaskId);
    if (!parent) {
      errors.push('Parent task does not exist.');
    }

    if (hasTaskParentCycle(task.id, task.parentTaskId, tasks)) {
      errors.push('Task parent relationship creates a cycle.');
    }
  }

  return errors;
}

export function getTodayTasks(tasks: Task[], now = new Date()): Task[] {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  return tasks.filter((task) => task.dueDate === today);
}
