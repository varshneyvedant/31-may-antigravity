import { OwnerDirectoryPostSchema } from '@/lib/validations';
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';



export async function GET() {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ success: true, data: { customers, suppliers } });
  } catch (error) {
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = OwnerDirectoryPostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data", details: validation.error.format() }, { status: 400 });
    }
    const { action, type, id, data } = validation.data;

    if (action === 'CREATE') {
      if (type === 'CUSTOMER') {
        const c = await prisma.customer.create({ data });
        return NextResponse.json({ success: true, item: c });
      } else {
        const s = await prisma.supplier.create({ data });
        return NextResponse.json({ success: true, item: s });
      }
    } else if (action === 'UPDATE') {
      if (type === 'CUSTOMER') {
        const c = await prisma.customer.update({ where: { id }, data });
        return NextResponse.json({ success: true, item: c });
      } else {
        const s = await prisma.supplier.update({ where: { id }, data });
        return NextResponse.json({ success: true, item: s });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
