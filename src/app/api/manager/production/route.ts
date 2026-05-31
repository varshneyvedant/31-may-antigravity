import { ManagerProductionPostSchema } from '@/lib/validations';
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/logger';

export async function GET() {
  try {
    const productions = await prisma.production.findMany({ where: { isDeleted: false },
      orderBy: { date: 'desc' },
      take: 10
    });
    return NextResponse.json({ productions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Database transaction failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    await prisma.$transaction(async (tx) => {
       const production = await tx.production.findUnique({ where: { id } });
       if (!production) throw new Error('Production not found');

       // Remove corresponding scrap generated entry
       await tx.scrapInventory.updateMany({
          where: {
             qty: production.scrapGenerated,
             date: production.date,
             type: 'GENERATED'
          },
          data: { isDeleted: true }
       });

       await tx.production.update({ where: { id }, data: { isDeleted: true } });
    });

    await logAudit({
      action: 'DELETE',
      module: 'Production',
      description: `Undid production ID ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Database transaction failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = ManagerProductionPostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data", details: validation.error.format() }, { status: 400 });
    }
    const { rawCopperUsed, productCategory, brand, wireType, wireProduced, date } = validation.data;

    const parsedRaw = rawCopperUsed;
    const parsedProduced = wireProduced;

    if (parsedRaw < 0.01 || parsedProduced < 0.01) {
        return NextResponse.json({ error: 'it is too small quantity to do this transaction contact your developer' }, { status: 400 });
    }

    if (parsedProduced > parsedRaw) {
        return NextResponse.json({ error: 'Finished wire produced cannot be greater than raw copper used.' }, { status: 400 });
    }

    const recordDate = date ? new Date(date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Check available stock inside transaction by summing active batches (ensures consistency with green display box)
      const activeBatches = await tx.inventoryBatch.findMany({
          where: { remainingQty: { gt: 0 } }
      });
      const availableStock = activeBatches.reduce((sum, b) => sum + Number(b.remainingQty), 0);

      if (parsedRaw > availableStock) {
          throw new Error(`Not enough raw copper stock. Available: ${availableStock.toFixed(2)} Tons`);
      }

      // Deduct from InventoryBatch (FIFO) and calculate exact cost
      let remainingToDeduct = parsedRaw;

      // PostgreSQL Pessimistic Lock: Prevent any concurrent transaction from reading or deducting these batches until this commits.
      // Instead of locking the whole table, we lock only the active raw copper batches to avoid timeout/deadlocks
      const rawBatchesToLock = await tx.inventoryBatch.findMany({
          where: { remainingQty: { gt: 0 } },
          orderBy: { date: 'asc' }
      });
      const rawBatchIds = rawBatchesToLock.map(b => b.id);
      if (rawBatchIds.length > 0) {
          await tx.$executeRaw`SELECT id FROM "InventoryBatch" WHERE id = ANY(${rawBatchIds}) FOR UPDATE`;
      }

      const batches = await tx.inventoryBatch.findMany({
          where: { remainingQty: { gt: 0 } },
          orderBy: { date: 'asc' }
      });

      let totalRawCost = 0;

      for (const batch of batches) {
          if (remainingToDeduct <= 0) break;
          const availableInBatch = Number(batch.remainingQty);
          const deductAmount = Math.min(availableInBatch, remainingToDeduct);
          
          totalRawCost += deductAmount * Number(batch.pricePerTon);

          await tx.inventoryBatch.update({
              where: { id: batch.id },
              data: { remainingQty: availableInBatch - deductAmount }
          });
          remainingToDeduct -= deductAmount;
      }

      // Cost per ton of finished wire = Total Raw Cost / Wire Produced (factors in scrap loss)
      const costPerTonFinished = parsedProduced > 0 ? (totalRawCost / parsedProduced) : 0;

      const production = await tx.production.create({
        data: {
          date: recordDate,
          rawCopperUsed: parsedRaw,
          productCategory,
          brand: brand || null,
          wireType: wireType || '',
          wireProduced: parsedProduced,
          scrapGenerated: parsedRaw - parsedProduced,
          finishedGoodsBatch: {
             create: {
                date: recordDate,
                productCategory,
                brand: brand || null,
                wireType: wireType || '',
                initialQty: parsedProduced,
                remainingQty: parsedProduced,
                costPerTon: costPerTonFinished
             }
          }
        }
      });

      await tx.scrapInventory.create({
         data: {
            date: recordDate,
            type: 'GENERATED',
            qty: parsedRaw - parsedProduced
         }
      });

      return production;
    });

    await logAudit({
      action: 'CREATE',
      module: 'Production',
      description: `Logged production of ${parsedProduced}T ${productCategory}`,
      details: { id: result.id, rawCopperUsed, wireProduced, productCategory, brand, wireType }
    });

    return NextResponse.json({ success: true, production: result });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Database transaction failed' }, { status: 500 });
  }
}
