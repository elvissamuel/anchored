/** UTC calendar day as YYYY-MM-DD (matches ISO date prefix). */
export function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(isoDay: string, delta: number): string {
  const u = new Date(`${isoDay}T12:00:00.000Z`);
  u.setUTCDate(u.getUTCDate() + delta);
  return u.toISOString().slice(0, 10);
}

/**
 * Current streak: consecutive days with activity ending today, or yesterday if today is still open.
 * Longest streak: maximum run of consecutive calendar days (UTC) in history.
 */
export function computeEngagementStreaks(activityDays: Set<string>): {
  current: number;
  longest: number;
} {
  if (activityDays.size === 0) return { current: 0, longest: 0 };

  const sortedAsc = [...activityDays].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = sortedAsc[i - 1];
    const cur = sortedAsc[i];
    if (addUtcDays(prev, 1) === cur) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const today = toUtcDateString(new Date());
  const yesterday = addUtcDays(today, -1);
  let anchor: string | null = null;
  if (activityDays.has(today)) anchor = today;
  else if (activityDays.has(yesterday)) anchor = yesterday;

  let current = 0;
  if (anchor) {
    let d = anchor;
    while (activityDays.has(d)) {
      current++;
      d = addUtcDays(d, -1);
    }
  }

  return { current, longest };
}
