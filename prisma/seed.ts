import { PrismaClient } from '@prisma/client';
import { subDays, subMonths, startOfYear } from 'date-fns';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with updated schema...');

  // 1. Clear existing data
  await prisma.user.deleteMany();
  await prisma.customerLedger.deleteMany();
  await prisma.supplierLedger.deleteMany();
  await prisma.marketPrice.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.scrapInventory.deleteMany();
  await prisma.production.deleteMany();
  await prisma.inventoryBatch.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.advanceRepayment.deleteMany();
  await prisma.advance.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.salaryHistory.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.paymentRecord.deleteMany();

  // 1.1 Initial Capital Injection
  await prisma.paymentRecord.create({
     data: {
       date: subDays(new Date(), 1095), // 3 years ago
       amount: 3000000000, // 300 Crore initial investment
       type: "INCOMING",
       description: 'Initial Capital Injection'
     }
  });

  // 1.5 Add Admin Users
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.create({
    data: { username: 'owner', password: passwordHash, role: "OWNER" }
  });
  await prisma.user.create({
    data: { username: 'manager', password: passwordHash, role: "MANAGER" }
  });
  console.log('Added secure User accounts (password123)');

  // 2. Add Employees & Salary History
  const emp1 = await prisma.employee.create({
    data: { name: 'Ramesh Singh', role: 'Worker', baseSalary: 25000 },
  });
  const emp2 = await prisma.employee.create({
    data: { name: 'Suresh Kumar', role: 'Worker', baseSalary: 28000 },
  });
  const emp3 = await prisma.employee.create({
    data: { name: 'Amit Patel', role: 'Manager', baseSalary: 55000 },
  });

  const today = new Date();

  // Add historical salaries
  await prisma.salaryHistory.create({ data: { employeeId: emp1.id, date: subMonths(today, 12), amount: 20000, reason: 'Joining' } });
  await prisma.salaryHistory.create({ data: { employeeId: emp1.id, date: subMonths(today, 6), amount: 25000, reason: 'Performance' } });

  await prisma.salaryHistory.create({ data: { employeeId: emp2.id, date: subMonths(today, 15), amount: 22000, reason: 'Joining' } });
  await prisma.salaryHistory.create({ data: { employeeId: emp2.id, date: subMonths(today, 4), amount: 28000, reason: 'Annual Appraisal' } });

  console.log('Added employees and salary history');

  // 3. Add Suppliers & Customers with extended details
  const supplier1 = await prisma.supplier.create({
    data: {
      name: 'Global Copper Ltd',
      contact: '9876543210',
      address: '123 Industrial Area, Phase 1, Mumbai',
      gst: '27AABCU9603R1ZM',
      bankDetails: 'HDFC Bank, Acct: 50100200300400, IFSC: HDFC0001234'
    }
  });
  const supplier2 = await prisma.supplier.create({
    data: {
      name: 'National Metals',
      contact: '9876543211',
      address: '45 Metal Park, Delhi',
      gst: '07BBDCU9603R1ZN',
      bankDetails: 'SBI Bank, Acct: 30200200300401, IFSC: SBIN0001235'
    }
  });

  const customer1 = await prisma.customer.create({
    data: {
      name: 'ABC Cables',
      contact: '9123456780',
      address: 'Plot 88, Tech Hub, Pune',
      gst: '27XABCU9603R1ZP',
      transport: 'Fast Track Logistics'
    }
  });
  const customer2 = await prisma.customer.create({
    data: {
      name: 'XYZ Electronics',
      contact: '9123456781',
      address: 'Sector 5, Electronics City, Bangalore',
      gst: '29YABCU9603R1ZQ',
      transport: 'Safe Express'
    }
  });

  console.log('Added suppliers and customers');

  // 4. Generate Historical Data spanning ~3 years (To test long timeframes)

  // Market Prices (Daily for last 1000 days)
  // COPPER PRICE: ~12 Lakh per Ton (12,000,000)
  for (let i = 0; i < 1000; i++) {
    const d = subDays(today, i);
    const randomPrice = 1180000 + Math.random() * 50000;
    await prisma.marketPrice.create({
      data: { date: d, price: randomPrice }
    });
  }

  console.log('Added market prices');

  // Purchases (Every ~10 days over 3 years = ~100 purchases)
  // We need to ensure we buy more than we produce so FIFO logic doesn't hit zero remaining stock
  for (let i = 0; i < 110; i++) {
    const d = subDays(today, i * 10);
    const qty = 15 + Math.random() * 10; // 15 to 25 Tons
    const pricePerTon = 1190000 + Math.random() * 30000;
    const supplier = i % 2 === 0 ? supplier1 : supplier2;
    const totalValue = qty * pricePerTon;

    // 80% chance of being fully paid, 20% chance of being completely unpaid (0 paid)
    const isFullyPaid = Math.random() < 0.8;
    const amountPaid = isFullyPaid ? totalValue : 0;
    const fullyPaidDate = isFullyPaid ? subDays(d, -3) : null;

    const purchase = await prisma.purchase.create({
      data: {
        supplierId: supplier.id,
        date: d,
        qty: qty,
        pricePerTon: pricePerTon,
        totalValue: totalValue,
        amountPaid: amountPaid,
        fullyPaidDate: fullyPaidDate
      }
    });

    await prisma.inventoryBatch.create({
      data: {
        purchaseId: purchase.id,
        date: d,
        initialQty: qty,
        remainingQty: qty, // For dummy data, we will just leave it as if it's all remaining, or calculate? Wait, if we leave it all as remaining, the logic will work but might be technically slightly off from the production aggregate. Actually, it's better to calculate remaining, but since this is seed, we can just let the system deduct dynamically or let it be. Let's just set remainingQty to qty for seed data, it's a dummy dashboard anyway.
        pricePerTon: pricePerTon
      }
    });

    await prisma.supplierLedger.create({
      data: {
        supplierId: supplier.id,
        date: d,
        amount: totalValue,
        description: `Purchase of ${qty.toFixed(2)} Tons`
      }
    });

    // Make payment a few days later
    await prisma.supplierLedger.create({
      data: {
        supplierId: supplier.id,
        date: subDays(d, -3),
        amount: -amountPaid,
        description: `Payment for Purchase ${purchase.id}`
      }
    });

    if (amountPaid > 0) {
      const pRec = await prisma.paymentRecord.create({
        data: {
          date: subDays(d, -3),
          amount: amountPaid,
          type: "OUTGOING",
          supplierId: supplier.id,
          description: `Payment for Purchase ${purchase.id}`
        }
      });
      await prisma.billPayment.create({
         data: {
            paymentRecordId: pRec.id,
            purchaseId: purchase.id,
            amountApplied: amountPaid
         }
      });
    }
  }

  console.log('Added purchases and supplier ledgers');

  // Production (Daily)
  const ccBrands = ['Poly Vansh', 'Poly Unnati', 'Poly Unique Plus', 'Poly Unique Plus Premium'];
  const subBrands = ['Poly Lifeline', 'Poly Life Plus'];

  for (let i = 0; i < 1000; i++) {
    const d = subDays(today, i);
    const rawUsed = 0.5 + Math.random() * 1; // 0.5 to 1.5 Tons daily
    const yieldPercent = 0.95 + Math.random() * 0.04;
    const wireProduced = rawUsed * yieldPercent;

    const isCC = i % 3 !== 0; // 66% CC Wires, 33% Submersible
    const productCategory = isCC ? 'CC Wires' : 'Submersible Winding Wire';
    const brand = isCC ? ccBrands[i % ccBrands.length] : subBrands[i % subBrands.length];

    const scrapGen = rawUsed - wireProduced;

    const production = await prisma.production.create({
      data: {
        date: d,
        rawCopperUsed: rawUsed,
        productCategory,
        brand,
        wireType: i % 2 === 0 ? '1mm' : '2mm',
        wireProduced: wireProduced,
        scrapGenerated: scrapGen,
        finishedGoodsBatch: {
           create: {
              date: d,
              productCategory,
              brand,
              wireType: i % 2 === 0 ? '1mm' : '2mm',
              initialQty: wireProduced,
              remainingQty: wireProduced,
              costPerTon: 1190000 // Dummy cost for seed
           }
        }
      }
    });

    await prisma.scrapInventory.create({
      data: {
         date: d,
         type: "GENERATED",
         qty: scrapGen
      }
    });

    // Randomly sell scrap back to market
    if (i % 15 === 0) {
       const scrapSellQty = scrapGen * 10; // Sell roughly a batch of accumulated scrap
       const revenue = scrapSellQty * 1000000; // ~10 Lakh per ton for scrap copper
       const scrapSale = await prisma.scrapInventory.create({
          data: {
             date: subDays(d, -1),
             type: "SOLD",
             qty: scrapSellQty,
             revenue: revenue
          }
       });
       await prisma.paymentRecord.create({
          data: {
             date: subDays(d, -1),
             amount: revenue,
             type: "INCOMING",
             scrapSaleId: scrapSale.id,
             description: `Scrap Copper Sale (${scrapSellQty.toFixed(2)} Tons)`
          }
       });
    }
  }

  console.log('Added production logs');

  // Sales (Every ~5 days over 3 years)
  for (let i = 0; i < 200; i++) {
    const d = subDays(today, i * 5);
    const customer = i % 3 === 0 ? customer1 : customer2;

    // Multiple items per sale
    const qty1 = 2 + Math.random() * 3;
    const pricePerTon1 = 1250000 + Math.random() * 20000;
    const qty2 = 1 + Math.random() * 2;
    const pricePerTon2 = 1260000 + Math.random() * 20000;

    const totalSaleValue = (qty1 * pricePerTon1) + (qty2 * pricePerTon2);

    const isRawCopper = i % 10 === 0;

    // Simulate an exact FIFO cost from that historical day (approx 1,180,000)
    const exactHistoricalCost = 1180000 + Math.random() * 5000;

    const itemsData = isRawCopper ? [
        { productCategory: 'Raw Copper Bundle', brand: null, wireType: null, qty: qty1, pricePerTon: pricePerTon1, totalValue: qty1 * pricePerTon1, rawCopperCostAtSale: exactHistoricalCost }
    ] : [
        { productCategory: 'CC Wires', brand: ccBrands[i % ccBrands.length], wireType: '1mm', qty: qty1, pricePerTon: pricePerTon1, totalValue: qty1 * pricePerTon1, rawCopperCostAtSale: exactHistoricalCost },
        { productCategory: 'Submersible Winding Wire', brand: subBrands[i % subBrands.length], wireType: '2mm', qty: qty2, pricePerTon: pricePerTon2, totalValue: qty2 * pricePerTon2, rawCopperCostAtSale: exactHistoricalCost }
    ];

    const finalTotalValue = isRawCopper ? (qty1 * pricePerTon1) : totalSaleValue;

    // 80% chance of being fully paid, 20% chance of being completely unpaid (0 paid)
    const isSaleFullyPaid = Math.random() < 0.8;
    const amountPaid = isSaleFullyPaid ? finalTotalValue : 0;
    const fullyPaidDate = isSaleFullyPaid ? subDays(d, -4) : null;

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        date: d,
        totalValue: finalTotalValue,
        amountPaid: amountPaid,
        fullyPaidDate: fullyPaidDate,
        items: {
          create: itemsData
        }
      }
    });

    await prisma.customerLedger.create({
      data: {
        customerId: customer.id,
        date: d,
        amount: finalTotalValue,
        description: `Invoice Sale ID: ${sale.id}`
      }
    });

    // Customer pays
    await prisma.customerLedger.create({
        data: {
          customerId: customer.id,
          date: subDays(d, -4),
          amount: -amountPaid,
          description: `Payment for Sale ${sale.id}`
        }
      });

    if (amountPaid > 0) {
      const pRec = await prisma.paymentRecord.create({
        data: {
          date: subDays(d, -4),
          amount: amountPaid,
          type: "INCOMING",
          customerId: customer.id,
          description: `Payment for Sale ${sale.id}`
        }
      });
      await prisma.invoicePayment.create({
         data: {
            paymentRecordId: pRec.id,
            saleId: sale.id,
            amountApplied: amountPaid
         }
      });
    }
  }

  console.log('Added sales and customer ledgers');

  // Expenses (Monthly over 3 years)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  for (let i = 0; i < 36; i++) {
    const d = subMonths(today, i);
    const monthName = `${months[d.getMonth()]} ${d.getFullYear()}`;

    await prisma.expense.create({ data: { date: d, category: 'Electricity', amount: 300000 + Math.random() * 50000, expenseMonth: monthName, status: 'PAID' } });
    await prisma.expense.create({ data: { date: d, category: 'Rent', amount: 200000, expenseMonth: monthName, status: 'PAID' } });
    await prisma.expense.create({ data: { date: d, category: 'Maintenance', amount: 50000 + Math.random() * 10000, expenseMonth: monthName, status: 'PAID' } });
    await prisma.expense.create({ data: { date: d, category: 'Water', amount: 15000, expenseMonth: monthName, status: 'PAID' } });
    await prisma.expense.create({ data: { date: d, category: 'Salaries', amount: 250000 + Math.random() * 20000, expenseMonth: monthName, status: 'PAID' } });
  }

  console.log('Added expenses');

  // Advances
  const adv1 = await prisma.advance.create({ data: { employeeId: emp1.id, date: subDays(today, 10), amount: 15000, reason: 'Medical' } });
  const adv2 = await prisma.advance.create({ data: { employeeId: emp1.id, date: subDays(today, 40), amount: 150000, amountRepaid: 50000, reason: 'Wedding' } }); // High advance to test warning
  const adv3 = await prisma.advance.create({ data: { employeeId: emp2.id, date: subDays(today, 5), amount: 5000, reason: 'Personal' } });

  await prisma.advanceRepayment.create({
     data: {
        advanceId: adv2.id,
        amount: 50000,
        date: subDays(today, 15)
     }
  });

  console.log('Added advances');

  // Attendance (Last 100 days)
  for(let i=0; i<100; i++) {
     const d = subDays(today, i);
     await prisma.attendance.create({ data: { employeeId: emp1.id, date: d, status: i % 10 === 0 ? 'Absent' : 'Present' }});
     await prisma.attendance.create({ data: { employeeId: emp2.id, date: d, status: i % 15 === 0 ? 'Half_day' : 'Present' }});
     await prisma.attendance.create({ data: { employeeId: emp3.id, date: d, status: "Present" }});
  }

  console.log('Added attendance');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });