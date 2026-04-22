// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, Budget, Expense, Note, OnboardingProfile, Task } from './types';

function createTable<T extends { id: string }>() {
  const rows = new Map<string, T>();

  return {
    async toArray() {
      return Array.from(rows.values());
    },
    async put(value: T) {
      rows.set(value.id, value);
      return value.id;
    },
    async get(id: string) {
      return rows.get(id);
    },
    async update(id: string, updates: Partial<T>) {
      const current = rows.get(id);
      if (!current) return 0;
      rows.set(id, { ...current, ...updates });
      return 1;
    },
    async delete(id: string) {
      rows.delete(id);
    },
    async clear() {
      rows.clear();
    },
    async bulkPut(values: T[]) {
      for (const value of values) {
        rows.set(value.id, value);
      }
    },
  };
}

const tables = vi.hoisted(() => ({
  tasksTable: createTable<Task>(),
  notesTable: createTable<Note>(),
  expensesTable: createTable<Expense>(),
  budgetsTable: createTable<Budget>(),
  accountsTable: createTable<Account>(),
  onboardingTable: createTable<OnboardingProfile>(),
}));

vi.mock('@/core/db/db', () => ({
  db: {
    tasks: tables.tasksTable,
    notes: tables.notesTable,
    expenses: tables.expensesTable,
    budgets: tables.budgetsTable,
    accounts: tables.accountsTable,
    onboarding: tables.onboardingTable,
    transaction: async (_mode: string, ...args: unknown[]) => {
      const callback = args[args.length - 1] as () => Promise<void>;
      await callback();
    },
  },
}));

import { useStore } from './useStore';

beforeEach(async () => {
  await tables.tasksTable.clear();
  await tables.notesTable.clear();
  await tables.expensesTable.clear();
  await tables.budgetsTable.clear();
  await tables.accountsTable.clear();
  await tables.onboardingTable.clear();

  const createdAt = new Date().toISOString();
  const defaultAccount: Account = { id: 'cash', name: 'Cash', balance: 0, createdAt };

  useStore.setState({
    tasks: [],
    notes: [],
    expenses: [],
    budgets: [],
    accounts: [defaultAccount],
    hydrated: true,
  });
  await tables.accountsTable.put(defaultAccount);
});

describe('core store stabilization behavior', () => {
  it('supports basic task CRUD', async () => {
    const created = await useStore.getState().addTask({ title: 'Ship launch', status: 'todo' });
    expect(useStore.getState().tasks).toHaveLength(1);

    const updated = await useStore.getState().updateTask(created.id, { status: 'doing' });
    expect(updated?.status).toBe('doing');

    await useStore.getState().deleteTask(created.id);
    expect(useStore.getState().tasks).toHaveLength(0);
  });

  it('keeps note-task links synchronized when tasks are added or removed', async () => {
    const note = await useStore.getState().addNote({
      content: 'Release checklist',
      tags: ['launch'],
    });

    const task = await useStore.getState().addTask({
      title: 'Write changelog',
      status: 'todo',
      noteId: note.id,
    });

    const linkedNote = useStore.getState().notes.find((item) => item.id === note.id);
    expect(linkedNote?.linkedTaskIds).toContain(task.id);

    await useStore.getState().deleteTask(task.id);
    const unlinkedNote = useStore.getState().notes.find((item) => item.id === note.id);
    expect(unlinkedNote?.linkedTaskIds).toEqual([]);
  });

  it('removes invalid expense task links on create, update, and import', async () => {
    const task = await useStore.getState().addTask({ title: 'Pay hosting bill', status: 'todo' });

    const validExpense = await useStore.getState().addExpense({
      amountDollars: 10,
      category: 'Ops',
      linkedTaskId: task.id,
    });
    expect(validExpense.linkedTaskId).toBe(task.id);

    const invalidExpense = await useStore.getState().addExpense({
      amountDollars: 11,
      category: 'Ops',
      linkedTaskId: 'missing-task',
    });
    expect(invalidExpense.linkedTaskId).toBeUndefined();

    const updated = await useStore.getState().updateExpense(validExpense.id, { linkedTaskId: 'missing-task' });
    expect(updated?.linkedTaskId).toBeUndefined();

    await useStore.getState().importBackup({
      tasks: [{ id: 'task-1', title: 'Valid task', status: 'todo', createdAt: new Date().toISOString() }],
      notes: [],
      expenses: [
        {
          id: 'expense-1',
          amount: 1234,
          category: 'Misc',
          linkedTaskId: 'non-existent',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    expect(useStore.getState().expenses[0]?.linkedTaskId).toBeUndefined();
  });
});
