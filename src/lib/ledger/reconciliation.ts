import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * World-class FIFO Cost Rebalancer.
 * Atomic, isolated recalculation of all raw copper and finished wire inventory batches,
 * sales COGS cost stamps, and associated ledger journal entries since inception.
 */
export async function reconcileFIFOBook(tx: Prisma.TransactionClient) {
  // 1. Reset all raw copper batches to full capacity
  const purchases = await tx.purchase.findMany({
    where: { isDeleted: false },
    orderBy: { date: 'asc' }
  });

  for (const p of purchases) {
    await tx.inventoryBatch.updateMany({
      where: { purchaseId: p.id },
      data: { remainingQty: p.qty }
    });
  }

  // 2. Reset all finished wire batches to full capacity
  const productions = await tx.production.findMany({
    where: { isDeleted: false },
    orderBy: { date: 'asc' }
  });

  for (const prod of productions) {
    await tx.finishedGoodsBatch.updateMany({
      where: { productionId: prod.id },
      data: { remainingQty: prod.wireProduced }
    });
  }

  // 3. Compile all events sorted strictly chronologically to replay the exact timeline
  const sales = await tx.sale.findMany({
    where: { isDeleted: false },
    orderBy: { date: 'asc' },
    include: { items: true }
  });

  const timeline: { type: 'PRODUCTION' | 'SALE'; date: number; record: any }[] = [];
  productions.forEach(p => timeline.push({ type: 'PRODUCTION', date: new Date(p.date).getTime(), record: p }));
  sales.forEach(s => timeline.push({ type: 'SALE', date: new Date(s.date).getTime(), record: s }));

  // Sort timeline chronologically
  timeline.sort((a, b) => a.date - b.date);

  // 4. Replay the timeline sequentially
  for (const event of timeline) {
    if (event.type === 'PRODUCTION') {
      const prod = event.record;
      const qtyToDeduct = Number(prod.rawCopperUsed);

      // Deduct raw copper FIFO
      const activeBatches = await tx.inventoryBatch.findMany({
        where: { remainingQty: { gt: 0 } },
        orderBy: { date: 'asc' }
      });

      let remainingToDeduct = qtyToDeduct;
      let totalRawCost = 0;

      for (const batch of activeBatches) {
        if (remainingToDeduct <= 0) break;
        const available = Number(batch.remainingQty);
        const deductAmount = Math.min(available, remainingToDeduct);

        totalRawCost += deductAmount * Number(batch.pricePerTon);
        
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: { remainingQty: Math.max(0, available - deductAmount) }
        });
        remainingToDeduct -= deductAmount;
      }

      const calculatedCostPerTon = qtyToDeduct > 0 ? (totalRawCost / qtyToDeduct) : 0;

      // Update the finished goods batch cost stamp dynamically!
      await tx.finishedGoodsBatch.updateMany({
        where: { productionId: prod.id },
        data: { costPerTon: calculatedCostPerTon }
      });

      // Update associated Production General Ledger entries
      const journalEntry = await tx.journalEntry.findFirst({
        where: { referenceType: 'PRODUCTION', referenceId: prod.id },
        include: { lines: true }
      });

      if (journalEntry) {
        const materialValue = qtyToDeduct * calculatedCostPerTon;
        // In production: Dr Inventory Finished Wires, Cr Inventory Raw Copper
        for (const line of journalEntry.lines) {
          if (line.accountName === 'Inventory') {
            await tx.journalLine.update({
              where: { id: line.id },
              data: {
                debit: line.debit.greaterThan(0) ? materialValue : 0,
                credit: line.credit.greaterThan(0) ? materialValue : 0
              }
            });
          }
        }
      }

    } else {
      // Event: SALE
      const sale = event.record;
      let saleTotalCogs = 0;

      for (const item of sale.items) {
        const qty = Number(item.qty);

        if (item.productCategory === 'Raw Copper Bundle') {
          // Deduct from raw inventory (FIFO)
          const activeBatches = await tx.inventoryBatch.findMany({
            where: { remainingQty: { gt: 0 } },
            orderBy: { date: 'asc' }
          });

          let remainingToDeduct = qty;
          let totalRawCost = 0;

          for (const batch of activeBatches) {
            if (remainingToDeduct <= 0) break;
            const available = Number(batch.remainingQty);
            const deductAmount = Math.min(available, remainingToDeduct);

            totalRawCost += deductAmount * Number(batch.pricePerTon);

            await tx.inventoryBatch.update({
              where: { id: batch.id },
              data: { remainingQty: Math.max(0, available - deductAmount) }
            });
            remainingToDeduct -= deductAmount;
          }

          const calculatedCogsPerTon = qty > 0 ? (totalRawCost / qty) : 0;
          saleTotalCogs += qty * calculatedCogsPerTon;

          await tx.saleItem.update({
            where: { id: item.id },
            data: { rawCopperCostAtSale: calculatedCogsPerTon }
          });

        } else {
          // Deduct from manufactured wire finished goods batches (FIFO)
          const activeFinished = await tx.finishedGoodsBatch.findMany({
            where: {
              remainingQty: { gt: 0 },
              productCategory: item.productCategory,
              brand: item.brand,
              wireType: item.wireType
            },
            orderBy: { date: 'asc' }
          });

          let remainingToDeduct = qty;
          let totalWireCost = 0;

          for (const batch of activeFinished) {
            if (remainingToDeduct <= 0) break;
            const available = Number(batch.remainingQty);
            const deductAmount = Math.min(available, remainingToDeduct);

            totalWireCost += deductAmount * Number(batch.costPerTon);

            await tx.finishedGoodsBatch.update({
              where: { id: batch.id },
              data: { remainingQty: Math.max(0, available - deductAmount) }
            });
            remainingToDeduct -= deductAmount;
          }

          const calculatedCogsPerTon = qty > 0 ? (totalWireCost / qty) : 0;
          saleTotalCogs += qty * calculatedCogsPerTon;

          await tx.saleItem.update({
            where: { id: item.id },
            data: { rawCopperCostAtSale: calculatedCogsPerTon }
          });
        }
      }

      // Update associated Sale General Ledger Journal Entry COGS/Inventory lines
      const journalEntry = await tx.journalEntry.findFirst({
        where: { referenceType: 'SALE', referenceId: sale.id },
        include: { lines: true }
      });

      if (journalEntry) {
        for (const line of journalEntry.lines) {
          if (line.accountName === 'Cost of Goods Sold') {
            await tx.journalLine.update({
              where: { id: line.id },
              data: { debit: saleTotalCogs }
            });
          } else if (line.accountName === 'Inventory' && line.credit.greaterThan(0)) {
            await tx.journalLine.update({
              where: { id: line.id },
              data: { credit: saleTotalCogs }
            });
          }
        }
      }
    }
  }
}
