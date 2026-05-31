export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role?.toLowerCase() !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const startOf30Days = startOfDay(subDays(today, 30));

    // 1. Core Financial Status (Static aggregates)
    const allCustomerLedgers = await prisma.customerLedger.aggregate({ where: { isDeleted: false },  _sum: { amount: true } });
    const totalReceivables = allCustomerLedgers._sum.amount || 0;

    const allSupplierLedgers = await prisma.supplierLedger.aggregate({ where: { isDeleted: false },  _sum: { amount: true } });
    const totalPayables = allSupplierLedgers._sum.amount || 0;
    const netAmount = Number(totalReceivables) - Number(totalPayables);

    // Cash In Hand Calculation:
    const tempCashInHandIn = await prisma.paymentRecord.aggregate({ where: { type: 'INCOMING' }, _sum: { amount: true } });
    const tempCashInHandOut = await prisma.paymentRecord.aggregate({ where: { type: 'OUTGOING' }, _sum: { amount: true } });
    const tempExpenses = await prisma.expense.aggregate({ where: { isDeleted: false, status: 'PAID' },  _sum: { amount: true } });
    const tempAdvances = await prisma.advance.aggregate({ _sum: { amount: true } });
    const tempRepayments = await prisma.advanceRepayment.aggregate({ _sum: { amount: true } });

    const totalCashIn = Number(tempCashInHandIn._sum.amount || 0) + Number(tempRepayments._sum.amount || 0);
    const totalCashOut = Number(tempCashInHandOut._sum.amount || 0) + Number(tempExpenses._sum.amount || 0) + Number(tempAdvances._sum.amount || 0);
    const cashInHand = totalCashIn - totalCashOut;

    // 2. Factory Operational Status
    const totalPurchasedObj = await prisma.purchase.aggregate({ where: { isDeleted: false },  _sum: { qty: true } });
    const totalProducedObj = await prisma.production.aggregate({ where: { isDeleted: false },  _sum: { rawCopperUsed: true } });
    const totalSoldRawObj = await prisma.saleItem.aggregate({ where: { sale: { isDeleted: false }, productCategory: 'Raw Copper Bundle' }, _sum: { qty: true }});
    const rawCopperStock = Number(totalPurchasedObj._sum.qty || 0) - (Number(totalProducedObj._sum.rawCopperUsed || 0) + Number(totalSoldRawObj._sum.qty || 0));

    // Production output today
    const productionToday = await prisma.production.aggregate({
      where: { isDeleted: false, date: { gte: startOfToday, lte: endOfToday } },
      _sum: { wireProduced: true }
    });

    // Yield ratio (Last 30 Days)
    const totalProd30Days = await prisma.production.aggregate({
      where: { isDeleted: false, date: { gte: startOf30Days, lte: endOfToday } },
      _sum: { rawCopperUsed: true, wireProduced: true }
    });
    const yieldPercent = totalProd30Days._sum.rawCopperUsed
      ? (Number(totalProd30Days._sum.wireProduced || 0) / Number(totalProd30Days._sum.rawCopperUsed)) * 100
      : 0;

    // 3. System Audits (Last 5 logs)
    const recentAudits = await prisma.auditLog.findMany({
      orderBy: { date: 'desc' },
      take: 5
    });

    return NextResponse.json({
      success: true,
      data: {
        financials: {
          totalReceivables,
          totalPayables,
          netAmount,
          cashInHand
        },
        operations: {
          rawCopperStock,
          productionToday: Number(productionToday._sum.wireProduced || 0),
          yield30Days: yieldPercent
        },
        recentAudits
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
