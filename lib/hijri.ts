export interface BahrainTime {
  dateString: string;
  timeString: string;
  hour: number;
  minute: number;
  second: number;
}

export function getBahrainTime(): BahrainTime {
  const options = {
    timeZone: "Asia/Bahrain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  } as const;
  
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(new Date());
  
  const val = (name: string) => parts.find(p => p.type === name)?.value || "0";
  
  const year = val("year");
  const month = val("month");
  const day = val("day");
  const hour = val("hour");
  const minute = val("minute");
  const second = val("second");
  
  return {
    dateString: `${year}-${month}-${day}`,
    timeString: `${hour}:${minute}`,
    hour: parseInt(hour, 10),
    minute: parseInt(minute, 10),
    second: parseInt(second, 10)
  };
}

export const hijriMonthsNames = [
  'محرم الحرام', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

export const gregMonthsNamesAr = [
  'يناير (1)', 'فبراير (2)', 'مارس (3)', 'أبريل (4)',
  'مايو (5)', 'يونيو (6)', 'يوليو (7)', 'أغسطس (8)',
  'سبتمبر (9)', 'أكتوبر (10)', 'نوفمبر (11)', 'ديسمبر (12)'
];
