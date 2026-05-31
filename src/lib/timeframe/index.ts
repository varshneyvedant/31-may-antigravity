import { subDays, subWeeks, subMonths, subYears } from 'date-fns';

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'FY' | '3Y' | '5Y' | '10Y' | 'ALL';

export function getStartDateFromTimeframe(timeframe: Timeframe): Date {
  const today = new Date();

  switch (timeframe) {
    case '1D': return subDays(today, 1);
    case '1W': return subWeeks(today, 1);
    case '1M': return subMonths(today, 1);
    case '3M': return subMonths(today, 3);
    case '6M': return subMonths(today, 6);
    case '1Y': return subYears(today, 1);
    case 'FY':
      // Financial year starts April 1st
      const currentMonth = today.getMonth(); // 0-indexed (Jan = 0, Apr = 3)
      const year = currentMonth >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      return new Date(year, 3, 1); // April 1st
    case '3Y': return subYears(today, 3);
    case '5Y': return subYears(today, 5);
    case '10Y': return subYears(today, 10);
    case 'ALL':
    default:
      return new Date(2000, 0, 1); // effectively all time
  }
}
