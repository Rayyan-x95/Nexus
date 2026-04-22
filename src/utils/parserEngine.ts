import {
  normalizeParseResult,
  parseTextToTransaction,
  type ParsedTransaction,
  type ParseResult,
} from '@/lib/core/parserEngine';

export type { ParsedTransaction, ParseResult };

export async function parseImage(file: File): Promise<ParseResult> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();

    if (!text || text.trim().length < 3) {
      return { transactions: [], errors: ['No readable text found in image'] };
    }

    const transaction = parseTextToTransaction(text, 'image');
    return normalizeParseResult({
      transactions: transaction.amount > 0 || transaction.merchant ? [transaction] : [],
      errors: [],
    });
  } catch (error) {
    console.error('[Parser] Image parsing failed:', error);
    return {
      transactions: [],
      errors: [error instanceof Error ? error.message : 'Failed to process image'],
    };
  }
}

export async function parsePDF(file: File): Promise<ParseResult> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const transactions: ParsedTransaction[] = [];
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
    }

    if (!fullText.trim()) {
      return { transactions: [], errors: ['No readable text found in PDF'] };
    }

    const transaction = parseTextToTransaction(fullText, 'pdf');
    if (transaction.amount > 0 || transaction.merchant) {
      transactions.push(transaction);
    }

    return normalizeParseResult({
      transactions,
      errors: transactions.length === 0 ? ['Could not extract transaction data'] : [],
    });
  } catch (error) {
    console.error('[Parser] PDF parsing failed:', error);
    return {
      transactions: [],
      errors: [error instanceof Error ? error.message : 'Failed to process PDF'],
    };
  }
}

export async function parseFile(file: File): Promise<ParseResult> {
  const fileType = file.type.toLowerCase();
  if (fileType.includes('image')) return parseImage(file);
  if (fileType.includes('pdf')) return parsePDF(file);
  return { transactions: [], errors: ['Unsupported file type'] };
}

export function parseText(text: string): ParseResult {
  const transaction = parseTextToTransaction(text, 'sms');
  return normalizeParseResult({ transactions: [transaction], errors: [] });
}
