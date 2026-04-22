// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { getSmsExpenseCategory, parseSmsExpense } from './smsParser';

const referenceDate = new Date(2026, 3, 21, 9, 30, 0, 0);

describe('sms expense parser', () => {
  it('extracts a UPI payment amount, merchant, date, and food category', () => {
    const parsed = parseSmsExpense('Rs.250 paid to Swiggy via UPI on 12 Aug', referenceDate);

    expect(parsed).toMatchObject({
      amount: 250,
      merchant: 'Swiggy',
      type: 'expense',
      category: 'Food',
      status: 'parsed',
      missingFields: [],
    });
    expect(parsed.date.getFullYear()).toBe(2026);
    expect(parsed.date.getMonth()).toBe(7);
    expect(parsed.date.getDate()).toBe(12);
  });

  it('extracts bank SMS data with rupee symbols, comma amounts, and hyphenated dates', () => {
    const parsed = parseSmsExpense(
      'A/c XX123 debited by INR 1,250.50 at Amazon on 12-Aug-26. UPI Ref 123456.',
      referenceDate,
    );

    expect(parsed.amount).toBe(1250.5);
    expect(parsed.merchant).toBe('Amazon');
    expect(parsed.category).toBe('Shopping');
    expect(parsed.date.getFullYear()).toBe(2026);
    expect(parsed.date.getMonth()).toBe(7);
    expect(parsed.date.getDate()).toBe(12);
  });

  it('falls back to the current date and manual fields when random text cannot be parsed', () => {
    const parsed = parseSmsExpense('remember to check bank offers later', referenceDate);

    expect(parsed.amount).toBe(0);
    expect(parsed.merchant).toBe('');
    expect(parsed.category).toBe('Other');
    expect(parsed.status).toBe('partial');
    expect(parsed.missingFields).toEqual(['amount', 'merchant']);
    expect(parsed.date).toEqual(referenceDate);
  });

  it('maps merchants using lightweight category rules', () => {
    expect(getSmsExpenseCategory('Zomato')).toBe('Food');
    expect(getSmsExpenseCategory('Uber')).toBe('Transport');
    expect(getSmsExpenseCategory('Unknown Merchant')).toBe('Other');
  });
});
