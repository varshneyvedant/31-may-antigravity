export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/logger';
import { assertPeriodNotLocked } from '@/lib/periodLock';
import { postJournalEntry } from '@/lib/ledger/journal';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const creditNotes = await prisma.creditNote.findMany({
      orderBy: { date: 'desc' },
      include: {
        sale: {
          include: { customer: true }
        }
      }
    });
    return NextResponse.json({ creditNotes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Database transaction failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { saleId, qtyReturned, amountCredited, reason } = body;

    if (!saleId || Number(qtyReturned) <= 0 || Number(amountCredited) <= 0) {
      return NextResponse.json({ error: 'Invalid returns input parameters' }, { status: 400 });
    }

    // Period Lock Check
    await assertPeriodNotLocked(new Date());

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { customer: true }
      });

      if (!sale) throw new Error('Invoice Sale not found');
      if (sale.isDeleted) throw new Error('Cannot process returns on cancelled invoice');

      // Create Credit Note
      const creditNote = await tx.creditNote.create({
        data: {
          saleId,
          qtyReturned: new Prisma.Decimal(Number(qtyReturned)),
          amountCredited: new Prisma.Decimal(Number(amountCredited)),
          reason
        }
      });

      // Issue customer ledger adjustment: -amountCredited reduces their net accounts receivable balance
      await tx.customerLedger.create({
        data: {
          customerId: sale.customerId,
          date: new Date(),
          amount: -Number(amountCredited),
          description: `Credit Note Issued (Sales Return) - Record ID: ${creditNote.id}`
        }
      });

      // Post Double-Entry Journal Entry
      await postJournalEntry(tx, {
        date: new Date(),
        description: `Credit Note: Sales Return from ${sale.customer.name} (ID: ${creditNote.id})`,
        referenceType: 'CREDIT_NOTE',
        referenceId: creditNote.id,
        lines: [
          { accountName: 'Sales Revenue', accountType: 'REVENUE' as const, debit: Number(amountCredited), credit: 0 },
          { accountName: 'Accounts Receivable', accountType: 'ASSET' as const, debit: 0, credit: Number(amountCredited) }
        ]
      });

      return creditNote;
    });

    await logAudit({
      action: 'CREATE',
      module: 'CreditNote',
      description: `Issued Sales Return Credit Note of ₹${amountCredited} for Sale ID ${saleId}`,
      details: { saleId, qtyReturned, amountCredited, reason }
    });

    return NextResponse.json({ success: true, creditNote: result });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Database transaction failed' }, { status: 500 });
  }
}
