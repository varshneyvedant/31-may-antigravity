export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export async function GET() {
  try {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const startOfWeek = startOfDay(subDays(today, 7));
    const startOf30Days = startOfDay(subDays(today, 30));

    // 1. Raw Copper Stock Level (Always current total balance)
    const totalPurchasedObj = await prisma.purchase.aggregate({ where: { isDeleted: false },  _sum: { qty: true } });
    const totalProducedObj = await prisma.production.aggregate({ where: { isDeleted: false },  _sum: { rawCopperUsed: true } });
    const totalSoldRawObj = await prisma.saleItem.aggregate({ where: { sale: { isDeleted: false }, productCategory: 'Raw Copper Bundle' }, _sum: { qty: true }});
    const rawCopperStock = Number(totalPurchasedObj._sum.qty || 0) - (Number(totalProducedObj._sum.rawCopperUsed || 0) + Number(totalSoldRawObj._sum.qty || 0));

    // 2. Production Metrics ( CC Wires, Submersible Winding Wires)
    const productionToday = await prisma.production.aggregate({
      where: { isDeleted: false, date: { gte: startOfToday, lte: endOfToday } },
      _sum: { wireProduced: true }
    });

    const productionWeek = await prisma.production.aggregate({
      where: { isDeleted: false, date: { gte: startOfWeek, lte: endOfToday } },
      _sum: { wireProduced: true }
    });

    // 3. Attendance Metrics
    const activeWorkers = await prisma.employee.count({ where: { role: { not: 'Manager' } } });
    const attendanceToday = await prisma.attendance.findMany({
      where: { date: { gte: startOfToday, lte: endOfToday } }
    });
    
    const presentCount = attendanceToday.filter(a => a.status === 'Present').length;
    const absentCount = attendanceToday.filter(a => a.status === 'Absent').length;
    const halfDayCount = attendanceToday.filter(a => a.status === 'Half_day').length;

    // 4. Production Yield % (Last 30 Days)
    const totalProd30Days = await prisma.production.aggregate({
      where: { isDeleted: false, date: { gte: startOf30Days, lte: endOfToday } },
      _sum: { rawCopperUsed: true, wireProduced: true }
    });
    const yieldPercent = totalProd30Days._sum.rawCopperUsed
      ? (Number(totalProd30Days._sum.wireProduced || 0) / Number(totalProd30Days._sum.rawCopperUsed)) * 100
      : 0;

    // 5. Recent Production Runs (Limit 5)
    const recentProductions = await prisma.production.findMany({
      where: { isDeleted: false },
      orderBy: { date: 'desc' },
      take: 5
    });

    return NextResponse.json({
      success: true,
      data: {
        rawCopperStock,
        productionToday: Number(productionToday._sum.wireProduced || 0),
        productionWeek: Number(productionWeek._sum.wireProduced || 0),
        attendance: {
          total: activeWorkers,
          present: presentCount,
          absent: absentCount,
          halfDay: halfDayCount,
          logged: attendanceToday.length > 0
        },
        yield30Days: yieldPercent,
        recentProductions
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
