import { ManagerPurchasePostSchema } from '@/lib/validations';
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/logger';
import { assertPeriodNotLocked } from '@/lib/periodLock';
import { postJournalEntry } from '@/lib/ledger/journal';
import { reconcileFIFOBook } from '@/lib/ledger/reconciliation';
import { checkIdempotency, completeIdempotency } from '@/lib/idempotency';

export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({ where: { isDeleted: false },
      orderBy: { date: 'desc' },
      take: 10,
      include: {
         supplier: { select: { name: true } }
      }
    });
    return NextResponse.json({ purchases });
  } catch (error) {
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    await prisma.$transaction(async (tx) => {
       const purchase = await tx.purchase.findUnique({ where: { id } });
       if (!purchase) throw new Error('Purchase not found');

       // Assert period not locked
       await assertPeriodNotLocked(purchase.date);

       // Remove corresponding ledger entries
       // Ledger description: `Purchase of ${quantity} Tons`
       await tx.supplierLedger.updateMany({
          where: {
             supplierId: purchase.supplierId,
             amount: purchase.totalValue,
             date: purchase.date
          },
          data: { isDeleted: true }
       });

       // Delete journal entries associated with this Purchase
       await tx.journalEntry.deleteMany({
          where: { referenceType: 'PURCHASE', referenceId: id }
       });

        await tx.purchase.update({ where: { id }, data: { isDeleted: true } });
        await reconcileFIFOBook(tx);
     });

    await logAudit({
        action: 'DELETE',
        module: 'Purchases',
        description: `Cancelled purchase ID ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let idempotencyKey: string | null = null;
  try {
    const body = await request.json();
    idempotencyKey = request.headers.get('x-idempotency-key') || body.idempotencyKey || null;

    if (idempotencyKey) {
      const idem = await checkIdempotency(idempotencyKey);
      if (idem) {
        if (idem.status === 'PROCESSING') {
          return NextResponse.json({ error: 'Transaction is already being processed, please wait.' }, { status: 409 });
        }
        return NextResponse.json(idem.response, { status: 200 });
      }
    }

    const validation = ManagerPurchasePostSchema.safeParse(body);
    if (!validation.success) {
      const errRes = { error: "Invalid data", details: validation.error.format() };
      if (idempotencyKey) await completeIdempotency(idempotencyKey, 'FAILED', errRes);
      return NextResponse.json(errRes, { status: 400 });
    }
    const { supplierId, qty, pricePerTon, date } = validation.data;

    const quantity = qty;
    const price = pricePerTon;
    const totalValue = quantity * price;

    if (quantity < 0.01 || price < 0.01) {
      const errRes = { error: 'it is too small quantity to do this transaction contact your developer' };
      if (idempotencyKey) await completeIdempotency(idempotencyKey, 'FAILED', errRes);
      return NextResponse.json(errRes, { status: 400 });
    }

    const recordDate = date ? new Date(date) : new Date();
    await assertPeriodNotLocked(recordDate);

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          supplierId,
          date: recordDate,
          qty: quantity,
          pricePerTon: price,
          totalValue
        }
      });

      // Create Inventory Batch for O(1) FIFO tracking
      await tx.inventoryBatch.create({
         data: {
            purchaseId: purchase.id,
            date: recordDate,
            initialQty: quantity,
            remainingQty: quantity,
            pricePerTon: price
         }
      });

      // Auto update supplier ledger
      await tx.supplierLedger.create({
        data: {
          supplierId,
          date: recordDate,
          amount: totalValue,
          description: `Purchase of ${quantity} Tons`
        }
      });

      // Post Double-Entry Journal Entry
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      const supplierName = supplier ? supplier.name : 'Supplier';

      await postJournalEntry(tx, {
        date: recordDate,
        description: `Raw Copper Purchase from ${supplierName} (ID: ${purchase.id})`,
        referenceType: 'PURCHASE',
        referenceId: purchase.id,
        lines: [
          { accountName: 'Inventory', accountType: 'ASSET' as const, debit: totalValue, credit: 0 },
          { accountName: 'Accounts Payable', accountType: 'LIABILITY' as const, debit: 0, credit: totalValue }
        ]
      });

      await reconcileFIFOBook(tx);
      return purchase;
    });

    await logAudit({
      action: 'CREATE',
      module: 'Purchases',
      description: `Logged purchase from supplier ID ${supplierId} for ${quantity}T`,
      details: { id: result.id, quantity, price }
    });

    const successResponse = { success: true, purchase: result };
    if (idempotencyKey) {
      await completeIdempotency(idempotencyKey, 'SUCCESS', successResponse);
    }
    return NextResponse.json(successResponse);
  } catch (error: any) {
    console.error(error);
    const errResponse = { error: error.message || 'Database transaction failed' };
    if (idempotencyKey) {
      await completeIdempotency(idempotencyKey, 'FAILED', errResponse);
    }
    return NextResponse.json(errResponse, { status: 500 });
  }
}
