import { ManagerPurchasePostSchema } from '@/lib/validations';
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/logger';

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

       await tx.purchase.update({ where: { id }, data: { isDeleted: true } });
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
  try {
    const body = await request.json();
    const validation = ManagerPurchasePostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data", details: validation.error.format() }, { status: 400 });
    }
    const { supplierId, qty, pricePerTon, date } = validation.data;

    const quantity = qty;
    const price = pricePerTon;
    const totalValue = quantity * price;

    if (quantity < 0.01 || price < 0.01) {
        return NextResponse.json({ error: 'it is too small quantity to do this transaction contact your developer' }, { status: 400 });
    }

    const recordDate = date ? new Date(date) : new Date();

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

      return purchase;
    });

    await logAudit({
      action: 'CREATE',
      module: 'Purchases',
      description: `Logged purchase from supplier ID ${supplierId} for ${quantity}T`,
      details: { id: result.id, quantity, price }
    });

    return NextResponse.json({ success: true, purchase: result });
  } catch (error) {
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
