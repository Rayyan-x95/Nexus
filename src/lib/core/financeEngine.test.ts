import { describe, expect, it } from 'vitest';
import {
  applyExpenseToBalance,
  calculateCategoryTotals,
  calculateTotalBalance,
  dollarsToCentsSafe,
  filterExpensesByRange,
  recalculateBalancesForExpenseUpdate,
  revertExpenseFromBalance,
} from './financeEngine';
import type { Account, Expense } from '@/core/store/types';

describe('financeEngine', () => {
  it('applies and reverts balances for expense and income', () => {
    expect(applyExpenseToBalance(10000, 2500, 'expense')).toBe(7500);
    expect(applyExpenseToBalance(10000, 2500, 'income')).toBe(12500);
    expect(revertExpenseFromBalance(7500, 2500, 'expense')).toBe(10000);
    expect(revertExpenseFromBalance(12500, 2500, 'income')).toBe(10000);
  });

  it('recalculates account balances for cross-account updates', () => {
    const accounts: Account[] = [
      { id: 'cash', name: 'Cash', balance: 10000, createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'bank', name: 'Bank', balance: 5000, createdAt: '2024-01-01T00:00:00.000Z' },
    ];

    const previous: Expense = {
      id: 'e1',
      amount: 2000,
      category: 'Food',
      type: 'expense',
      accountId: 'cash',
      tags: [],
      isRecurring: false,
      createdAt: '2024-01-05T00:00:00.000Z',
    };

    const next: Expense = {
      ...previous,
      amount: 3000,
      type: 'income',
      accountId: 'bank',
    };

    const result = recalculateBalancesForExpenseUpdate(accounts, previous, next);
    expect(result.find((a) => a.id === 'cash')?.balance).toBe(12000);
    expect(result.find((a) => a.id === 'bank')?.balance).toBe(8000);
  });

  it('filters expenses by week without mutating external date state', () => {
    const expenses: Expense[] = [
      {
        id: 'recent',
        amount: 100,
        category: 'Food',
        type: 'expense',
        accountId: 'cash',
        tags: [],
        isRecurring: false,
        createdAt: '2024-02-07T10:00:00.000Z',
      },
      {
        id: 'old',
        amount: 100,
        category: 'Food',
        type: 'expense',
        accountId: 'cash',
        tags: [],
        isRecurring: false,
        createdAt: '2024-01-15T10:00:00.000Z',
      },
    ];

    const result = filterExpensesByRange(expenses, 'week', new Date('2024-02-08T12:00:00.000Z'));
    expect(result.map((item) => item.id)).toEqual(['recent']);
  });

  it('aggregates category totals and account totals safely', () => {
    const expenses: Expense[] = [
      {
        id: '1',
        amount: 500,
        category: 'Food',
        type: 'expense',
        accountId: 'cash',
        tags: [],
        isRecurring: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        amount: 200,
        category: 'Food',
        type: 'expense',
        accountId: 'cash',
        tags: [],
        isRecurring: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '3',
        amount: 100,
        category: 'Food',
        type: 'income',
        accountId: 'cash',
        tags: [],
        isRecurring: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    const totals = calculateCategoryTotals(expenses);
    expect(totals.Food).toBe(700);

    const accountTotal = calculateTotalBalance([
      { id: 'cash', name: 'Cash', balance: 500, createdAt: 'x' },
      { id: 'bank', name: 'Bank', balance: 300, createdAt: 'x' },
    ]);
    expect(accountTotal).toBe(800);
    expect(dollarsToCentsSafe(12.34)).toBe(1234);
  });
});
