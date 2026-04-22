import { create } from 'zustand';
import { db } from '@/core/db/db';
import type {
  Expense,
  ExpenseInput,
  ExpenseUpdate,
  Note,
  NoteInput,
  NoteUpdate,
  Task,
  TaskInput,
  TaskUpdate,
  Budget,
  BudgetInput,
  BudgetUpdate,
  TaskRecurrence,
  Account,
  AccountInput,
  AccountUpdate,
  FinancialGoal,
  OnboardingProfile,
  OnboardingUpdate,
} from './types';
import {
  clearNoteBacklinks,
  clearTasksForDeletedNote,
  reconcileTaskNoteReferences,
  syncNoteNoteReferences,
  syncTaskNoteReference,
  validateTaskNoteReference,
  clearTaskNoteReference
} from './taskNoteSync';
import {
  applyExpenseToBalance,
  buildBudgetSuggestions,
  calculateCategoryTotals,
  dollarsToCentsSafe,
  filterExpensesByRange,
  normalizeExpenseRecurrenceRule,
  normalizePositiveCents,
  recalculateBalancesForExpenseUpdate,
  revertExpenseFromBalance,
  shouldRebalanceForExpenseUpdate,
} from '@/lib/core/financeEngine';
import {
  calculateNextOccurrence,
  getTodayTasks as getTodayTasksFromEngine,
  normalizeRecurrence as normalizeTaskRecurrence,
  validateTaskRelationships,
} from '@/lib/core/taskEngine';

interface CoreStoreState {
  tasks: Task[];
  notes: Note[];
  expenses: Expense[];
  budgets: Budget[];
  accounts: Account[];
  onboarding: OnboardingProfile;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  clearAll: () => Promise<void>;
  importBackup: (payload: unknown) => Promise<void>;

  // Onboarding
  updateOnboarding: (updates: OnboardingUpdate) => Promise<OnboardingProfile>;
  completeOnboarding: (updates?: OnboardingUpdate) => Promise<OnboardingProfile>;
  skipOnboarding: () => Promise<OnboardingProfile>;
  
  // Accounts
  addAccount: (account: AccountInput) => Promise<Account>;
  updateAccount: (id: string, updates: AccountUpdate) => Promise<Account | undefined>;
  deleteAccount: (id: string) => Promise<void>;

  // Tasks
  addTask: (task: TaskInput) => Promise<Task>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<Task | undefined>;
  deleteTask: (id: string) => Promise<void>;

  // Notes
  addNote: (note: NoteInput) => Promise<Note>;
  updateNote: (id: string, updates: NoteUpdate) => Promise<Note | undefined>;
  deleteNote: (id: string) => Promise<void>;

  // Finance
  addExpense: (expense: ExpenseInput) => Promise<Expense>;
  updateExpense: (id: string, updates: ExpenseUpdate) => Promise<Expense | undefined>;
  deleteExpense: (id: string) => Promise<void>;
  addBudget: (budget: BudgetInput) => Promise<Budget>;
  updateBudget: (id: string, updates: BudgetUpdate) => Promise<Budget | undefined>;
  deleteBudget: (id: string) => Promise<void>;
  processRecurringTransactions: () => Promise<void>;

  // Derived selectors
  getTodayTasks: () => Task[];
  getWeeklyExpenses: () => Expense[];
  getCategoryTotals: () => Record<string, number>;
  getPinnedNotes: () => Note[];
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createTimestamp(value?: string) {
  return value ?? new Date().toISOString();
}

function createDefaultOnboardingProfile(timestamp = new Date().toISOString()): OnboardingProfile {
  return {
    id: 'primary',
    name: '',
    income: 0,
    avgExpense: 0,
    goals: [],
    preferences: {
      notifications: true,
      darkMode: true,
    },
    currentStep: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function upsertItem<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((i) => i.id === item.id);
  if (index === -1) return [...items, item];
  const next = [...items];
  next[index] = item;
  return next;
}

function sanitizeExpenseReferences<T extends { linkedTaskId?: string; linkedNoteId?: string }>(
  value: T,
  tasks: Task[],
  notes: Note[],
): T {
  return {
    ...value,
    linkedTaskId:
      value.linkedTaskId && !tasks.some((task) => task.id === value.linkedTaskId)
        ? undefined
        : value.linkedTaskId,
    linkedNoteId:
      value.linkedNoteId && !notes.some((note) => note.id === value.linkedNoteId)
        ? undefined
        : value.linkedNoteId,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readArray(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return Array.isArray(value) ? value : [];
}

function normalizeRecurrence(value: unknown): TaskRecurrence | undefined {
  return normalizeTaskRecurrence(value);
}

function normalizeImportedTask(value: unknown): Task | undefined {
  if (!isRecord(value) || typeof value.title !== 'string') return undefined;

  const status = value.status === 'doing' || value.status === 'done' ? value.status : 'todo';
  const priority =
    value.priority === 'low' || value.priority === 'medium' || value.priority === 'high'
      ? value.priority
      : 'medium';

  return {
    id: typeof value.id === 'string' ? value.id : createId(),
    title: value.title,
    status,
    priority,
    dueDate: typeof value.dueDate === 'string' ? value.dueDate : undefined,
    noteId: typeof value.noteId === 'string' ? value.noteId : undefined,
    parentTaskId: typeof value.parentTaskId === 'string' ? value.parentTaskId : undefined,
    recurrence: normalizeRecurrence(value.recurrence),
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeImportedNote(value: unknown): Note | undefined {
  if (!isRecord(value) || typeof value.content !== 'string') return undefined;

  return {
    id: typeof value.id === 'string' ? value.id : createId(),
    content: value.content,
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    linkedTaskIds: Array.isArray(value.linkedTaskIds)
      ? value.linkedTaskIds.filter((id): id is string => typeof id === 'string')
      : [],
    linkedNoteIds: Array.isArray(value.linkedNoteIds)
      ? value.linkedNoteIds.filter((id): id is string => typeof id === 'string')
      : [],
    pinned: typeof value.pinned === 'boolean' ? value.pinned : false,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeImportedAccount(value: unknown): Account | undefined {
  if (!isRecord(value) || typeof value.name !== 'string') return undefined;

  return {
    id: typeof value.id === 'string' ? value.id : createId(),
    name: value.name,
    balance: typeof value.balance === 'number' && Number.isFinite(value.balance) ? value.balance : 0,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeImportedExpense(value: unknown, fallbackAccountId: string): Expense | undefined {
  if (!isRecord(value) || typeof value.category !== 'string') return undefined;

  const amount =
    typeof value.amount === 'number' && Number.isFinite(value.amount)
      ? value.amount
      : typeof value.amountDollars === 'number' && Number.isFinite(value.amountDollars)
        ? dollarsToCentsSafe(value.amountDollars)
        : 0;

  return {
    id: typeof value.id === 'string' ? value.id : createId(),
    amount,
    category: value.category,
    type: value.type === 'income' ? 'income' : 'expense',
    accountId: typeof value.accountId === 'string' ? value.accountId : fallbackAccountId,
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    note: typeof value.note === 'string' ? value.note : undefined,
    isRecurring: typeof value.isRecurring === 'boolean' ? value.isRecurring : false,
    recurrenceRule: normalizeExpenseRecurrenceRule(value.recurrenceRule),
    linkedTaskId: typeof value.linkedTaskId === 'string' ? value.linkedTaskId : undefined,
    linkedNoteId: typeof value.linkedNoteId === 'string' ? value.linkedNoteId : undefined,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeImportedBudget(value: unknown): Budget | undefined {
  if (!isRecord(value) || typeof value.category !== 'string') return undefined;

  return {
    id: typeof value.id === 'string' ? value.id : createId(),
    category: value.category,
    limit: typeof value.limit === 'number' && Number.isFinite(value.limit) ? value.limit : 0,
    period: value.period === 'weekly' ? 'weekly' : 'monthly',
  };
}

function normalizeImportedOnboarding(value: unknown, fallback: OnboardingProfile): OnboardingProfile {
  if (!isRecord(value)) return fallback;

  const base = createDefaultOnboardingProfile();
  const preferences = isRecord(value.preferences) ? value.preferences : {};
  const goals = Array.isArray(value.goals)
    ? value.goals.filter((goal): goal is FinancialGoal =>
        goal === 'save-money' ||
        goal === 'track-spending' ||
        goal === 'improve-productivity' ||
        goal === 'reduce-expenses',
      )
    : [];

  return {
    ...base,
    id: 'primary',
    name: typeof value.name === 'string' ? value.name : base.name,
    dob: typeof value.dob === 'string' ? value.dob : undefined,
    income: typeof value.income === 'number' && Number.isFinite(value.income) ? value.income : base.income,
    avgExpense:
      typeof value.avgExpense === 'number' && Number.isFinite(value.avgExpense)
        ? value.avgExpense
        : base.avgExpense,
    goals,
    preferences: {
      notifications:
        typeof preferences.notifications === 'boolean'
          ? preferences.notifications
          : base.preferences.notifications,
      darkMode:
        typeof preferences.darkMode === 'boolean'
          ? preferences.darkMode
          : base.preferences.darkMode,
    },
    currentStep:
      typeof value.currentStep === 'number' && Number.isFinite(value.currentStep)
        ? value.currentStep
        : base.currentStep,
    completedAt: typeof value.completedAt === 'string' ? value.completedAt : undefined,
    skippedAt: typeof value.skippedAt === 'string' ? value.skippedAt : undefined,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : base.createdAt,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
  };
}

async function hydrateFromDatabase() {
  const [tasks, notes, expenses, budgets, accounts, onboarding] = await Promise.all([
    db.tasks.toArray(),
    db.notes.toArray(),
    db.expenses.toArray(),
    db.budgets.toArray(),
    db.accounts.toArray(),
    db.onboarding.get('primary'),
  ]);

  const reconciled = reconcileTaskNoteReferences(tasks, notes);
  return { 
    tasks: reconciled.tasks, 
    notes: reconciled.notes, 
    expenses,
    budgets,
    accounts,
    onboarding: onboarding ?? createDefaultOnboardingProfile(),
  };
}

export const useStore = create<CoreStoreState>((set, get) => ({
  tasks: [],
  notes: [],
  expenses: [],
  budgets: [],
  accounts: [],
  onboarding: createDefaultOnboardingProfile(),
  hydrated: false,

  hydrate: async () => {
    console.log('[Titan] Hydrating store...');
    try {
      let { tasks, notes, expenses, budgets, accounts, onboarding } = await hydrateFromDatabase();
      
      if (accounts.length === 0) {
        console.log('[Titan] No accounts found, initializing defaults...');
        const defaults: Account[] = [
          { id: 'cash', name: 'Cash', balance: 0, createdAt: new Date().toISOString() },
          { id: 'bank', name: 'Bank', balance: 0, createdAt: new Date().toISOString() },
          { id: 'upi', name: 'UPI', balance: 0, createdAt: new Date().toISOString() },
        ];
        await db.accounts.bulkPut(defaults);
        accounts = defaults;
      }

      set({ tasks, notes, expenses, budgets, accounts, onboarding, hydrated: true });
      console.log('[Titan] Hydration complete.', { tasks: tasks.length, accounts: accounts.length });
    } catch (error) {
      console.error('[Titan] Hydration failed:', error);
      set({ hydrated: true });
    }
  },

  clearAll: async () => {
    try {
      const onboarding = createDefaultOnboardingProfile();
      await db.transaction('rw', [db.tasks, db.notes, db.expenses, db.budgets, db.accounts, db.onboarding], async () => {
        await Promise.all([db.tasks.clear(), db.notes.clear(), db.expenses.clear(), db.budgets.clear(), db.accounts.clear(), db.onboarding.clear()]);
      });
      set({ tasks: [], notes: [], expenses: [], budgets: [], accounts: [], onboarding });
    } catch (error) {
      console.error('[Titan] Clear all failed:', error);
    }
  },

  importBackup: async (payload) => {
    if (!isRecord(payload)) {
      throw new Error('Invalid backup payload.');
    }

    const importedTasks = readArray(payload, 'tasks')
      .map(normalizeImportedTask)
      .filter((task): task is Task => Boolean(task));
    const importedNotes = readArray(payload, 'notes')
      .map(normalizeImportedNote)
      .filter((note): note is Note => Boolean(note));
    const reconciled = reconcileTaskNoteReferences(importedTasks, importedNotes);

    let importedAccounts = readArray(payload, 'accounts')
      .map(normalizeImportedAccount)
      .filter((account): account is Account => Boolean(account));

    if (importedAccounts.length === 0) {
      const now = new Date().toISOString();
      importedAccounts = [
        { id: 'cash', name: 'Cash', balance: 0, createdAt: now },
        { id: 'bank', name: 'Bank', balance: 0, createdAt: now },
        { id: 'upi', name: 'UPI', balance: 0, createdAt: now },
      ];
    }

    const accountIds = new Set(importedAccounts.map((account) => account.id));
    const fallbackAccountId = importedAccounts[0].id;
    const importedExpenses = readArray(payload, 'expenses')
      .map((expense) => normalizeImportedExpense(expense, fallbackAccountId))
      .filter((expense): expense is Expense => Boolean(expense))
      .map((expense) => ({
        ...expense,
        accountId: accountIds.has(expense.accountId) ? expense.accountId : fallbackAccountId,
      }))
      .map((expense) => sanitizeExpenseReferences(expense, reconciled.tasks, reconciled.notes));
    const importedBudgets = readArray(payload, 'budgets')
      .map(normalizeImportedBudget)
      .filter((budget): budget is Budget => Boolean(budget));
    const importedOnboarding = normalizeImportedOnboarding(payload.onboarding, get().onboarding);

    await db.transaction(
      'rw',
      [db.tasks, db.notes, db.expenses, db.budgets, db.accounts, db.onboarding],
      async () => {
        await Promise.all([
          db.tasks.clear(),
          db.notes.clear(),
          db.expenses.clear(),
          db.budgets.clear(),
          db.accounts.clear(),
        ]);
        await Promise.all([
          db.tasks.bulkPut(reconciled.tasks),
          db.notes.bulkPut(reconciled.notes),
          db.expenses.bulkPut(importedExpenses),
          db.budgets.bulkPut(importedBudgets),
          db.accounts.bulkPut(importedAccounts),
          db.onboarding.put(importedOnboarding),
        ]);
      },
    );

    set({
      tasks: reconciled.tasks,
      notes: reconciled.notes,
      expenses: importedExpenses,
      budgets: importedBudgets,
      accounts: importedAccounts,
      onboarding: importedOnboarding,
      hydrated: true,
    });
  },

  updateOnboarding: async (updates) => {
    const current = get().onboarding;
    const now = new Date().toISOString();
    const next: OnboardingProfile = {
      ...current,
      ...updates,
      preferences: updates.preferences
        ? { ...current.preferences, ...updates.preferences }
        : current.preferences,
      updatedAt: now,
    };

    await db.onboarding.put(next);
    set({ onboarding: next });
    return next;
  },

  completeOnboarding: async (updates = {}) => {
    const current = get().onboarding;
    const now = new Date().toISOString();
    const next: OnboardingProfile = {
      ...current,
      ...updates,
      preferences: updates.preferences
        ? { ...current.preferences, ...updates.preferences }
        : current.preferences,
      currentStep: Math.max(current.currentStep, 7),
      completedAt: now,
      skippedAt: undefined,
      updatedAt: now,
    };
    const budgetSuggestions = buildBudgetSuggestions(next, get().budgets);

    await db.transaction('rw', [db.onboarding, db.budgets], async () => {
      await db.onboarding.put(next);
      if (budgetSuggestions.length > 0) {
        await db.budgets.bulkPut(budgetSuggestions);
      }
    });

    set((state) => ({
      onboarding: next,
      budgets: [...state.budgets, ...budgetSuggestions],
    }));
    return next;
  },

  skipOnboarding: async () => {
    const current = get().onboarding;
    const now = new Date().toISOString();
    const next: OnboardingProfile = {
      ...current,
      skippedAt: now,
      updatedAt: now,
    };

    await db.onboarding.put(next);
    set({ onboarding: next });
    return next;
  },

  // Accounts
  addAccount: async (input) => {
    const account: Account = {
      id: input.id ?? createId(),
      name: input.name,
      balance: dollarsToCentsSafe(input.balanceDollars),
      createdAt: new Date().toISOString(),
    };
    await db.accounts.put(account);
    set(state => ({ accounts: upsertItem(state.accounts, account) }));
    return account;
  },

  updateAccount: async (id, updates) => {
    const current = get().accounts.find(a => a.id === id);
    if (!current) return undefined;
    const next = { ...current, ...updates };
    await db.accounts.put(next);
    set(state => ({ accounts: upsertItem(state.accounts, next) }));
    return next;
  },

  deleteAccount: async (id) => {
    const state = get();
    const account = state.accounts.find((entry) => entry.id === id);
    if (!account) return;
    if (state.accounts.length <= 1) {
      throw new Error('Cannot delete the last account.');
    }

    const fallbackAccount = state.accounts.find((entry) => entry.id !== id);
    if (!fallbackAccount) {
      throw new Error('No fallback account available.');
    }

    const migratedExpenses = state.expenses
      .filter((expense) => expense.accountId === id)
      .map((expense) => ({ ...expense, accountId: fallbackAccount.id }));
    const reassignedExpenses = state.expenses.map((expense) =>
      expense.accountId === id
        ? (migratedExpenses.find((migrated) => migrated.id === expense.id) ?? expense)
        : expense,
    );

    const updatedFallbackAccount = {
      ...fallbackAccount,
      balance: fallbackAccount.balance + account.balance,
    };

    await db.transaction('rw', [db.accounts, db.expenses], async () => {
      await db.accounts.delete(id);
      await db.accounts.put(updatedFallbackAccount);
      await Promise.all(migratedExpenses.map((expense) => db.expenses.put(expense)));
    });

    set((prev) => ({
      accounts: prev.accounts
        .filter((entry) => entry.id !== id)
        .map((entry) => (entry.id === fallbackAccount.id ? updatedFallbackAccount : entry)),
      expenses: reassignedExpenses,
    }));
  },

  // Tasks
  addTask: async (input) => {
    console.log('[Titan] Adding task:', input.title);
    try {
      const currentState = get();
      const task: Task = {
        id: input.id ?? createId(),
        ...input,
        priority: input.priority ?? 'medium',
        recurrence: normalizeTaskRecurrence(input.recurrence),
        createdAt: createTimestamp(input.createdAt),
      };

      validateTaskNoteReference(task, currentState.notes);

      const relationshipErrors = validateTaskRelationships(task, currentState.tasks);
      if (relationshipErrors.length > 0) {
        throw new Error(relationshipErrors.join(' '));
      }

      const nextNotes = syncTaskNoteReference(task, currentState.notes, currentState.tasks);
      const touchedNoteIds = new Set([task.noteId].filter(Boolean) as string[]);

      await db.transaction('rw', [db.tasks, db.notes], async () => {
        await db.tasks.put(task);
        await Promise.all(
          nextNotes.filter(n => touchedNoteIds.has(n.id)).map(n => db.notes.put(n))
        );
      });

      set(state => ({ 
        tasks: upsertItem(state.tasks, task),
        notes: nextNotes
      }));
      return task;
    } catch (error) {
      console.error('[Titan] Add task failed:', error);
      throw error;
    }
  },

  updateTask: async (id, updates) => {
    try {
      const currentState = get();
      const current = currentState.tasks.find(t => t.id === id);
      if (!current) return undefined;
      
      const nextTask: Task = {
        ...current,
        ...updates,
        recurrence:
          updates.recurrence === undefined
            ? current.recurrence
            : normalizeTaskRecurrence(updates.recurrence),
      };

      validateTaskNoteReference(nextTask, currentState.notes);

      const relationshipErrors = validateTaskRelationships(
        nextTask,
        currentState.tasks.filter((task) => task.id !== id),
      );
      if (relationshipErrors.length > 0) {
        throw new Error(relationshipErrors.join(' '));
      }

      const nextNotes = syncTaskNoteReference(nextTask, currentState.notes, currentState.tasks);
      const touchedNoteIds = new Set([current.noteId, nextTask.noteId].filter(Boolean) as string[]);

      await db.transaction('rw', [db.tasks, db.notes], async () => {
        await db.tasks.put(nextTask);
        await Promise.all(
          nextNotes.filter(n => touchedNoteIds.has(n.id)).map(n => db.notes.put(n))
        );
      });

      set(state => ({ 
        tasks: upsertItem(state.tasks, nextTask),
        notes: nextNotes
      }));
      return nextTask;
    } catch (error) {
      console.error('[Titan] Update task failed:', error);
      throw error;
    }
  },

  deleteTask: async (id) => {
    console.log('[Titan] Deleting task:', id);
    try {
      const currentState = get();
      const currentTask = currentState.tasks.find(t => t.id === id);
      const nextNotes = currentTask ? clearTaskNoteReference(id, currentState.notes) : currentState.notes;
      const nextExpenses = currentState.expenses.map((expense) =>
        expense.linkedTaskId === id ? { ...expense, linkedTaskId: undefined } : expense,
      );
      const touchedExpenseIds = new Set(
        currentState.expenses.filter((expense) => expense.linkedTaskId === id).map((expense) => expense.id),
      );

      await db.transaction('rw', [db.tasks, db.notes, db.expenses], async () => {
        await db.tasks.delete(id);
        if (currentTask?.noteId) {
          const updatedNote = nextNotes.find(n => n.id === currentTask.noteId);
          if (updatedNote) await db.notes.put(updatedNote);
        }
        await Promise.all(
          nextExpenses
            .filter((expense) => touchedExpenseIds.has(expense.id))
            .map((expense) => db.expenses.put(expense)),
        );
      });

      set(state => ({ 
        tasks: state.tasks.filter(t => t.id !== id),
        notes: nextNotes,
        expenses: nextExpenses,
      }));
      console.log('[Titan] Task deleted successfully.');
    } catch (error) {
      console.error('[Titan] Delete task failed:', error);
      throw error;
    }
  },

  // Notes
  addNote: async (input) => {
    const note: Note = {
      id: input.id ?? createId(),
      content: input.content,
      tags: input.tags,
      pinned: input.pinned ?? false,
      linkedNoteIds: input.linkedNoteIds ?? [],
      linkedTaskIds: input.linkedTaskIds ?? [],
      createdAt: createTimestamp(input.createdAt),
    };

    const currentState = get();
    const nextNotes = syncNoteNoteReferences(note, currentState.notes);
    const touchedIds = new Set([note.id, ...(note.linkedNoteIds ?? [])]);

    await db.transaction('rw', [db.notes], async () => {
      await db.notes.put(note);
      await Promise.all(
        nextNotes.filter((entry) => touchedIds.has(entry.id)).map((entry) => db.notes.put(entry)),
      );
    });

    set({ notes: nextNotes });
    return note;
  },

  updateNote: async (id, updates) => {
    try {
      const currentState = get();
      const current = currentState.notes.find(n => n.id === id);
      if (!current) return undefined;
      
      const nextNote: Note = { ...current, ...updates };
      const nextNotes = syncNoteNoteReferences(nextNote, currentState.notes);
      const touchedIds = new Set([
        nextNote.id,
        ...(current.linkedNoteIds ?? []),
        ...(nextNote.linkedNoteIds ?? []),
      ]);
      
      await db.transaction('rw', [db.notes], async () => {
        await db.notes.put(nextNote);
        await Promise.all(
          nextNotes.filter(n => touchedIds.has(n.id)).map(n => db.notes.put(n))
        );
      });

      set(state => ({ notes: nextNotes }));
      return nextNote;
    } catch (error) {
      console.error('[Titan] Update note failed:', error);
      throw error;
    }
  },

  deleteNote: async (id) => {
    try {
      const currentState = get();
      const nextNotes = clearNoteBacklinks(id, currentState.notes);
      const nextTasks = clearTasksForDeletedNote(id, currentState.tasks);
      const nextExpenses = currentState.expenses.map((expense) =>
        expense.linkedNoteId === id ? { ...expense, linkedNoteId: undefined } : expense,
      );
      const touchedTaskIds = new Set(
        currentState.tasks.filter((task) => task.noteId === id).map((task) => task.id),
      );
      const touchedExpenseIds = new Set(
        currentState.expenses.filter((expense) => expense.linkedNoteId === id).map((expense) => expense.id),
      );

      await db.transaction('rw', [db.tasks, db.notes, db.expenses], async () => {
        await db.notes.delete(id);
        await Promise.all(nextNotes.filter(n => n.id !== id).map(n => db.notes.put(n)));
        await Promise.all(nextTasks.filter(t => touchedTaskIds.has(t.id)).map(t => db.tasks.put(t)));
        await Promise.all(
          nextExpenses.filter((expense) => touchedExpenseIds.has(expense.id)).map((expense) => db.expenses.put(expense)),
        );
      });

      set({ notes: nextNotes.filter(n => n.id !== id), tasks: nextTasks, expenses: nextExpenses });
    } catch (error) {
      console.error('[Titan] Delete note failed:', error);
      throw error;
    }
  },

  // Finance
  addExpense: async (input) => {
    console.log('[Titan] Adding expense:', input.category, input.amountDollars);
    try {
      const sanitizedInput = sanitizeExpenseReferences(input, get().tasks, get().notes);
      const amount = normalizePositiveCents(dollarsToCentsSafe(input.amountDollars));
      const accountId =
        sanitizedInput.accountId ??
        get().accounts.find((account) => account.id === 'cash')?.id ??
        get().accounts[0]?.id;
      const type = sanitizedInput.type ?? 'expense';

      if (!accountId) {
        console.error('[Titan] No account available for expense.');
        throw new Error('No account available for expense.');
      }
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero.');
      }

      const recurrenceRule = sanitizedInput.isRecurring
        ? normalizeExpenseRecurrenceRule(sanitizedInput.recurrenceRule)
        : undefined;

      const expense: Expense = {
        id: input.id ?? createId(),
        amount,
        category: input.category,
        type,
        accountId,
        tags: sanitizedInput.tags ?? [],
        note: sanitizedInput.note,
        isRecurring: sanitizedInput.isRecurring ?? false,
        recurrenceRule,
        linkedTaskId: sanitizedInput.linkedTaskId,
        linkedNoteId: sanitizedInput.linkedNoteId,
        createdAt: createTimestamp(input.createdAt),
      };

      const account = get().accounts.find(a => a.id === accountId);
      if (!account) {
        console.error('[Titan] Account not found for ID:', accountId);
        throw new Error(`Account not found: ${accountId}`);
      }

      const nextBalance = applyExpenseToBalance(account.balance, amount, type);

      await db.transaction('rw', [db.expenses, db.accounts], async () => {
        await db.expenses.put(expense);
        await db.accounts.update(account.id, { balance: nextBalance });
      });

      set(state => ({ 
        expenses: upsertItem(state.expenses, expense),
        accounts: upsertItem(state.accounts, { ...account, balance: nextBalance })
      }));
      console.log('[Titan] Expense added successfully.');
      return expense;
    } catch (error) {
      console.error('[Titan] Add expense failed:', error);
      throw error;
    }
  },

  updateExpense: async (id, updates) => {
    try {
      const current = get().expenses.find(e => e.id === id);
      if (!current) return undefined;
      
      const sanitizedUpdates = sanitizeExpenseReferences(updates, get().tasks, get().notes);
      const amount =
        sanitizedUpdates.amount !== undefined
          ? normalizePositiveCents(sanitizedUpdates.amount)
          : current.amount;
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero.');
      }

      const isRecurring = sanitizedUpdates.isRecurring ?? current.isRecurring;
      const recurrenceRule = isRecurring
        ? normalizeExpenseRecurrenceRule(sanitizedUpdates.recurrenceRule ?? current.recurrenceRule)
        : undefined;
      if (isRecurring && !recurrenceRule) {
        throw new Error('Recurring expenses require a valid recurrence rule.');
      }

      const next: Expense = {
        ...current,
        ...sanitizedUpdates,
        amount,
        isRecurring,
        recurrenceRule,
      };
      
      await db.transaction('rw', [db.expenses, db.accounts], async () => {
         if (shouldRebalanceForExpenseUpdate(sanitizedUpdates)) {
           const nextAccounts = recalculateBalancesForExpenseUpdate(get().accounts, current, next);
           await Promise.all(nextAccounts.map((account) => db.accounts.put(account)));
         }
         await db.expenses.put(next);
      });

      set((state) => ({
        accounts: shouldRebalanceForExpenseUpdate(sanitizedUpdates)
          ? recalculateBalancesForExpenseUpdate(state.accounts, current, next)
          : state.accounts,
        expenses: upsertItem(state.expenses, next),
      }));
      return next;
    } catch (error) {
      console.error('[Titan] Update expense failed:', error);
      throw error;
    }
  },

  deleteExpense: async (id) => {
    console.log('[Titan] Deleting expense:', id);
    try {
      const current = get().expenses.find(e => e.id === id);
      if (!current) return;

      const account = get().accounts.find(a => a.id === current.accountId);
      
      await db.transaction('rw', [db.expenses, db.accounts], async () => {
        await db.expenses.delete(id);
        if (account) {
          const nextBalance = revertExpenseFromBalance(account.balance, current.amount, current.type);
          await db.accounts.update(account.id, { balance: nextBalance });
        }
      });

      set((state) => ({
        expenses: state.expenses.filter((expense) => expense.id !== id),
        accounts: account
          ? upsertItem(state.accounts, {
              ...account,
              balance: revertExpenseFromBalance(account.balance, current.amount, current.type),
            })
          : state.accounts,
      }));
      console.log('[Titan] Expense deleted successfully.');
    } catch (error) {
      console.error('[Titan] Delete expense failed:', error);
      throw error;
    }
  },

  addBudget: async (input) => {
    const budget: Budget = {
      id: input.id ?? createId(),
      category: input.category,
      limit: input.limit,
      period: input.period,
    };
    await db.budgets.put(budget);
    set(state => ({ budgets: upsertItem(state.budgets, budget) }));
    return budget;
  },

  updateBudget: async (id, updates) => {
    const current = get().budgets.find(b => b.id === id);
    if (!current) return undefined;
    const next = { ...current, ...updates };
    await db.budgets.put(next);
    set(state => ({ budgets: upsertItem(state.budgets, next) }));
    return next;
  },

  deleteBudget: async (id) => {
    await db.budgets.delete(id);
    set(state => ({ budgets: state.budgets.filter(b => b.id !== id) }));
  },

  getTodayTasks: () => {
    return getTodayTasksFromEngine(get().tasks);
  },

  getWeeklyExpenses: () => {
    return filterExpensesByRange(get().expenses, 'week');
  },

  getCategoryTotals: () => {
    return calculateCategoryTotals(get().expenses);
  },

  processRecurringTransactions: async () => {
    const { expenses, addExpense, updateExpense } = get();
    const now = new Date();
    const recurring = expenses.filter(e => e.isRecurring && e.recurrenceRule);

    for (const item of recurring) {
      let cursorDate = new Date(item.createdAt);
      let nextDate = new Date(calculateNextOccurrence(cursorDate.toISOString(), item.recurrenceRule!));
      let createdCount = 0;

      while (nextDate <= now) {
        await addExpense({
          amountDollars: item.amount / 100,
          category: item.category,
          type: item.type,
          accountId: item.accountId,
          note: `Recurring: ${item.note || item.category}`,
          tags: item.tags,
          isRecurring: false,
          createdAt: nextDate.toISOString(),
        });
        cursorDate = nextDate;
        nextDate = new Date(calculateNextOccurrence(nextDate.toISOString(), item.recurrenceRule!));
        createdCount++;
      }

      if (createdCount > 0) {
        // Move the recurrence cursor forward so future runs only create newly due instances.
        await updateExpense(item.id, { createdAt: cursorDate.toISOString() });
      }
    }
  },

  getPinnedNotes: () => {
    return get().notes.filter((n) => n.pinned);
  },
}));

export async function initializeCoreStore() {
  if (useStore.getState().hydrated) return;
  await useStore.getState().hydrate();
}
