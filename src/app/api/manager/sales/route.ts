import { ManagerSalesPostSchema } from '@/lib/validations';
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';


import { getFIFOInventoryValue } from '@/lib/analytics/inventory';
import { logAudit } from '@/lib/audit/logger';
import { assertPeriodNotLocked } from '@/lib/periodLock';
import { postJournalEntry } from '@/lib/ledger/journal';

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({ where: { isDeleted: false },
      orderBy: { date: 'desc' },
      take: 10,
      include: {
         customer: { select: { name: true, contact: true, transport: true } },
         items: true
      }
    });
    return NextResponse.json({ sales });
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
       const sale = await tx.sale.findUnique({ where: { id } });
       if (!sale) throw new Error('Sale not found');

       // Assert period is not locked before deleting
       await assertPeriodNotLocked(sale.date);

       // Remove corresponding ledger entries
       await tx.customerLedger.updateMany({
          where: { description: { startsWith: `Invoice Sale ID: ${id}` } },
          data: { isDeleted: true }
       });

       // Delete journal entries associated with this Sale
       await tx.journalEntry.deleteMany({
          where: { referenceType: 'SALE', referenceId: id }
       });

       await tx.sale.update({ where: { id }, data: { isDeleted: true } });
    });

    await logAudit({
        action: 'DELETE',
        module: 'Sales',
        description: `Cancelled sale ID ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Database transaction failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = ManagerSalesPostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data", details: validation.error.format() }, { status: 400 });
    }
    const { customerId, date, items } = validation.data;

    const recordDate = date ? new Date(date) : new Date();
    await assertPeriodNotLocked(recordDate);

    const result = await prisma.$transaction(async (tx) => {
      // Validate minimums and stock availability inside the transaction to prevent TOCTOU
      let grandTotal = 0;
      const saleItemsData = [];

      for (const item of items) {
          const qty = Number(item.qty);
          const pricePerTon = (Number(item.pricePerKg) || 0) * 1000;
          const totalValue = qty * pricePerTon;
          grandTotal += totalValue;

          if (qty < 0.01 || pricePerTon < 0.01) {
              throw new Error('it is too small quantity to do this transaction contact your developer');
          }

          let itemCogsPerTon = 0;

          if (item.productCategory === 'Raw Copper Bundle') {
              // Deduct from InventoryBatch (FIFO)
              let remainingToDeduct = qty;

              // PostgreSQL Pessimistic Lock: block concurrent double deductions of raw inventory
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
              let deductedTons = 0;

              for (const batch of batches) {
                  if (remainingToDeduct <= 0) break;
                  const availableInBatch = Number(batch.remainingQty);
                  const deductAmount = Math.min(availableInBatch, remainingToDeduct);
                  
                  totalRawCost += deductAmount * Number(batch.pricePerTon);
                  deductedTons += deductAmount;

                  await tx.inventoryBatch.update({
                      where: { id: batch.id },
                      data: { remainingQty: availableInBatch - deductAmount }
                  });
                  remainingToDeduct -= deductAmount;
              }

              if (remainingToDeduct > 0.001) {
                  throw new Error(`Not enough Raw Copper Bundle in stock. Short by: ${remainingToDeduct.toFixed(2)} Tons`);
              }

              itemCogsPerTon = deductedTons > 0 ? (totalRawCost / deductedTons) : 0;

          } else {
              // Check manufactured wire availability in FinishedGoodsBatch (FIFO)
              let remainingToDeduct = qty;

              // PostgreSQL Pessimistic Lock: block concurrent double deductions of finished wire stock for this specific type
              const finishedBatchesToLock = await tx.finishedGoodsBatch.findMany({
                  where: { 
                      remainingQty: { gt: 0 },
                      productCategory: item.productCategory,
                      brand: item.brand || null,
                      wireType: item.wireType || ''
                  },
                  orderBy: { date: 'asc' }
              });
              const finishedBatchIds = finishedBatchesToLock.map(b => b.id);
              if (finishedBatchIds.length > 0) {
                  await tx.$executeRaw`SELECT id FROM "FinishedGoodsBatch" WHERE id = ANY(${finishedBatchIds}) FOR UPDATE`;
              }

              const batches = await tx.finishedGoodsBatch.findMany({
                  where: { 
                      remainingQty: { gt: 0 },
                      productCategory: item.productCategory,
                      brand: item.brand || null,
                      wireType: item.wireType || ''
                  },
                  orderBy: { date: 'asc' }
              });

              let totalWireCost = 0;
              let deductedTons = 0;

              for (const batch of batches) {
                  if (remainingToDeduct <= 0) break;
                  const availableInBatch = Number(batch.remainingQty);
                  const deductAmount = Math.min(availableInBatch, remainingToDeduct);
                  
                  totalWireCost += deductAmount * Number(batch.costPerTon);
                  deductedTons += deductAmount;

                  await tx.finishedGoodsBatch.update({
                      where: { id: batch.id },
                      data: { remainingQty: availableInBatch - deductAmount }
                  });
                  remainingToDeduct -= deductAmount;
              }

              if (remainingToDeduct > 0.001) {
                  throw new Error(`Not enough ${item.brand || ''} ${item.wireType || ''} ${item.productCategory} in stock. Short by: ${remainingToDeduct.toFixed(2)} Tons`);
              }

              itemCogsPerTon = deductedTons > 0 ? (totalWireCost / deductedTons) : 0;
          }

          saleItemsData.push({
              productCategory: item.productCategory,
              brand: item.brand || null,
              wireType: item.wireType || null,
              qty: qty,
              pricePerTon: pricePerTon,
              totalValue: totalValue,
              rawCopperCostAtSale: itemCogsPerTon
          });
      }

      const sale = await tx.sale.create({
        data: {
          customerId,
          date: recordDate,
          totalValue: grandTotal,
          items: {
            create: saleItemsData
          }
        }
      });

      await tx.customerLedger.create({
        data: {
          customerId,
          date: recordDate,
          amount: grandTotal,
          description: `Invoice Sale ID: ${sale.id} (${items.length} items)`
        }
      });

      // Post Double-Entry Journal Entry
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      const customerName = customer ? customer.name : 'Customer';

      const totalCogs = saleItemsData.reduce((sum, item) => sum + (Number(item.qty) * Number(item.rawCopperCostAtSale)), 0);

      const journalLines: { accountName: string; accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'; debit: number; credit: number; }[] = [
        { accountName: 'Accounts Receivable', accountType: 'ASSET', debit: grandTotal, credit: 0 },
        { accountName: 'Sales Revenue', accountType: 'REVENUE', debit: 0, credit: grandTotal }
      ];

      if (totalCogs > 0) {
        journalLines.push(
          { accountName: 'Cost of Goods Sold', accountType: 'EXPENSE' as const, debit: totalCogs, credit: 0 },
          { accountName: 'Inventory', accountType: 'ASSET' as const, debit: 0, credit: totalCogs }
        );
      }

      await postJournalEntry(tx, {
        date: recordDate,
        description: `Invoice Sale to ${customerName} (ID: ${sale.id})`,
        referenceType: 'SALE',
        referenceId: sale.id,
        lines: journalLines
      });

      return sale;
    });

    await logAudit({
      action: 'CREATE',
      module: 'Sales',
      description: `Created sale for customer ID ${customerId}`,
      details: { id: result.id, items }
    });

    return NextResponse.json({ success: true, sale: result });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Database transaction failed' }, { status: 500 });
  }
}
