import { ManagerMarketPricePostSchema } from '@/lib/validations';
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';



export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = ManagerMarketPricePostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data", details: validation.error.format() }, { status: 400 });
    }
    const { price } = validation.data;

    const marketPrice = await prisma.marketPrice.create({
      data: {
        date: new Date(),
        price: price * 1000 // Convert KG to Ton
      }
    });

    return NextResponse.json({ success: true, marketPrice });
  } catch (error) {
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
