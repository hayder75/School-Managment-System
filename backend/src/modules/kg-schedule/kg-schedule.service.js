const db = require('../../config/database');

const LEVELS = ['nursery', 'lkg', 'ukg'];

// Default time slots taken from the school's printed early-years sheets.
// Stored/edited in English 24h time; the UI also shows the Ethiopian clock.
const DEFAULT_SLOTS = {
  nursery: [
    ['08:30', '09:00'], ['09:00', '09:30'], ['09:30', '10:00'],
    ['10:00', '10:30'], ['10:30', '11:00'], ['11:00', '12:00'],
    ['12:00', '13:00'], ['13:00', '14:20'], ['14:20', '14:50'],
    ['14:50', '15:20'], ['15:20', '15:30'],
  ],
  lkg: [
    ['08:40', '09:05'], ['09:05', '09:30'], ['09:30', '09:55'],
    ['09:55', '11:00'], ['11:00', '11:25'], ['11:25', '11:50'],
    ['11:50', '13:00'], ['13:00', '14:00'], ['14:00', '14:30'],
    ['14:30', '15:00'], ['15:00', '15:20'], ['15:20', '15:30'],
  ],
  ukg: [
    ['08:40', '09:05'], ['09:05', '09:30'], ['09:30', '09:55'],
    ['09:55', '11:00'], ['11:00', '11:25'], ['11:25', '11:50'],
    ['11:50', '13:00'], ['13:00', '14:00'], ['14:00', '14:30'],
    ['14:30', '15:00'], ['15:00', '15:20'], ['15:20', '15:30'],
  ],
};

function assertLevel(level) {
  const lv = String(level || '').toLowerCase();
  if (!LEVELS.includes(lv)) {
    const err = new Error('Invalid level. Use nursery, lkg or ukg.');
    err.code = 'VALIDATION';
    throw err;
  }
  return lv;
}

function defaultRows(level) {
  return DEFAULT_SLOTS[level].map(([start, end], i) => ({
    id: null,
    level,
    sort_order: i,
    start_time: start,
    end_time: end,
    full_week: false,
    activity: null,
    monday: null, tuesday: null, wednesday: null, thursday: null, friday: null,
    is_default: true,
  }));
}

async function getSchedule(tenantId, level) {
  const lv = assertLevel(level);
  const rows = await db('kg_schedule_slots')
    .where({ tenant_id: tenantId, level: lv })
    .orderBy('sort_order', 'asc');
  if (!rows.length) {
    return { level: lv, slots: defaultRows(lv), is_default: true };
  }
  return { level: lv, slots: rows.map(normalizeSlot), is_default: false };
}

function normalizeSlot(r) {
  return {
    id: r.id,
    level: r.level,
    sort_order: r.sort_order,
    start_time: String(r.start_time).slice(0, 5),
    end_time: String(r.end_time).slice(0, 5),
    full_week: !!r.full_week,
    activity: r.activity || '',
    monday: r.monday || '',
    tuesday: r.tuesday || '',
    wednesday: r.wednesday || '',
    thursday: r.thursday || '',
    friday: r.friday || '',
    is_default: false,
  };
}

const TIME_RE = /^\d{2}:\d{2}$/;

async function saveSchedule(tenantId, userId, level, slots) {
  const lv = assertLevel(level);
  const list = Array.isArray(slots) ? slots : [];
  if (list.length > 60) {
    const err = new Error('Too many time slots');
    err.code = 'VALIDATION';
    throw err;
  }
  const rows = list.map((s, i) => {
    const start = String(s.start_time || '').slice(0, 5);
    const end = String(s.end_time || '').slice(0, 5);
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
      const err = new Error('Each slot needs a valid start and end time');
      err.code = 'VALIDATION';
      throw err;
    }
    const fullWeek = !!s.full_week;
    const trim = (v) => (v == null ? null : String(v));
    return {
      tenant_id: tenantId,
      level: lv,
      sort_order: i,
      start_time: start,
      end_time: end,
      full_week: fullWeek,
      activity: fullWeek ? trim(s.activity || s.monday || '') : null,
      monday: fullWeek ? null : trim(s.monday || ''),
      tuesday: fullWeek ? null : trim(s.tuesday || ''),
      wednesday: fullWeek ? null : trim(s.wednesday || ''),
      thursday: fullWeek ? null : trim(s.thursday || ''),
      friday: fullWeek ? null : trim(s.friday || ''),
      created_by: userId,
      updated_at: db.fn.now(),
    };
  });

  await db.transaction(async (trx) => {
    await trx('kg_schedule_slots').where({ tenant_id: tenantId, level: lv }).del();
    if (rows.length) await trx('kg_schedule_slots').insert(rows);
  });

  return getSchedule(tenantId, lv);
}

module.exports = { LEVELS, DEFAULT_SLOTS, getSchedule, saveSchedule };