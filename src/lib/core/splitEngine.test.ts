import { describe, expect, it } from 'vitest';
import {
  applySettlement,
  computeSettlements,
  splitEqual,
  splitWeighted,
  validateSplitShares,
} from './splitEngine';

describe('splitEngine', () => {
  it('splits equally with deterministic remainder distribution', () => {
    const result = splitEqual(100, [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(result).toEqual([
      { id: 'a', amount: 34 },
      { id: 'b', amount: 33 },
      { id: 'c', amount: 33 },
    ]);
    expect(validateSplitShares(100, result)).toBe(true);
  });

  it('splits weighted and preserves total', () => {
    const result = splitWeighted(100, [
      { id: 'a', weight: 3 },
      { id: 'b', weight: 1 },
    ]);
    expect(result[0].amount + result[1].amount).toBe(100);
    expect(result[0].amount).toBeGreaterThan(result[1].amount);
  });

  it('computes settlements and applies them', () => {
    const balances = [
      { id: 'alice', balance: 500 },
      { id: 'bob', balance: -300 },
      { id: 'carol', balance: -200 },
    ];

    const settlements = computeSettlements(balances);
    expect(settlements.length).toBeGreaterThan(0);

    const final = settlements.reduce((accumulator, settlement) => applySettlement(accumulator, settlement), balances);
    expect(final.every((entry) => entry.balance === 0)).toBe(true);
  });
});
