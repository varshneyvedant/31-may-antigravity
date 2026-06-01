export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/logger';
import { assertPeriodNotLocked } from '@/lib/periodLock';
import { postJournalEntry } from '@/lib/ledger/journal';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const debitNotes = await prisma.debitNote.findMany({
      orderBy: { date: 'desc' },
      include: {
        purchase: {
          include: { supplier: true }
        }
      }
    });
    return NextResponse.json({ debitNotes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Database transaction failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { purchaseId, qtyReturned, amountDebited, reason } = body;

    if (!purchaseId || Number(qtyReturned) <= 0 || Number(amountDebited) <= 0) {
      return NextResponse.json({ error: 'Invalid returns input parameters' }, { status: 400 });
    }

    // Period Lock Check
    await assertPeriodNotLocked(new Date());

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { supplier: true }
      });

      if (!purchase) throw new Error('Raw copper purchase bill not found');
      if (purchase.isDeleted) throw new Error('Cannot process returns on cancelled purchase');

      // Create Debit Note
      const debitNote = await tx.debitNote.create({
        data: {
          purchaseId,
          qtyReturned: new Prisma.Decimal(Number(qtyReturned)),
          amountDebited: new Prisma.Decimal(Number(amountDebited)),
          reason
        }
      });

      // Issue supplier ledger adjustment: -amountDebited reduces our outstanding accounts payable liability
      await tx.supplierLedger.create({
        data: {
          supplierId: purchase.supplierId,
          date: new Date(),
          amount: -Number(amountDebited),
          description: `Debit Note Issued (Supplier Return) - Record ID: ${debitNote.id}`
        }
      });

      // Post Double-Entry Journal Entry
      await postJournalEntry(tx, {
        date: new Date(),
        description: `Debit Note: Supplier Return to ${purchase.supplier.name} (ID: ${debitNote.id})`,
        referenceType: 'DEBIT_NOTE',
        referenceId: debitNote.id,
        lines: [
          { accountName: 'Accounts Payable', accountType: 'LIABILITY' as const, debit: Number(amountDebited), credit: 0 },
          { accountName: 'Inventory', accountType: 'ASSET' as const, debit: 0, credit: Number(amountDebited) }
        ]
      });

      return debitNote;
    });

    await logAudit({
      action: 'CREATE',
      module: 'DebitNote',
      description: `Issued Purchase Return Debit Note of ₹${amountDebited} for Purchase ID ${purchaseId}`,
      details: { purchaseId, qtyReturned, amountDebited, reason }
    });

    return NextResponse.json({ success: true, debitNote: result });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Database transaction failed' }, { status: 500 });
  }
}
