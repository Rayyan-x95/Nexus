import { describe, expect, it } from 'vitest';
import { parseQuickFinance, parseTextToTransaction } from './parserEngine';

describe('parserEngine', () => {
  it('parses quick finance text deterministically', () => {
    const result = parseQuickFinance('Paid 250 for swiggy today', new Date('2024-04-10T08:00:00.000Z'));
    expect(result.amountDollars).toBe(250);
    expect(result.category).toBe('Food');
    expect(result.date).toBe('2024-04-10');
  });

  it('parses generic image text into transaction payload', () => {
    const transaction = parseTextToTransaction('Paid INR 300 to Uber on 2024-01-01', 'image');
    expect(transaction.amount).toBe(300);
    expect(transaction.category).toBe('Transport');
    expect(transaction.type).toBe('expense');
  });
});
