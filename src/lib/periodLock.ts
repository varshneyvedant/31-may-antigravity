import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

/**
 * Checks if a specific date falls within a locked accounting period.
 */
export async function isPeriodLocked(dateInput: Date | string | null | undefined): Promise<boolean> {
  if (!dateInput) return false;
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return false;

  // Format date to "YYYY-MM"
  const yearMonth = format(date, 'yyyy-MM');

  const lock = await prisma.periodLock.findUnique({
    where: { yearMonth }
  });

  return lock ? lock.locked : false;
}

/**
 * Throws an explicit error if a given date falls inside a locked period.
 */
export async function assertPeriodNotLocked(dateInput: Date | string | null | undefined): Promise<void> {
  const date = dateInput || new Date();
  const locked = await isPeriodLocked(date);
  
  if (locked) {
    const monthStr = format(new Date(date), 'MMMM yyyy');
    throw new Error(`Period Locked: The accounting month "${monthStr}" has been officially closed and locked by the owner. No entries, adjustments, or reversals are allowed.`);
  }
}
