export type ParsedSmsExpenseType = 'expense';
export type ParsedSmsExpenseStatus = 'parsed' | 'partial' | 'manual';
export type ParsedSmsMissingField = 'amount' | 'merchant';

export interface ParsedSmsExpense {
  amount: number;
  merchant: string;
  date: Date;
  type: ParsedSmsExpenseType;
  category: string;
  rawText: string;
  missingFields: ParsedSmsMissingField[];
  status: ParsedSmsExpenseStatus;
}

const amountPatterns = [
  /(?:\u20b9|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i,
  /\b(?:paid|spent|debited|deducted|payment\s+of|purchase\s+of)\s*(?:\u20b9|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i,
];

const merchantPatterns = [
  /\bpaid\s+to\s+(.+?)(?:\s+via\b|\s+on\b|[.,;]|$)/i,
  /\bto\s+(.+?)\s+via\b/i,
  /\bat\s+(.+?)(?:\s+on\b|[.,;]|$)/i,
  /\bto\s+(.+?)(?:\s+on\b|[.,;]|$)/i,
];

const datePatterns = [
  /\bon\s+(\d{1,2}\s+[a-z]{3,9}(?:\s+\d{2,4})?)\b/i,
  /\b(\d{1,2}[-/\s](?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[-/\s]?\d{0,4})\b/i,
];

const monthIndexByName: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const categoryRules = [
  { category: 'Food', keywords: ['swiggy', 'zomato'] },
  { category: 'Transport', keywords: ['uber', 'ola'] },
  { category: 'Shopping', keywords: ['amazon'] },
];

export const smsExpenseCategories = ['Food', 'Transport', 'Shopping', 'Other'];

function createLocalNoonDate(year: number, month: number, day: number) {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseAmount(rawSms: string) {
  for (const pattern of amountPatterns) {
    const match = rawSms.match(pattern);
    const amount = Number(match?.[1]?.replace(/,/g, ''));

    if (Number.isFinite(amount) && amount > 0) {
      return amount;
    }
  }

  return 0;
}

function cleanMerchant(value: string) {
  return normalizeSpaces(value)
    .replace(/\b(?:upi|vpa|txn|transaction|ref|reference|id)\b.*$/i, '')
    .replace(/^[\s:.-]+|[\s:.-]+$/g, '')
    .trim();
}

function parseMerchant(rawSms: string) {
  const hasPaymentContext =
    /\b(?:paid|spent|debited|deducted|payment|purchase|transferred|sent)\b/i.test(rawSms) ||
    /(?:\u20b9|rs\.?|inr)\s*[\d,]+(?:\.\d+)?/i.test(rawSms);

  if (!hasPaymentContext) {
    return '';
  }

  for (const pattern of merchantPatterns) {
    const match = rawSms.match(pattern);
    const merchant = match?.[1] ? cleanMerchant(match[1]) : '';

    if (merchant) {
      return merchant;
    }
  }

  return '';
}

function parseMonth(value?: string) {
  if (!value) {
    return undefined;
  }

  return monthIndexByName[value.toLowerCase()];
}

function parseDateCandidate(candidate: string, referenceDate: Date) {
  const normalized = candidate.replace(/[-/]/g, ' ');
  const match = normalized.match(/\b(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{2,4}))?\b/i);

  if (!match) {
    return undefined;
  }

  const day = Number(match[1]);
  const month = parseMonth(match[2]);
  const parsedYear = match[3] ? Number(match[3]) : referenceDate.getFullYear();
  const year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;

  if (!Number.isInteger(day) || day < 1 || day > 31 || month === undefined) {
    return undefined;
  }

  const date = createLocalNoonDate(year, month, day);

  if (date.getMonth() !== month || date.getDate() !== day) {
    return undefined;
  }

  return date;
}

function parseDate(rawSms: string, referenceDate: Date) {
  for (const pattern of datePatterns) {
    const match = rawSms.match(pattern);
    const date = match?.[1] ? parseDateCandidate(match[1], referenceDate) : undefined;

    if (date) {
      return date;
    }
  }

  return new Date(referenceDate);
}

export function getSmsExpenseCategory(merchant: string, rawSms = '') {
  const haystack = `${merchant} ${rawSms}`.toLowerCase();
  const match = categoryRules.find((rule) =>
    rule.keywords.some((keyword) => haystack.includes(keyword)),
  );

  return match?.category ?? 'Other';
}

export function parseSmsExpense(rawSms: string, referenceDate = new Date()): ParsedSmsExpense {
  const normalizedSms = normalizeSpaces(rawSms);
  const amount = parseAmount(normalizedSms);
  const merchant = parseMerchant(normalizedSms);
  const date = parseDate(normalizedSms, referenceDate);
  const category = getSmsExpenseCategory(merchant, normalizedSms);
  const missingFields: ParsedSmsMissingField[] = [];

  if (!amount) {
    missingFields.push('amount');
  }

  if (!merchant) {
    missingFields.push('merchant');
  }

  const status: ParsedSmsExpenseStatus =
    missingFields.length === 0 ? 'parsed' : normalizedSms ? 'partial' : 'manual';

  return {
    amount,
    merchant,
    date,
    type: 'expense',
    category,
    rawText: rawSms,
    missingFields,
    status,
  };
}
