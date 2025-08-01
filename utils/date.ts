import { format, isToday, isYesterday } from 'date-fns';

export const formatDate = (date: Date, formatTemplate = 'MMMM dd, yyyy') => {
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, formatTemplate);
};

export const formatDateKey = (date: Date, formatTemplate = 'yyyy-MM-dd') => format(date, formatTemplate);
