import { formatInTimeZone } from 'date-fns-tz';

export function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;
  let formatted = '';

  if (absAmount >= 10000000) {
    // Crores (Cr)
    formatted = `₹${(absAmount / 10000000).toFixed(2)} Cr`;
  } else if (absAmount >= 100000) {
    // Lakhs (L)
    formatted = `₹${(absAmount / 100000).toFixed(2)} L`;
  } else {
    formatted = `₹${absAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  return isNegative ? `-${formatted}` : formatted;
}

export function formatDateIST(date: Date | string | number): string {
  if (!date) return '-';
  return formatInTimeZone(new Date(date), 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a');
}

export function getCurrentISTInput(): string {
  return formatInTimeZone(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm");
}
