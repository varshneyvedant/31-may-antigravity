import { Prisma } from '@prisma/client';

export interface JournalLineInput {
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  debit: number;
  credit: number;
}

export interface JournalEntryInput {
  description: string;
  referenceType?: 'SALE' | 'PURCHASE' | 'PAYMENT' | 'EXPENSE' | 'ADVANCE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  referenceId?: string;
  date?: Date;
  lines: JournalLineInput[];
}

/**
 * Centrally records a balanced Double-Entry Journal Entry inside a Prisma Transaction.
 * It strictly asserts that Total Debits equal Total Credits.
 */
export async function postJournalEntry(
  tx: Prisma.TransactionClient,
  entry: JournalEntryInput
) {
  const { description, referenceType, referenceId, date, lines } = entry;

  if (lines.length === 0) {
    throw new Error('Journal entry must have at least one transaction line item.');
  }

  // 1. Calculate and assert balanced accounting equation (Debits = Credits)
  const totalDebits = lines.reduce((sum, line) => sum + Number(line.debit), 0);
  const totalCredits = lines.reduce((sum, line) => sum + Number(line.credit), 0);

  // Allow for negligible rounding differences under 1 Paisa (0.01 INR)
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(
      `Double-Entry Bookkeeping Mismatch: Total Debits (₹${totalDebits.toFixed(
        2
      )}) must strictly equal Total Credits (₹${totalCredits.toFixed(2)}) for "${description}".`
    );
  }

  // 2. Insert the Journal Entry
  const journalEntry = await tx.journalEntry.create({
    data: {
      date: date || new Date(),
      description,
      referenceType,
      referenceId,
      lines: {
        create: lines.map((line) => ({
          accountName: line.accountName,
          accountType: line.accountType,
          debit: new Prisma.Decimal(line.debit.toFixed(2)),
          credit: new Prisma.Decimal(line.credit.toFixed(2)),
        })),
      },
    },
  });

  return journalEntry;
}
