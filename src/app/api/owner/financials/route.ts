export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';


import { format, startOfDay, endOfDay, eachDayOfInterval, eachMonthOfInterval, eachYearOfInterval, isSameMonth, isSameYear, startOfMonth, startOfYear } from 'date-fns';


import { getStartDateFromTimeframe, Timeframe } from '@/lib/timeframe';



export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get('timeframe') as Timeframe) || '1M';
    const startDate = getStartDateFromTimeframe(timeframe);
    const endDate = new Date();

    // 1. Expense Breakdown (Pie Chart) - Unchanged, just uses timeframe
    const expenses = await prisma.expense.groupBy({
      by: ['category'],
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    });
    const expenseData = expenses.map(e => ({
      name: e.category,
      value: Number(e._sum.amount || 0)
    }));

    // Calculate Global Net Amount (STATIC, not filtered by timeframe)
    // IMPORTANT: Customer Ledger is positive when they owe us (Invoice), negative when they pay us.
    // Supplier Ledger is positive when we owe them (Invoice), negative when we pay them.
    const allCustomerLedgers = await prisma.customerLedger.aggregate({ where: { isDeleted: false },  _sum: { amount: true } });
    const totalReceivables = allCustomerLedgers._sum.amount || 0;

    const allSupplierLedgers = await prisma.supplierLedger.aggregate({ where: { isDeleted: false },  _sum: { amount: true } });
    const totalPayables = allSupplierLedgers._sum.amount || 0;

    // Global net position strictly means: Receivables - Payables
    const netAmount = Number(totalReceivables) - Number(totalPayables);

    // Cash In Hand Calculation:
    // + All INCOMING PaymentRecords (Customer Payments, Scrap Sales, Initial Capital)
    // - All OUTGOING PaymentRecords (Supplier Payments)
    // - All PAID Factory Expenses
    // - All Salary Advances
    // + All Salary Advance Repayments
    const tempCashInHandIn = await prisma.paymentRecord.aggregate({ where: { type: 'INCOMING' }, _sum: { amount: true } });
    const tempCashInHandOut = await prisma.paymentRecord.aggregate({ where: { type: 'OUTGOING' }, _sum: { amount: true } });
    const tempExpenses = await prisma.expense.aggregate({ where: { isDeleted: false, status: 'PAID' },  _sum: { amount: true } });
    const tempAdvances = await prisma.advance.aggregate({ _sum: { amount: true } });
    const tempRepayments = await prisma.advanceRepayment.aggregate({ _sum: { amount: true } });

    const totalCashIn = Number(tempCashInHandIn._sum.amount || 0) + Number(tempRepayments._sum.amount || 0);
    const totalCashOut = Number(tempCashInHandOut._sum.amount || 0) + Number(tempExpenses._sum.amount || 0) + Number(tempAdvances._sum.amount || 0);
    const currentCashInHand = totalCashIn - totalCashOut;

    const cashInHand = currentCashInHand;

    // Production Yield %
    const totalProd = await prisma.production.aggregate({
      where: { isDeleted: false, date: { gte: startDate, lte: endDate } },
      _sum: { rawCopperUsed: true, wireProduced: true }
    });
    const yieldPercent = totalProd._sum.rawCopperUsed
      ? (Number(totalProd._sum.wireProduced || 0) / Number(totalProd._sum.rawCopperUsed)) * 100
      : 0;

    // 2. Dynamic Revenue vs Expenses Graph
    // Determine interval type based on timeframe
    let intervals: Date[] = [];
    let formatStr = '';
    let isDay = false, isMonth = false, isYear = false;

    if (['1W', '1M'].includes(timeframe)) {
       intervals = eachDayOfInterval({ start: startDate, end: endDate });
       formatStr = 'dd MMM';
       isDay = true;
    } else if (['3M', '6M', '1Y', 'FY'].includes(timeframe)) {
       intervals = eachMonthOfInterval({ start: startDate, end: endDate });
       formatStr = 'MMM yyyy';
       isMonth = true;
    } else { // 3Y, 5Y, 10Y, ALL
       // Limit 'ALL' to the first recorded date to prevent massive loops
       let finalStart = startDate;
       if (timeframe === 'ALL') {
          const firstSale = await prisma.sale.findFirst({ orderBy: { date: 'asc' }});
          finalStart = firstSale ? firstSale.date : new Date(new Date().getFullYear() - 3, 0, 1);
       }
       intervals = eachYearOfInterval({ start: finalStart, end: endDate });
       formatStr = 'yyyy';
       isYear = true;
    }

    const dynamicData = [];

    // Fetch all raw data within timeframe once to avoid N+1 queries
    const salesRaw = await prisma.sale.findMany({
        where: { isDeleted: false, date: { gte: startDate, lte: endDate } },
        include: { items: true }
    });
    const expRaw = await prisma.expense.findMany({ where: { isDeleted: false, date: { gte: startDate, lte: endDate } } });
    const marketPricesRaw = await prisma.marketPrice.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'asc' }
    });
    const scrapSalesRaw = await prisma.scrapInventory.findMany({
        where: { isDeleted: false, type: 'SOLD', date: { gte: startDate, lte: endDate } }
    });

    for (const intervalDate of intervals) {
       let s = 0, e = 0;

       let items: any[] = [];

       if (isDay) {
          const matchingSales = salesRaw.filter(x => startOfDay(x.date).getTime() === startOfDay(intervalDate).getTime());
          const matchingScrap = scrapSalesRaw.filter(x => startOfDay(x.date).getTime() === startOfDay(intervalDate).getTime());
          
          s = matchingSales.reduce((sum, x) => sum + Number(x.totalValue), 0) + matchingScrap.reduce((sum, x) => sum + Number(x.revenue), 0);
          e = expRaw.filter(x => startOfDay(x.date).getTime() === startOfDay(intervalDate).getTime()).reduce((sum, x) => sum + Number(x.amount), 0);
          items = matchingSales.flatMap(ms => ms.items);
       } else if (isMonth) {
          const matchingSales = salesRaw.filter(x => isSameMonth(x.date, intervalDate));
          const matchingScrap = scrapSalesRaw.filter(x => isSameMonth(x.date, intervalDate));

          s = matchingSales.reduce((sum, x) => sum + Number(x.totalValue), 0) + matchingScrap.reduce((sum, x) => sum + Number(x.revenue), 0);
          e = expRaw.filter(x => isSameMonth(x.date, intervalDate)).reduce((sum, x) => sum + Number(x.amount), 0);
          items = matchingSales.flatMap(ms => ms.items);
       } else if (isYear) {
          const matchingSales = salesRaw.filter(x => isSameYear(x.date, intervalDate));
          const matchingScrap = scrapSalesRaw.filter(x => isSameYear(x.date, intervalDate));

          s = matchingSales.reduce((sum, x) => sum + Number(x.totalValue), 0) + matchingScrap.reduce((sum, x) => sum + Number(x.revenue), 0);
          e = expRaw.filter(x => isSameYear(x.date, intervalDate)).reduce((sum, x) => sum + Number(x.amount), 0);
          items = matchingSales.flatMap(ms => ms.items);
       }

       // Calculate Gross Profit EXACTLY for this period
       // Revenue - (Sum of each item's qty * rawCopperCostAtSale)
       let periodCogs = 0;
       items.forEach((item: any) => {
           periodCogs += (Number(item.qty) * item.rawCopperCostAtSale);
       });
       const grossProfit = s - periodCogs;

       // Get average market price for this interval
       let avgMarketPrice = 0;
       let matchingPrices: any[] = [];
       if (isDay) matchingPrices = marketPricesRaw.filter(x => startOfDay(x.date).getTime() === startOfDay(intervalDate).getTime());
       else if (isMonth) matchingPrices = marketPricesRaw.filter(x => isSameMonth(x.date, intervalDate));
       else if (isYear) matchingPrices = marketPricesRaw.filter(x => isSameYear(x.date, intervalDate));

       if (matchingPrices.length > 0) {
           const sum = matchingPrices.reduce((acc, p) => acc + Number(p.price), 0);
           avgMarketPrice = sum / matchingPrices.length;
       }

       dynamicData.push({
         period: format(intervalDate, formatStr),
         Revenue: s,
         Expenses: e,
         GrossProfit: grossProfit,
         NetProfit: grossProfit - e,
         CopperPrice: avgMarketPrice
       });
    }

    // Totals for summary cards
    const totalTimeframeRevenue = dynamicData.reduce((acc, curr) => acc + curr.Revenue, 0);
    const totalTimeframeGross = dynamicData.reduce((acc, curr) => acc + curr.GrossProfit, 0);
    const pureExpenses = expRaw.reduce((sum, x) => sum + Number(x.amount), 0);
    // Net profit = Gross profit (which is Revenue - COGS) - Operating Expenses
    const totalTimeframeNet = totalTimeframeGross - pureExpenses;

    // Timeframe total Tons sold
    const allItemsInTimeframe = salesRaw.flatMap(s => s.items);
    const totalTonsSold = allItemsInTimeframe.reduce((sum, i) => sum + Number(i.qty), 0);
    const avgProfitPerTon = totalTonsSold > 0 ? (totalTimeframeNet / totalTonsSold) : 0;

    // Global Payment Analytics (Sales)
    const paidSales = await prisma.sale.findMany({
      where: {
        isDeleted: false,
        fullyPaidDate: { not: null }
      },
      select: {
        date: true,
        fullyPaidDate: true
      }
    });

    let customerAvgDays = 0;
    let customerSlowestDays = 0;
    const customerCompleted = paidSales.length;

    if (customerCompleted > 0) {
      let totalCustomerWaitMs = 0;
      paidSales.forEach(s => {
        const waitMs = new Date(s.fullyPaidDate!).getTime() - new Date(s.date).getTime();
        const waitDays = waitMs / (1000 * 60 * 60 * 24);
        totalCustomerWaitMs += waitMs;
        if (waitDays > customerSlowestDays) {
          customerSlowestDays = waitDays;
        }
      });
      customerAvgDays = (totalCustomerWaitMs / customerCompleted) / (1000 * 60 * 60 * 24);
    }

    // Global Payment Analytics (Purchases)
    const paidPurchases = await prisma.purchase.findMany({
      where: {
        isDeleted: false,
        fullyPaidDate: { not: null }
      },
      select: {
        date: true,
        fullyPaidDate: true
      }
    });

    let supplierAvgDays = 0;
    let supplierSlowestDays = 0;
    const supplierCompleted = paidPurchases.length;

    if (supplierCompleted > 0) {
      let totalSupplierWaitMs = 0;
      paidPurchases.forEach(p => {
        const waitMs = new Date(p.fullyPaidDate!).getTime() - new Date(p.date).getTime();
        const waitDays = waitMs / (1000 * 60 * 60 * 24);
        totalSupplierWaitMs += waitMs;
        if (waitDays > supplierSlowestDays) {
          supplierSlowestDays = waitDays;
        }
      });
      supplierAvgDays = (totalSupplierWaitMs / supplierCompleted) / (1000 * 60 * 60 * 24);
    }

    // 3. Predictive Scrap & Raw Copper Inventory Optimization Calculations
    const totalPurchasedObj = await prisma.purchase.aggregate({ where: { isDeleted: false },  _sum: { qty: true } });
    const totalProducedObj = await prisma.production.aggregate({ where: { isDeleted: false },  _sum: { rawCopperUsed: true } });
    const totalSoldRawObj = await prisma.saleItem.aggregate({ where: { sale: { isDeleted: false }, productCategory: 'Raw Copper Bundle' }, _sum: { qty: true }});
    
    const rawCopperStock = Number(totalPurchasedObj._sum.qty || 0) - (Number(totalProducedObj._sum.rawCopperUsed || 0) + Number(totalSoldRawObj._sum.qty || 0));

    const diffDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const timeframeCopperUsed = (await prisma.production.aggregate({
      where: { isDeleted: false, date: { gte: startDate, lte: endDate } },
      _sum: { rawCopperUsed: true }
    }))._sum.rawCopperUsed || 0;

    const avgDailyConsumption = Number(timeframeCopperUsed) / diffDays;
    const daysRemaining = avgDailyConsumption > 0 ? (rawCopperStock / avgDailyConsumption) : 999;

    let reorderUrgency = 'NORMAL';
    let recommendedReorderQty = 0;
    if (daysRemaining < 5) {
      reorderUrgency = 'CRITICAL';
      recommendedReorderQty = Math.max(15, avgDailyConsumption * 15);
    } else if (daysRemaining < 10) {
      reorderUrgency = 'WARNING';
      recommendedReorderQty = Math.max(10, avgDailyConsumption * 10);
    }

    const scrapStats = await prisma.production.aggregate({
      where: { isDeleted: false },
      _sum: { rawCopperUsed: true, scrapGenerated: true }
    });
    const scrapRatio = scrapStats._sum.rawCopperUsed ? (Number(scrapStats._sum.scrapGenerated || 0) / Number(scrapStats._sum.rawCopperUsed)) : 0.05;
    const predictedScrapTons = rawCopperStock * scrapRatio;

    const lastScrapSales = await prisma.scrapInventory.findMany({
      where: { isDeleted: false, type: 'SOLD' },
      take: 5,
      orderBy: { date: 'desc' }
    });
    const avgScrapPrice = lastScrapSales.length > 0 
      ? (lastScrapSales.reduce((sum, s) => sum + Number(s.revenue), 0) / lastScrapSales.reduce((sum, s) => sum + Number(s.qty), 0))
      : 450000;
    const predictedScrapValue = predictedScrapTons * avgScrapPrice;

    // P&L Calculations (Timeframe-based)
    const plLines = await prisma.journalLine.groupBy({
      by: ['accountName', 'accountType'],
      where: {
        journalEntry: {
          date: { gte: startDate, lte: endDate }
        }
      },
      _sum: { debit: true, credit: true }
    });

    const getPLAmount = (name: string, type: string) => {
      const line = plLines.find(l => l.accountName === name);
      if (!line) return 0;
      const dr = Number(line._sum.debit || 0);
      const cr = Number(line._sum.credit || 0);
      return type === 'REVENUE' ? (cr - dr) : (dr - cr);
    };

    const plSalesRevenue = getPLAmount('Sales Revenue', 'REVENUE');
    // Sum standard scrap accounts
    const plScrapRevenue = getPLAmount('Scrap Sales', 'REVENUE') || getPLAmount('Scrap Revenue', 'REVENUE') || 0;
    const plTotalRevenue = plSalesRevenue + plScrapRevenue;

    const plCogs = getPLAmount('Cost of Goods Sold', 'EXPENSE');
    const plGrossProfit = plTotalRevenue - plCogs;

    const plFactoryExpenses = getPLAmount('Factory Expenses', 'EXPENSE');
    const plNetProfit = plGrossProfit - plFactoryExpenses;

    // Balance Sheet Calculations (From inception to endDate)
    const bsLines = await prisma.journalLine.groupBy({
      by: ['accountName', 'accountType'],
      where: {
        journalEntry: {
          date: { lte: endDate }
        }
      },
      _sum: { debit: true, credit: true }
    });

    const getBSAmount = (name: string, type: string) => {
      const line = bsLines.find(l => l.accountName === name);
      if (!line) return 0;
      const dr = Number(line._sum.debit || 0);
      const cr = Number(line._sum.credit || 0);
      return type === 'ASSET' ? (dr - cr) : (cr - dr);
    };

    const bsCashBank = getBSAmount('Cash & Bank', 'ASSET');
    const bsAR = getBSAmount('Accounts Receivable', 'ASSET');
    const bsInventory = getBSAmount('Inventory', 'ASSET');
    const bsAdvances = getBSAmount('Employee Advances', 'ASSET');
    const bsTotalAssets = bsCashBank + bsAR + bsInventory + bsAdvances;

    const bsAP = getBSAmount('Accounts Payable', 'LIABILITY');
    const bsTotalLiabilities = bsAP;
    const bsEquity = bsTotalAssets - bsTotalLiabilities;

    return NextResponse.json({
      success: true,
      data: {
        financialStatements: {
          pl: {
            salesRevenue: plSalesRevenue,
            scrapRevenue: plScrapRevenue,
            totalRevenue: plTotalRevenue,
            cogs: plCogs,
            grossProfit: plGrossProfit,
            operatingExpenses: plFactoryExpenses,
            netProfit: plNetProfit
          },
          bs: {
            cashBank: bsCashBank,
            accountsReceivable: bsAR,
            inventory: bsInventory,
            employeeAdvances: bsAdvances,
            totalAssets: bsTotalAssets,
            accountsPayable: bsAP,
            totalLiabilities: bsTotalLiabilities,
            retainedEarnings: bsEquity
          }
        },
        expenseBreakdown: expenseData,
        monthlyTrends: dynamicData, // Re-used same key for frontend compatibility
        overallYield: yieldPercent,
        netAmount,
        totalReceivables,
        totalPayables,
        cashInHand,
        timeframe,
        inventoryOptimization: {
          rawCopperStock,
          daysRemaining: daysRemaining > 900 ? '99+' : Number(daysRemaining).toFixed(1),
          reorderUrgency,
          recommendedReorderQty: Number(recommendedReorderQty).toFixed(1),
          predictedScrapTons: Number(predictedScrapTons).toFixed(2),
          predictedScrapValue: Number(predictedScrapValue)
        },
        paymentAnalytics: {
          customers: {
            avgDays: customerAvgDays,
            slowestDays: customerSlowestDays,
            completedOrders: customerCompleted
          },
          suppliers: {
            avgDays: supplierAvgDays,
            slowestDays: supplierSlowestDays,
            completedOrders: supplierCompleted
          }
        },
        metrics: {
           totalRevenue: totalTimeframeRevenue,
           totalGrossProfit: totalTimeframeGross,
           totalNetProfit: totalTimeframeNet,
           totalExpenses: pureExpenses,
           avgProfitPerTon
        }
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
