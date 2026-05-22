// Brisbane time helpers. Australia/Brisbane is UTC+10 year-round (no DST),
// so a fixed offset is exact — no timezone library needed.
const OFFSET_MS = 600 * 60 * 1000; // +10:00
const pad = (n: number) => String(n).padStart(2, "0");

const FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Brisbane wall-clock fields for a real instant.
function parts(d: Date) {
  const b = new Date(d.getTime() + OFFSET_MS);
  return {
    y: b.getUTCFullYear(),
    mo: b.getUTCMonth(),
    da: b.getUTCDate(),
    dow: b.getUTCDay(),
  };
}

// "YYYY-MM-DD" for the Brisbane calendar day an instant falls on.
export function brisbaneDateKey(d: Date): string {
  const p = parts(d);
  return `${p.y}-${pad(p.mo + 1)}-${pad(p.da)}`;
}

export interface WeekDay {
  dow: number; // 0 = Sunday
  key: string; // YYYY-MM-DD (Brisbane)
  full: string;
  short: string;
  isToday: boolean;
}

// The current Brisbane week, Sunday → Saturday (matches cadence day_of_week 0=Sun).
export function brisbaneWeek(now: Date = new Date()): WeekDay[] {
  const b = new Date(now.getTime() + OFFSET_MS);
  const sundayUTC = Date.UTC(
    b.getUTCFullYear(),
    b.getUTCMonth(),
    b.getUTCDate() - b.getUTCDay()
  );
  const todayKey = brisbaneDateKey(now);
  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(sundayUTC + i * 86400000);
    const key = `${dd.getUTCFullYear()}-${pad(dd.getUTCMonth() + 1)}-${pad(
      dd.getUTCDate()
    )}`;
    days.push({ dow: i, key, full: FULL[i], short: SHORT[i], isToday: key === todayKey });
  }
  return days;
}

// Real instant of a cadence slot occurring on a given Brisbane calendar day.
export function slotInstant(dayKey: string, time: string): Date {
  const [y, mo, da] = dayKey.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, da, h, mi) - OFFSET_MS);
}

// "5pm", "9:30am" from a "HH:MM[:SS]" string.
export function brisbaneTimeLabel(time: string): string {
  const [h, mi] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return mi === 0 ? `${hr}${ampm}` : `${hr}:${pad(mi)}${ampm}`;
}
