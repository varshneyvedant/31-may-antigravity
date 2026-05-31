import { ManagerExpensePostSchema } from '@/lib/validations';
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/logger';



export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = ManagerExpensePostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data", details: validation.error.format() }, { status: 400 });
    }
    const { category, amount, description, expenseMonth, date } = validation.data;

    const recordDate = date ? new Date(date) : new Date();

    const expense = await prisma.expense.create({
      data: {
        date: recordDate,
        category,
        amount: amount,
        description,
        expenseMonth
      }
    });

    await logAudit({
      action: 'CREATE',
      module: 'Expense',
      description: `Logged factory expense of ₹${amount} in category '${category}'`,
      details: { id: expense.id, category, amount, description, expenseMonth }
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
