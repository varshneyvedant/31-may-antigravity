export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const suppliers = await prisma.supplier.findMany();
    return NextResponse.json({ suppliers });
  } catch (error) {
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
