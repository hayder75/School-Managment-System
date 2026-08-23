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

module.exports = { DEFAULT_SCALE, DEFAULT_WEIGHTS, letterFor, getGradingConfig, isFinalExamType };
