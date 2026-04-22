import {
  parseQuickFinance as parseQuickFinanceCore,
  type QuickFinanceParseResult as ParsedTransaction,
} from '@/lib/core/parserEngine';

export type { ParsedTransaction };

export function parseQuickFinance(input: string): ParsedTransaction {
  return parseQuickFinanceCore(input);
}
