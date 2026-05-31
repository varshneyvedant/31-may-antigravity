import { prisma } from '@/lib/prisma';
import { subDays, subMonths } from 'date-fns';

export async function getFIFOInventoryValue() {
  const batches = await prisma.inventoryBatch.findMany({
    where: { remainingQty: { gt: 0 } }
  });

  let remainingStockCost = 0;
  let remainingStockTons = 0;

  for (const batch of batches) {
    remainingStockTons += Number(batch.remainingQty);
    remainingStockCost += Number(batch.remainingQty) * Number(batch.pricePerTon);
  }

  // 3. Get current market price (most recent entry)
  const latestPrice = await prisma.marketPrice.findFirst({
    orderBy: { date: 'desc' }
  });

  const currentMarketPricePerTon = Number(latestPrice?.price || 0);
  const currentMarketValue = remainingStockTons * currentMarketPricePerTon;

  const netProfitLoss = currentMarketValue - remainingStockCost;

  return {
    remainingStockTons,
    fifoCost: remainingStockCost,
    currentMarketValue,
    currentMarketPricePerTon,
    netProfitLoss,
    isProfit: netProfitLoss >= 0
  };
}

export async function getLowStockAlert(remainingStockTons: number) {
  // Calculate average daily usage over the last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);
  const recentProduction = await prisma.production.aggregate({
    where: { isDeleted: false, date: { gte: thirtyDaysAgo } },
    _sum: { rawCopperUsed: true }
  });

  const recentRawSales = await prisma.saleItem.aggregate({
    where: {
       productCategory: 'Raw Copper Bundle',
       sale: { isDeleted: false, date: { gte: thirtyDaysAgo } }
    },
    _sum: { qty: true }
  });

  const usedLast30Days = Number(recentProduction._sum.rawCopperUsed || 0) + Number(recentRawSales._sum.qty || 0);
  const avgDailyUsage = usedLast30Days / 30;

  // If daily usage is 0 (no production recently), avoid division by zero
  if (avgDailyUsage === 0) return { alert: false, daysRemaining: null, message: 'No recent production data.' };

  const daysRemaining = remainingStockTons / avgDailyUsage;

  // Alert if less than 30 days remaining
  if (daysRemaining < 30) {
    return {
      alert: true,
      daysRemaining: Math.round(daysRemaining),
      message: `Critical: Only ${Math.round(daysRemaining)} days of raw copper remaining based on recent usage.`
    };
  }

  return {
    alert: false,
    daysRemaining: Math.round(daysRemaining),
    message: `Stock levels healthy (${Math.round(daysRemaining)} days remaining).`
  };
}
