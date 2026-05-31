export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';



import { getStartDateFromTimeframe, Timeframe } from '@/lib/timeframe';



export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get('timeframe') as Timeframe) || '1M';
    const startDate = getStartDateFromTimeframe(timeframe);

    // Customers Ledger Tracking
    const customers = await prisma.customer.findMany({
      include: {
        ledgers: true, // Fetch ALL ledgers for accurate static pending amounts
        sales: {
          where: { date: { gte: startDate } }, // Filter sales volume by timeframe
          include: { items: true }
        }
      }
    });

    const enrichedCustomers = customers.map(c => {
      // Pending amount is STATIC (all time)
      const totalBilledAllTime = c.ledgers.filter(l => Number(l.amount) > 0).reduce((sum, l) => sum + Number(l.amount), 0);
      const totalPaidAllTime = c.ledgers.filter(l => Number(l.amount) < 0).reduce((sum, l) => sum + Math.abs(Number(l.amount)), 0);
      const pendingAmount = totalBilledAllTime - totalPaidAllTime;

      // Volume & Billed is DYNAMIC (based on timeframe)
      const totalTonsSold = c.sales.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + Number(item.qty), 0), 0);
      const totalBilledInTimeframe = c.sales.reduce((sum, s) => sum + Number(s.totalValue), 0);

      return {
        id: c.id,
        name: c.name,
        type: 'Customer',
        totalVolume: totalTonsSold,
        pendingAmount, // Static current balance
        totalBilled: totalBilledInTimeframe
      };
    });

    // Suppliers Ledger Tracking
    const suppliers = await prisma.supplier.findMany({
      include: {
        ledgers: true, // Fetch ALL ledgers for static pending amount
        purchases: {
          where: { date: { gte: startDate } } // Filter volume by timeframe
        }
      }
    });

    const enrichedSuppliers = suppliers.map(s => {
      // Pending amount is STATIC (all time)
      const totalInvoicedAllTime = s.ledgers.filter(l => Number(l.amount) > 0).reduce((sum, l) => sum + Number(l.amount), 0);
      const totalPaidAllTime = s.ledgers.filter(l => Number(l.amount) < 0).reduce((sum, l) => sum + Math.abs(Number(l.amount)), 0);
      const pendingAmount = totalInvoicedAllTime - totalPaidAllTime; // We owe them

      // Volume & Billed is DYNAMIC (based on timeframe)
      const totalTonsBought = s.purchases.reduce((sum, p) => sum + Number(p.qty), 0);
      const totalInvoicedInTimeframe = s.purchases.reduce((sum, p) => sum + Number(p.totalValue), 0);

      return {
        id: s.id,
        name: s.name,
        type: 'Supplier',
        totalVolume: totalTonsBought,
        pendingAmount, // Static current balance
        totalBilled: totalInvoicedInTimeframe
      };
    });

    return NextResponse.json({
      success: true,
      stakeholders: [...enrichedCustomers, ...enrichedSuppliers]
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
