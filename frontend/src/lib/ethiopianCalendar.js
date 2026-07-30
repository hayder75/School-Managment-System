const months = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miazia", "Genbot", "Sene", "Hamle", "Nehase", "Pagume"];

export function toEthiopian(date = new Date()) {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const jdn = 367 * gy - Math.floor((7 * (gy + 5001 + Math.floor((gm - 14) / 12))) / 4) + Math.floor(275 * gm / 9) + gd + 1729777 - 30;
  const era = Math.floor((jdn - 1723856) / 1461);
  const r = (jdn - 1723856) % 1461;
  const n = r % 365 + 365 * Math.floor(r / 365);
  const ey = 5520 + era * 4 + Math.floor((r - r % 1461) / 365);
  const em = Math.floor((n - 13) / 30) + 1;
  const ed = n - 30 * em - 12;
  return { year: ey, month: em > 0 ? months[Math.min(em - 1, 12)] : months[0], day: ed > 0 ? ed : 1, monthIndex: Math.max(em - 1, 0) };
}

export function formatEthiopian(date = new Date()) {
  const e = toEthiopian(date);
  return `${e.day} ${e.month} ${e.year} E.C.`;
}
