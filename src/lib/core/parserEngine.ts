import { parseSmsExpense } from '@/utils/smsParser';

export interface ParsedTransaction {
  amount: number;
  merchant: string;
  date: Date;
  type: 'expense' | 'income';
  category: string;
  rawText: string;
  source: 'sms' | 'image' | 'pdf';
  confidence: 'high' | 'medium' | 'low';
  missingFields: string[];
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  errors: string[];
}

export interface QuickFinanceParseResult {
  amountDollars: number;
  type: 'expense' | 'income';
  category: string;
  date?: string;
  note?: string;
}

const amountPatterns = [
  /(?:\u20b9|rs\.?|inr|\$|€)\s*([\d,]+(?:\.\d+)?)/i,
  /\b(?:paid|spent|debited|deducted|payment\s+of|purchase\s+of|total)\s*(?:\u20b9|rs\.?|inr|\$|€)?\s*([\d,]+(?:\.\d+)?)/i,
  /(?:^|\s)([\d,]+(?:\.\d{2})?)\s*(?:\u20b9|rs|inr)/i,
];

const merchantPatterns = [
  /\bpaid\s+to\s+(.+?)(?:\s+via\b|\s+on\b|[.,;]|$)/i,
  /\bto\s+(.+?)\s+via\b/i,
  /\bat\s+(.+?)(?:\s+on\b|[.,;]|$)/i,
  /\b(?:merchant|store|shop)[:\s]+(.+?)(?:\n|$)/i,
  /\b(?:thank\s+you\s+for\s+shopping\s+at|your\s+purchase\s+from)[:\s]+(.+?)(?:\n|$)/i,
];

const datePatterns = [
  /\bon\s+(\d{1,2}\s+[a-z]{3,9}(?:\s+\d{2,4})?)\b/i,
  /\b(\d{1,2}[-/\s](?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[-/\s]?\d{0,4})\b/i,
  /(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  /(\d{4}-\d{2}-\d{2})/i,
];

const categoryRules = [
  { category: 'Food', keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'starbucks', 'mcdonald', 'kfc', 'pizza', 'burger'] },
  { category: 'Transport', keywords: ['uber', 'ola', 'taxi', 'metro', 'rail', 'fuel', 'petrol', 'parking'] },
  { category: 'Shopping', keywords: ['amazon', 'flipkart', 'myntra', 'walmart', 'target', 'mall', 'store'] },
  { category: 'Entertainment', keywords: ['netflix', 'spotify', 'cinema', 'movie', 'theater', 'game', 'steam'] },
  { category: 'Utilities', keywords: ['electricity', 'water', 'gas', 'internet', 'phone', 'mobile', 'bill'] },
  { category: 'Healthcare', keywords: ['pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'medicine'] },
  { category: 'Groceries', keywords: ['grocery', 'supermarket', 'mart', 'fresh', 'vegetable', 'fruit'] },
];

const incomeKeywords = ['salary', 'income', 'bonus', 'received', 'plus', 'dividend'];

const categoriesMap: Record<string, string[]> = {
  Food: ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'groceries', 'dinner', 'lunch', 'breakfast'],
  Travel: ['uber', 'ola', 'rapido', 'fuel', 'petrol', 'flight', 'train', 'bus', 'travel'],
  Rent: ['rent', 'maintenance'],
  Utilities: ['electricity', 'water', 'internet', 'recharge', 'bill'],
  Study: ['book', 'course', 'fees', 'tuition'],
  Personal: ['shopping', 'clothes', 'gym', 'health'],
  Entertainment: ['movie', 'netflix', 'prime', 'game', 'party'],
};

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function parseAmountFromText(text: string): number {
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const amount = Number.parseFloat(match[1].replace(/,/g, ''));
    if (Number.isFinite(amount) && amount > 0) {
      return amount;
    }
  }

  return 0;
}

function parseMerchantFromText(text: string): string {
  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (!match || !match[1]) continue;

    const merchant = match[1]
      .replace(/[\s:.-]+$/, '')
      .replace(/^[\s:.-]+/, '')
      .trim();

    if (merchant.length > 1) {
      return merchant;
    }
  }

  return '';
}

function parseDateFromText(text: string, referenceDate = new Date()): Date {
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const parsed = new Date(match[1]);
    if (Number.isFinite(parsed.getTime())) {
      return parsed;
    }
  }

  return referenceDate;
}

function categorizeTransaction(merchant: string, text: string): string {
  const haystack = `${merchant} ${text}`.toLowerCase();
  const match = categoryRules.find((rule) =>
    rule.keywords.some((keyword) => haystack.includes(keyword)),
  );
  return match?.category ?? 'Other';
}

export function parseTextToTransaction(
  text: string,
  source: 'sms' | 'image' | 'pdf',
): ParsedTransaction {
  const normalizedText = normalizeText(text);

  if (source === 'sms') {
    const smsResult = parseSmsExpense(text);
    return {
      amount: smsResult.amount,
      merchant: smsResult.merchant,
      date: smsResult.date,
      type: 'expense',
      category: smsResult.category,
      rawText: text,
      source: 'sms',
      confidence: smsResult.status === 'parsed' ? 'high' : 'medium',
      missingFields: smsResult.missingFields,
    };
  }

  const amount = parseAmountFromText(normalizedText);
  const merchant = parseMerchantFromText(normalizedText);
  const date = parseDateFromText(normalizedText);
  const category = categorizeTransaction(merchant, normalizedText);

  const missingFields: string[] = [];
  if (amount <= 0) missingFields.push('amount');
  if (!merchant) missingFields.push('merchant');

  const confidence = amount > 0 && merchant ? 'high' : amount > 0 || merchant ? 'medium' : 'low';

  return {
    amount,
    merchant,
    date,
    type: 'expense',
    category,
    rawText: text,
    source,
    confidence,
    missingFields,
  };
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseQuickFinance(input: string, now = new Date()): QuickFinanceParseResult {
  const lower = input.toLowerCase();
  let amountDollars = 0;
  let type: 'expense' | 'income' = 'expense';
  let category = 'Uncategorized';
  let date: string | undefined;

  const amountMatch = input.match(/[₹$€]?\s*(\d+(\.\d+)?)/);
  if (amountMatch) {
    const parsed = Number.parseFloat(amountMatch[1]);
    amountDollars = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  if (incomeKeywords.some((keyword) => lower.includes(keyword))) {
    type = 'income';
  }

  for (const [mappedCategory, keywords] of Object.entries(categoriesMap)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      category = mappedCategory;
      break;
    }
  }

  if (lower.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    date = toIsoDate(tomorrow);
  } else if (lower.includes('today')) {
    date = toIsoDate(now);
  }

  return {
    amountDollars,
    type,
    category,
    date,
    note: input.length > 120 ? `${input.slice(0, 120)}...` : input,
  };
}

export function normalizeParseResult(result: ParseResult): ParseResult {
  const transactions = result.transactions.filter((transaction) => {
    return Number.isFinite(transaction.amount) && transaction.amount >= 0;
  });

  return {
    transactions,
    errors: [...result.errors],
  };
}
