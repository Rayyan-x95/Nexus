export type TaskStatus = 'todo' | 'doing' | 'done';

export type MoneyCents = number;

export function fromDollars(amountDollars: number): MoneyCents {
  return Math.round(amountDollars * 100);
}

export function toDollars(amountCents: MoneyCents): number {
  return amountCents / 100;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate?: string;
  noteId?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  content: string;
  tags: string[];
  linkedTaskIds?: string[];
  createdAt: string;
}

export interface Expense {
  id: string;
  amount: MoneyCents;
  category: string;
  linkedTaskId?: string;
  createdAt: string;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt'> & Partial<Pick<Task, 'id' | 'createdAt'>>;
export type NoteInput = Omit<Note, 'id' | 'createdAt'> & Partial<Pick<Note, 'id' | 'createdAt'>>;
export interface ExpenseInput {
  id?: string;
  amountDollars: number;
  category: string;
  linkedTaskId?: string;
  createdAt?: string;
}

export type TaskUpdate = Partial<Omit<Task, 'id' | 'createdAt'>>;
export type NoteUpdate = Partial<Omit<Note, 'id' | 'createdAt'>>;
export type ExpenseUpdate = Partial<Omit<Expense, 'id'>>;
