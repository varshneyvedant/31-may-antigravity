import { OwnerScrapPostSchema } from '@/lib/validations';
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStartDateFromTimeframe, Timeframe } from '@/lib/timeframe';
import { logAudit } from '@/lib/audit/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get('timeframe') as Timeframe) || '1M';
    const startDate = getStartDateFromTimeframe(timeframe);

    // Get current total holding of scrap (All-Time)
    const allScrap = await prisma.scrapInventory.findMany({ where: { isDeleted: false } });
    let currentHolding = 0;
    allScrap.forEach(s => {
       if (s.type === "GENERATED") currentHolding += Number(s.qty);
       if (s.type === "SOLD") currentHolding -= Number(s.qty);
    });

    // Get timeframe specific data
    const timeframeScrap = await prisma.scrapInventory.findMany({
       where: { isDeleted: false, date: { gte: startDate } },
       orderBy: { date: 'desc' }
    });

    let generatedInTimeframe = 0;
    let soldInTimeframe = 0;
    let revenueInTimeframe = 0;

    const history = timeframeScrap.map(s => {
       if (s.type === "GENERATED") generatedInTimeframe += Number(s.qty);
       if (s.type === "SOLD") {
          soldInTimeframe += Number(s.qty);
          revenueInTimeframe += Number(s.revenue);
       }
       return {
          id: s.id,
          date: s.date,
          type: s.type,
          qty: s.qty,
          revenue: s.revenue
       };
    });

    return NextResponse.json({
      success: true,
      data: {
        currentHolding: Math.max(0, currentHolding),
        generatedInTimeframe,
        soldInTimeframe,
        revenueInTimeframe,
        history
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = OwnerScrapPostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data", details: validation.error.format() }, { status: 400 });
    }
    const { type, qty, revenue, date } = validation.data;

    const parsedQty = qty;
    const parsedRev = revenue;

    const result = await prisma.$transaction(async (tx) => {
      const scrapSale = await tx.scrapInventory.create({
        data: {
          type: "SOLD",
          qty: parsedQty,
          revenue: parsedRev
        }
      });

      await tx.paymentRecord.create({
        data: {
           date: new Date(),
           amount: parsedRev,
           type: 'INCOMING',
           description: `Sale of Scrap Copper (${parsedQty} Tons)`
        }
      });

      return scrapSale;
    });

    await logAudit({
      action: 'CREATE',
      module: 'Scrap',
      description: `Logged scrap copper sale of ${parsedQty} Tons for ₹${parsedRev}`,
      details: { id: result.id, qty: parsedQty, revenue: parsedRev }
    });

    return NextResponse.json({ success: true, scrapSale: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
