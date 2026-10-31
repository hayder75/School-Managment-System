const db = require('../config/database');

const DEFAULT_SCALE = [
  { letter: 'A', min: 90, max: 100 },
  { letter: 'B', min: 80, max: 89.99 },
  { letter: 'C', min: 60, max: 79.99 },
  { letter: 'D', min: 50, max: 59.99 },
  { letter: 'F', min: 0, max: 49.99 },
];

const DEFAULT_WEIGHTS = { ca_pct: 50, exam_pct: 50 };

const FINAL_EXAM_TYPES = ['exam', 'final', 'semester'];

function letterFor(scale, percent) {
  const p = Number(percent);
  for (const band of scale) {
    if (p >= Number(band.min) && p <= Number(band.max)) return band.letter;
  }
  return 'F';
}

async function getGradingConfig(tenantId) {
  let scale = DEFAULT_SCALE;
  let weights = DEFAULT_WEIGHTS;
  try {
    const scaleRow = await db('settings').where({ tenant_id: tenantId, key: 'grading.scale' }).first();
    if (scaleRow?.value) {
      const parsed = JSON.parse(scaleRow.value);
      if (Array.isArray(parsed) && parsed.length) scale = parsed;
    }
    const wRow = await db('settings').where({ tenant_id: tenantId, key: 'grading.weights' }).first();
    if (wRow?.value) {
      const parsed = JSON.parse(wRow.value);
      if (parsed && (parsed.ca_pct != null || parsed.exam_pct != null)) {
        weights = {
          ca_pct: Number(parsed.ca_pct ?? 50),
          exam_pct: Number(parsed.exam_pct ?? 50),
        };
      }
    }
  } catch (e) {
    // fall back to defaults on any parse issue
  }
  return { scale, weights };
}

function isFinalExamType(type) {
  return FINAL_EXAM_TYPES.includes(String(type || '').toLowerCase());
}

// ── Flexible term schemes ──
//
// `raw`      : legacy behaviour — a subject's exam totals must fit in 100.
// `weighted` : each assessment type contributes a percentage of the final
//              mark. Raw totals are normalised per type, so a school can use
//              50-mark midterms, 10-mark quizzes and 20-mark projects and
//              still end up with a mark out of 100.
//
// Scheme shape:
//   { mode: 'raw'|'weighted', pass_pct: 50,
//     components: [{ type_code: 'quiz', weight_pct: 10 }, ...] }

const DEFAULT_SCHEME = { mode: 'raw', pass_pct: 50, components: [] };
const SCHEME_KEY = 'grading.scheme';

function normaliseScheme(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SCHEME };
  const mode = raw.mode === 'weighted' ? 'weighted' : 'raw';
  const pass = Number(raw.pass_pct);
  const components = Array.isArray(raw.components)
    ? raw.components
      .filter((c) => c && c.type_code && Number.isFinite(Number(c.weight_pct)))
      .map((c) => ({ type_code: String(c.type_code), weight_pct: Math.max(0, Number(c.weight_pct)) }))
    : [];
  return {
    mode,
    pass_pct: Number.isFinite(pass) && pass >= 0 && pass <= 100 ? pass : 50,
    components,
  };
}

async function getScheme(tenantId) {
  try {
    const row = await db('settings').where({ tenant_id: tenantId, key: SCHEME_KEY }).first();
    if (!row?.value) return { ...DEFAULT_SCHEME };
    const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    return normaliseScheme(parsed);
  } catch (e) {
    return { ...DEFAULT_SCHEME };
  }
}

async function saveScheme(tenantId, input) {
  const scheme = normaliseScheme(input);
  if (scheme.mode === 'weighted') {
    const total = scheme.components.reduce((s, c) => s + Number(c.weight_pct), 0);
    if (scheme.components.length === 0) {
      const e = new Error('WEIGHTS_REQUIRED');
      e.code = 'WEIGHTS_REQUIRED';
      throw e;
    }
    if (Math.abs(total - 100) > 0.01) {
      const e = new Error('WEIGHTS_MUST_TOTAL_100');
      e.code = 'WEIGHTS_MUST_TOTAL_100';
      e.total = total;
      throw e;
    }
  }
  await db('settings')
    .insert({ tenant_id: tenantId, key: SCHEME_KEY, value: JSON.stringify(scheme) })
    .onConflict(['tenant_id', 'key'])
    .merge({ value: JSON.stringify(scheme), updated_at: db.fn.now() });
  return scheme;
}

function weightFor(scheme, typeCode) {
  const comp = (scheme?.components || []).find((c) => c.type_code === typeCode);
  return comp ? Number(comp.weight_pct) : null;
}

/**
 * Combine per-type results into a final percentage.
 *
 * @param {object} scheme
 * @param {Array<{type:string,total:number,marks:number}>} rows one per exam
 * @returns {{percent:number|null, coverage:number, breakdown:Array}}
 */
function computeWeightedPercent(scheme, rows) {
  const components = scheme?.components || [];
  if (!components.length) return { percent: null, coverage: 0, breakdown: [] };

  const byType = new Map();
  for (const r of rows) {
    if (r.marks == null || !Number(r.total)) continue;
    const key = String(r.type || '').toLowerCase();
    const entry = byType.get(key) || { marks: 0, total: 0, count: 0 };
    entry.marks += Number(r.marks);
    entry.total += Number(r.total);
    entry.count += 1;
    byType.set(key, entry);
  }

  let weighted = 0;
  let coverage = 0;
  const breakdown = [];
  for (const comp of components) {
    const data = byType.get(comp.type_code);
    const available = !!(data && data.total > 0);
    const pct = available ? (data.marks / data.total) * 100 : null;
    breakdown.push({
      type_code: comp.type_code,
      weight_pct: Number(comp.weight_pct),
      percent: pct == null ? null : Math.round(pct * 10) / 10,
      exams: data ? data.count : 0,
    });
    if (available) {
      weighted += pct * Number(comp.weight_pct);
      coverage += Number(comp.weight_pct);
    }
  }

  // Only marks that exist are counted, then rescaled to 100. This keeps a
  // student's running average honest before the final is written.
  const percent = coverage > 0 ? Math.round((weighted / coverage) * 10) / 10 : null;
  return { percent, coverage: Math.round(coverage * 10) / 10, breakdown };
}

module.exports = {
  DEFAULT_SCALE, DEFAULT_WEIGHTS, DEFAULT_SCHEME, SCHEME_KEY,
  letterFor, getGradingConfig, isFinalExamType,
  getScheme, saveScheme, normaliseScheme, weightFor, computeWeightedPercent,
};
