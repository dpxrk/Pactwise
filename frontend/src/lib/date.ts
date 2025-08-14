import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isBetween from 'dayjs/plugin/isBetween';
import isAfter from 'dayjs/plugin/isAfter';
import isBefore from 'dayjs/plugin/isBefore';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Initialize plugins
dayjs.extend(relativeTime);
dayjs.extend(isBetween);
dayjs.extend(isAfter);
dayjs.extend(isBefore);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

// Export dayjs for direct use
export default dayjs;

// Common date formatting functions
export const format = (date: string | Date | dayjs.Dayjs, formatString: string = 'MMM D, YYYY') => {
  return dayjs(date).format(formatString);
};

export const formatDistanceToNow = (date: string | Date | dayjs.Dayjs) => {
  return dayjs(date).fromNow();
};

export const isAfter = (date1: string | Date | dayjs.Dayjs, date2: string | Date | dayjs.Dayjs) => {
  return dayjs(date1).isAfter(dayjs(date2));
};

export const isBefore = (date1: string | Date | dayjs.Dayjs, date2: string | Date | dayjs.Dayjs) => {
  return dayjs(date1).isBefore(dayjs(date2));
};

export const addDays = (date: string | Date | dayjs.Dayjs, days: number) => {
  return dayjs(date).add(days, 'day').toDate();
};

export const addMonths = (date: string | Date | dayjs.Dayjs, months: number) => {
  return dayjs(date).add(months, 'month').toDate();
};

export const addHours = (date: string | Date | dayjs.Dayjs, hours: number) => {
  return dayjs(date).add(hours, 'hour').toDate();
};

export const subDays = (date: string | Date | dayjs.Dayjs, days: number) => {
  return dayjs(date).subtract(days, 'day').toDate();
};

export const subMonths = (date: string | Date | dayjs.Dayjs, months: number) => {
  return dayjs(date).subtract(months, 'month').toDate();
};

export const subYears = (date: string | Date | dayjs.Dayjs, years: number) => {
  return dayjs(date).subtract(years, 'year').toDate();
};

export const startOfMonth = (date: string | Date | dayjs.Dayjs) => {
  return dayjs(date).startOf('month').toDate();
};

export const endOfMonth = (date: string | Date | dayjs.Dayjs) => {
  return dayjs(date).endOf('month').toDate();
};

// Format presets commonly used in the app
export const formatDate = (date: string | Date | dayjs.Dayjs) => format(date, 'MMM D, YYYY');
export const formatDateTime = (date: string | Date | dayjs.Dayjs) => format(date, 'MMM D, YYYY h:mm A');
export const formatTime = (date: string | Date | dayjs.Dayjs) => format(date, 'h:mm A');
export const formatISO = (date: string | Date | dayjs.Dayjs) => dayjs(date).toISOString();