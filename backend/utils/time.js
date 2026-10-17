/**
 * Business-day helpers.
 *
 * Days and months follow the restaurant's own clock (default Asia/Karachi),
 * not the server's: on Render the server runs in UTC, which would otherwise
 * roll "today" over at 5am Pakistan time.
 *
 * The business day starts at 4am, not midnight, so a late-night service
 * (e.g. a bill paid at 1:30am) counts toward the evening it belongs to. The
 * same 4am cutoff applies on the 1st of the month.
 *
 * Helpers take a "clock": { tz, startHour } (from clockOf), or a bare
 * timezone string meaning a midnight cutoff.
 *
 * A "day key" is a Date at UTC midnight carrying the restaurant's local
 * calendar date (e.g. 2026-10-17T00:00:00Z means 17 Oct in Karachi). Sales
 * history buckets are stored under these keys.
 */
const DEFAULT_TZ = process.env.RESTAURANT_TIMEZONE || 'Asia/Karachi';
const DEFAULT_START_HOUR = 4;

const clockOf = (restaurant) => ({
  tz: (restaurant && restaurant.timezone) || DEFAULT_TZ,
  startHour: restaurant && Number.isInteger(restaurant.dayStartHour) ? restaurant.dayStartHour : DEFAULT_START_HOUR
});
const asClock = (clock) => (typeof clock === 'string' ? { tz: clock, startHour: 0 } : clock);
const HOUR = 60 * 60 * 1000;

const partsCache = new Map();
const formatterFor = (tz) => {
  if (!partsCache.has(tz)) {
    partsCache.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
    }));
  }
  return partsCache.get(tz);
};

// Local calendar parts of an instant in a timezone
const localParts = (date, tz) => {
  const p = {};
  for (const { type, value } of formatterFor(tz).formatToParts(date)) p[type] = Number(value);
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
};

// Minutes the timezone is ahead of UTC at a given instant
const offsetMs = (instant, tz) => {
  const p = localParts(new Date(instant), tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
};

// The instant of local midnight at the start of year/month/day in tz
const localMidnight = (year, month, day, tz) => {
  const guess = Date.UTC(year, month - 1, day);
  let instant = guess - offsetMs(guess, tz);
  instant = guess - offsetMs(instant, tz); // settle across DST changes
  return new Date(instant);
};

// Local business date of an instant: before the cutoff hour it is still yesterday
const businessParts = (date, clock) => {
  const { tz, startHour } = asClock(clock);
  return localParts(new Date(new Date(date).getTime() - startHour * HOUR), tz);
};

// The instant a business day starts (local date at the cutoff hour)
const dayStart = (year, month, day, clock) => {
  const { tz, startHour } = asClock(clock);
  return new Date(localMidnight(year, month, day, tz).getTime() + startHour * HOUR);
};

const dayKey = (date, clock) => {
  const p = businessParts(date, clock);
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
};

const monthKey = (date, clock) => {
  const p = businessParts(date, clock);
  return new Date(Date.UTC(p.year, p.month - 1, 1));
};

// [start, end) instants of the business day containing date
const dayRange = (date, clock) => {
  const p = businessParts(date, clock);
  return [dayStart(p.year, p.month, p.day, clock), dayStart(p.year, p.month, p.day + 1, clock)];
};

// [start, end) instants of the business month containing date
const monthRange = (date, clock) => {
  const p = businessParts(date, clock);
  return [dayStart(p.year, p.month, 1, clock), dayStart(p.year, p.month + 1, 1, clock)];
};

// [start, end) instants for a stored day/week/month key (UTC-midnight date carrying a local date)
const rangeForKey = (key, period, clock) => {
  const y = key.getUTCFullYear(), m = key.getUTCMonth() + 1, d = key.getUTCDate();
  if (period === 'monthly') return [dayStart(y, m, 1, clock), dayStart(y, m + 1, 1, clock)];
  if (period === 'weekly') return [dayStart(y, m, d, clock), dayStart(y, m, d + 7, clock)];
  return [dayStart(y, m, d, clock), dayStart(y, m, d + 1, clock)];
};

// Mongo filter: orders that were paid inside [start, end). Orders paid before
// paidAt existed fall back to their creation time.
const paidBetween = (start, end) => ({
  $or: [
    { paidAt: { $gte: start, $lt: end } },
    { paidAt: null, createdAt: { $gte: start, $lt: end } }
  ]
});

module.exports = { clockOf, timezoneOf: clockOf, localParts, localMidnight, dayKey, monthKey, dayRange, monthRange, rangeForKey, paidBetween };
