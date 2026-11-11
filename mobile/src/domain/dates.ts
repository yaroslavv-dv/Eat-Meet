/**
 * Small, dependency-free date helpers. Formatting is done manually so output is
 * identical on every JS engine and does not depend on device locale data.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** A date `days` from `base` at the given local wall-clock time. */
export function atTime(base: Date, days: number, hours: number, minutes = 0): Date {
  const d = startOfDay(addDays(base, days));
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatTime(value: string | Date): string {
  const d = toDate(value);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "Fri 14 Nov" */
export function formatShortDate(value: string | Date): string {
  const d = toDate(value);
  return `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Friday 14 November" style, with month abbreviated. */
export function formatLongDate(value: string | Date): string {
  const d = toDate(value);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function weekdayShort(value: string | Date): string {
  return WEEKDAYS[toDate(value).getDay()].slice(0, 3).toUpperCase();
}

export function dayOfMonth(value: string | Date): number {
  return toDate(value).getDate();
}

export function monthShort(value: string | Date): string {
  return MONTHS[toDate(value).getMonth()];
}

/** "Today", "Tomorrow", "Yesterday" or the short date. */
export function formatRelativeDay(value: string | Date, now: Date = new Date()): string {
  const diff = Math.round((startOfDay(toDate(value)).getTime() - startOfDay(now).getTime()) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatShortDate(value);
}

/** "Today · 18:30" */
export function formatWhen(value: string | Date, now: Date = new Date()): string {
  return `${formatRelativeDay(value, now)} · ${formatTime(value)}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** "in 2 days", "in 5 h", "3 days ago" – coarse, for status lines. */
export function formatDistance(target: string | Date, now: Date = new Date()): string {
  const ms = toDate(target).getTime() - now.getTime();
  const abs = Math.abs(ms);
  let text: string;
  if (abs < HOUR_MS) text = `${Math.max(1, Math.round(abs / 60000))} min`;
  else if (abs < DAY_MS) text = `${Math.round(abs / HOUR_MS)} h`;
  else {
    const days = Math.round(abs / DAY_MS);
    text = `${days} day${days === 1 ? '' : 's'}`;
  }
  return ms >= 0 ? `in ${text}` : `${text} ago`;
}

export function hoursUntil(target: string | Date, now: Date = new Date()): number {
  return (toDate(target).getTime() - now.getTime()) / HOUR_MS;
}

export function ageFromBirthYear(birthYear: number, now: Date = new Date()): number {
  return now.getFullYear() - birthYear;
}

/** Combine a calendar day from `day` with the wall-clock time from `time`. */
export function combineDateAndTime(day: Date, time: Date): Date {
  const d = new Date(day);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

/** "1 plate", "3 plates" */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
