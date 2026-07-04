export const LAUNDRY_DELAY_DAYS = 7;
export const DAY_MS = 24 * 60 * 60 * 1000;

export function laundryDays(scanTime: Date | string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(scanTime).getTime()) / DAY_MS));
}

export function isLaundryDelayed(scanTime: Date | string, now = Date.now()) {
  return laundryDays(scanTime, now) >= LAUNDRY_DELAY_DAYS;
}
