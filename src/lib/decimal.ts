import { Decimal } from '@prisma/client/runtime/library';

export function decimalToNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (Decimal.isDecimal(val)) return val.toNumber();
  if (typeof val === 'string') return parseFloat(val);
  return Number(val) || 0;
}
