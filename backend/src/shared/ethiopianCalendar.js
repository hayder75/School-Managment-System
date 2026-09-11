// Ethiopian (Ge'ez) calendar conversion utilities (CommonJS mirror of the
// frontend lib). The database always stores Gregorian ISO dates; this module
// is used server-side for Ethiopian period/report labelling.

const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit',
  'Miazia', 'Genbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
];

const ETHIOPIAN_MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት',
  'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ',
];

const JD_EPOCH_OFFSET_AMETE_MIHRET = 1723856;

function mod(a, b) {
  return a - b * Math.floor(a / b);
}

function gregorianToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function jdnToGregorian(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

function ethiopianToJdn(year, month, day) {
  return (JD_EPOCH_OFFSET_AMETE_MIHRET + 365) + 365 * (year - 1) + Math.floor(year / 4) + 30 * month + day - 31;
}

function jdnToEthiopian(jdn) {
  const r = mod(jdn - JD_EPOCH_OFFSET_AMETE_MIHRET, 1461);
  const n = mod(r, 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - JD_EPOCH_OFFSET_AMETE_MIHRET) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = mod(n, 30) + 1;
  return { year, month, day };
}

function toGregorianParts(input) {
  if (input instanceof Date) {
    return { year: input.getFullYear(), month: input.getMonth() + 1, day: input.getDate() };
  }
  const s = String(input).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function isEthiopianLeapYear(year) {
  return year % 4 === 3;
}

function ethiopianMonthName(month, { amharic = false } = {}) {
  const list = amharic ? ETHIOPIAN_MONTHS_AM : ETHIOPIAN_MONTHS;
  return list[Math.min(Math.max(month - 1, 0), 12)] || '';
}

function toEthiopian(input = new Date()) {
  const parts = toGregorianParts(input);
  if (!parts) return null;
  const { year, month, day } = jdnToEthiopian(gregorianToJdn(parts.year, parts.month, parts.day));
  return {
    year,
    month,
    monthName: ethiopianMonthName(month),
    monthNameAm: ethiopianMonthName(month, { amharic: true }),
    day,
    monthIndex: month - 1,
  };
}

function toGregorian(year, month, day) {
  const g = jdnToGregorian(ethiopianToJdn(year, month, day));
  return new Date(g.year, g.month - 1, g.day, 12, 0, 0);
}

function formatEthiopian(input = new Date(), { amharic = false } = {}) {
  const e = toEthiopian(input);
  if (!e) return '—';
  return `${e.day} ${amharic ? e.monthNameAm : e.monthName} ${e.year} E.C.`;
}

const GREGORIAN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatGregorian(input = new Date()) {
  const parts = toGregorianParts(input);
  if (!parts) return '—';
  return `${GREGORIAN_MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`;
}

function formatEthiopianWithGregorian(input = new Date(), { primary = 'ethiopian' } = {}) {
  if (input === null || input === undefined || input === '') return '—';
  const eth = formatEthiopian(input);
  const greg = formatGregorian(input);
  return primary === 'gregorian' ? `${greg} · ${eth}` : `${eth} · ${greg}`;
}

function daysInEthiopianMonth(year, month) {
  if (month === 13) return isEthiopianLeapYear(year) ? 6 : 5;
  return 30;
}

// Gregorian [start, end] (inclusive ISO dates) for an Ethiopian month.
function ethiopianMonthGregorianRange(year, month) {
  const start = jdnToGregorian(ethiopianToJdn(year, month, 1));
  const end = jdnToGregorian(ethiopianToJdn(year, month, daysInEthiopianMonth(year, month)));
  const iso = (p) => `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  return { start: iso(start), end: iso(end) };
}

module.exports = {
  ETHIOPIAN_MONTHS,
  ETHIOPIAN_MONTHS_AM,
  gregorianToJdn,
  jdnToGregorian,
  ethiopianToJdn,
  jdnToEthiopian,
  isEthiopianLeapYear,
  ethiopianMonthName,
  toEthiopian,
  toGregorian,
  formatEthiopian,
  formatGregorian,
  formatEthiopianWithGregorian,
  daysInEthiopianMonth,
  ethiopianMonthGregorianRange,
};
