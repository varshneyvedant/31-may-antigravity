import { ManagerPaymentPostSchema } from '@/lib/validations';
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/logger';



export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = ManagerPaymentPostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid data", details: validation.error.format() }, { status: 400 });
    }
    const { type, stakeholderId, amount, idempotencyKey } = body;
    const paymentAmount = amount;

    if (idempotencyKey) {
        const existingPayment = await prisma.paymentRecord.findUnique({ where: { idempotencyKey } });
        if (existingPayment) {
            return NextResponse.json({ success: true, message: 'Payment already processed' });
        }
    }

    await prisma.$transaction(async (tx) => {
      if (type === 'INCOMING') {
        const paymentRecord = await tx.paymentRecord.create({
           data: {
             date: new Date(),
             amount: paymentAmount,
             type: "INCOMING",
             customerId: stakeholderId,
             idempotencyKey: idempotencyKey || undefined,
             description: 'Lump-sum Payment from Customer'
           }
        });

        const allSales = await tx.sale.findMany({
          where: { isDeleted: false, customerId: stakeholderId },
          orderBy: { date: 'asc' }
        });
        const unpaidSales = allSales.filter(s => Number(s.amountPaid) < Number(s.totalValue));

        let remainingPayment = paymentAmount;

        for (const sale of unpaidSales) {
          if (remainingPayment <= 0) break;

          const due = Number(sale.totalValue) - Number(sale.amountPaid);
          const payToThisInvoice = Math.min(due, remainingPayment);

          const newAmountPaid = Number(sale.amountPaid) + payToThisInvoice;
          await tx.sale.update({
             where: { id: sale.id },
             data: {
                 amountPaid: newAmountPaid,
                 fullyPaidDate: newAmountPaid >= Number(sale.totalValue) ? new Date() : null
             }
          });

          await tx.invoicePayment.create({
             data: {
                 paymentRecordId: paymentRecord.id,
                 saleId: sale.id,
                 amountApplied: payToThisInvoice
             }
          });

          remainingPayment -= payToThisInvoice;
        }

        if (remainingPayment > 0) {
           await tx.customer.update({
              where: { id: stakeholderId },
              data: { creditBalance: { increment: remainingPayment } }
           });
        }

        await tx.customerLedger.create({
          data: {
            customerId: stakeholderId,
            date: new Date(),
            amount: -paymentAmount,
            description: `Payment Received (Record ID: ${paymentRecord.id})`
          }
        });

      } else if (type === 'OUTGOING') {
        const paymentRecord = await tx.paymentRecord.create({
           data: {
             date: new Date(),
             amount: paymentAmount,
             type: "OUTGOING",
             supplierId: stakeholderId,
             idempotencyKey: idempotencyKey || undefined,
             description: 'Lump-sum Payment to Supplier'
           }
        });

        const allPurchases = await tx.purchase.findMany({
          where: { isDeleted: false, supplierId: stakeholderId },
          orderBy: { date: 'asc' }
        });
        const unpaidPurchases = allPurchases.filter(p => Number(p.amountPaid) < Number(p.totalValue));

        let remainingPayment = paymentAmount;

        for (const purchase of unpaidPurchases) {
          if (remainingPayment <= 0) break;

          const due = Number(purchase.totalValue) - Number(purchase.amountPaid);
          const payToThisInvoice = Math.min(due, remainingPayment);

          const newAmountPaid = Number(purchase.amountPaid) + payToThisInvoice;
          await tx.purchase.update({
             where: { id: purchase.id },
             data: {
                 amountPaid: newAmountPaid,
                 fullyPaidDate: newAmountPaid >= Number(purchase.totalValue) ? new Date() : null
             }
          });

          await tx.billPayment.create({
             data: {
                 paymentRecordId: paymentRecord.id,
                 purchaseId: purchase.id,
                 amountApplied: payToThisInvoice
             }
          });

          remainingPayment -= payToThisInvoice;
        }

        if (remainingPayment > 0) {
           await tx.supplier.update({
              where: { id: stakeholderId },
              data: { creditBalance: { increment: remainingPayment } }
           });
        }

        await tx.supplierLedger.create({
          data: {
            supplierId: stakeholderId,
            date: new Date(),
            amount: -paymentAmount,
            description: `Payment Sent (Record ID: ${paymentRecord.id})`
          }
        });
      } else {
        throw new Error('Invalid type');
      }
    });

    await logAudit({
      action: 'CREATE',
      module: 'Payment',
      description: `Logged stakeholder payment of ₹${paymentAmount} (${type === 'INCOMING' ? 'Customer Paid Us' : 'We Paid Supplier'})`,
      details: { type, stakeholderId, amount: paymentAmount }
    });

    return NextResponse.json({ success: true });

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
  }
}
