import { describe, expect, it } from 'vitest';
import {
  calculateNextOccurrence,
  getTodayTasks,
  hasTaskParentCycle,
  normalizeRecurrence,
  validateTaskRelationships,
} from './taskEngine';

describe('taskEngine', () => {
  it('calculates next occurrence correctly', () => {
    expect(calculateNextOccurrence('2024-01-01T00:00:00.000Z', { type: 'daily', interval: 2 })).toContain('2024-01-03');
    expect(calculateNextOccurrence('2024-01-01T00:00:00.000Z', { type: 'weekly', interval: 1 })).toContain('2024-01-08');
  });

  it('normalizes recurrence shape safely', () => {
    expect(normalizeRecurrence({ type: 'daily', interval: 1 })).toEqual({ type: 'daily', interval: 1 });
    expect(normalizeRecurrence({ type: 'daily', interval: 0 })).toBeUndefined();
    expect(normalizeRecurrence({ type: 'yearly', interval: 1 })).toBeUndefined();
  });

  it('detects cycles and invalid parent references', () => {
    const tasks = [
      { id: 'a', title: 'A', status: 'todo' as const, priority: 'medium' as const, parentTaskId: 'b', createdAt: 'x' },
      { id: 'b', title: 'B', status: 'todo' as const, priority: 'medium' as const, parentTaskId: 'a', createdAt: 'x' },
    ];

    expect(hasTaskParentCycle('a', 'b', tasks)).toBe(true);
    const errors = validateTaskRelationships(
      { id: 'a', title: 'A', status: 'todo', priority: 'medium', parentTaskId: 'a', createdAt: 'x' },
      tasks,
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns tasks due today', () => {
    const tasks = [
      { id: 'today', title: 'Today', status: 'todo' as const, priority: 'medium' as const, dueDate: '2024-03-01', createdAt: 'x' },
      { id: 'later', title: 'Later', status: 'todo' as const, priority: 'medium' as const, dueDate: '2024-03-02', createdAt: 'x' },
    ];

    const result = getTodayTasks(tasks, new Date('2024-03-01T08:00:00.000Z'));
    expect(result.map((task) => task.id)).toEqual(['today']);
  });
});
