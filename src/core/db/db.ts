import Dexie, { type Table } from 'dexie';
import type { Account, Budget, Expense, Note, OnboardingProfile, Task } from '@/core/store/types';

class TitanDatabase extends Dexie {
  tasks!: Table<Task, string>;
  notes!: Table<Note, string>;
  expenses!: Table<Expense, string>;
  budgets!: Table<Budget, string>;
  accounts!: Table<Account, string>;
  onboarding!: Table<OnboardingProfile, string>;

  constructor() {
    super('titan');

    this.version(1).stores({
      tasks: 'id, status, createdAt, dueDate, noteId',
      notes: 'id, createdAt',
      expenses: 'id, category, createdAt, linkedTaskId',
      onboarding: 'id',
    });

    this.version(2).stores({
      tasks: 'id, status, createdAt, dueDate, noteId',
      notes: 'id, createdAt',
      expenses: 'id, category, createdAt, linkedTaskId, accountId, type',
      budgets: 'id, category, period',
      accounts: 'id, name, createdAt',
      onboarding: 'id',
    });

    this.tasks = this.table('tasks');
    this.notes = this.table('notes');
    this.expenses = this.table('expenses');
    this.budgets = this.table('budgets');
    this.accounts = this.table('accounts');
    this.onboarding = this.table('onboarding');
  }
}

export const db = new TitanDatabase();
