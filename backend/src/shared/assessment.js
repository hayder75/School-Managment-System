/**
 * Flexible mark-sheet configuration and calculation.
 *
 * A template/sheet config looks like:
 * {
 *   mode: 'weighted',
 *   pass_pct: 50,
 *   groups: [
 *     { code, name, weight_pct, is_final,
 *       components: [{ code, name, max_marks, input_type }] }
 *   ]
 * }
 *
 * Marks live in the existing grades table (one exam per column). This module
 * only decides how those columns combine into a subject mark out of 100.
 */

const db = require('../config/database');
const grading = require('./grading');

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'item';
}

function normaliseComponent(raw, index = 0) {
  const max = raw.max_marks == null || raw.max_marks === '' ? 100 : Math.max(0, num(raw.max_marks, 100));
  return {
    code: String(raw.code || `item_${index + 1}`),
    name: String(raw.name || `Item ${index + 1}`),
    max_marks: max,
    input_type: raw.input_type === 'text' ? 'text' : 'number',
    weight_pct: raw.weight_pct == null || raw.weight_pct === '' ? null : Math.max(0, num(raw.weight_pct)),
  };
}

function normaliseConfig(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const groups = Array.isArray(src.groups) ? src.groups : [];
  const clean = [];
  const seen = new Set();
  groups.forEach((g, gi) => {
    if (!g) return;
    const code = String(g.code || `group_${gi + 1}`);
    if (seen.has(code)) return;
    seen.add(code);
    const components = (Array.isArray(g.components) ? g.components : [])
      .map((c, ci) => normaliseComponent(c || {}, ci));
    clean.push({
      code,
      name: String(g.name || code),
      weight_pct: Math.max(0, num(g.weight_pct, 0)),
      is_final: !!g.is_final,
      components,
    });
  });
  const GROUP_ORDER = { ca: 1, skill: 2, test: 3, mid: 4, final: 5 };
  clean.sort((a, b) => (GROUP_ORDER[a.code] || 50) - (GROUP_ORDER[b.code] || 50));
  return {
    mode: src.mode === 'raw' ? 'raw' : 'weighted',
    pass_pct: src.pass_pct != null && num(src.pass_pct, 50) >= 0 && num(src.pass_pct, 50) <= 100
      ? num(src.pass_pct, 50) : 50,
    groups: clean,
  };
}

function weightTotal(config) {
  return Math.round((config?.groups || []).reduce((s, g) => s + num(g.weight_pct), 0) * 10) / 10;
}

function groupForType(type) {
  const t = String(type || '').toLowerCase();
  if (['reading_skill', 'writing_skil', 'listening', 'speaking', 'reading', 'writing'].includes(t)) return 'skill';
  if (['test'].includes(t)) return 'test';
  if (['midterm', 'mid'].includes(t)) return 'mid';
  if (['exam', 'final', 'semester'].includes(t)) return 'final';
  return 'ca';
}

const GROUP_NAMES = {
  ca: 'Continuous Assessment',
  skill: 'Listening, Reading, Writing, Speaking',
  test: 'Tests',
  mid: 'Mid Exam',
  final: 'Final Exam',
};

const BASE_WEIGHTS = { ca: 20, skill: 20, test: 10, mid: 20, final: 30 };

/** Build a sheet config from a list of existing exams (legacy data). */
function configFromExams(exams, { passPct = 50 } = {}) {
  const groups = new Map();
  let order = 0;
  for (const e of exams) {
    const g = e.component_group || groupForType(e.type);
    if (!groups.has(g)) {
      groups.set(g, { code: g, name: GROUP_NAMES[g] || g, weight_pct: 0, is_final: g === 'final', components: [] });
    }
    groups.get(g).components.push({
      code: e.component_code || `${slug(e.type || 'item')}_${order + 1}`,
      name: e.name || GROUP_NAMES[g] || 'Assessment',
      max_marks: Number(e.total_marks || 100),
      input_type: e.input_type === 'text' ? 'text' : 'number',
    });
    order += 1;
  }
  const present = [...groups.keys()];
  const rawTotal = present.reduce((s, g) => s + (BASE_WEIGHTS[g] || 10), 0) || 1;
  for (const g of present) {
    groups.get(g).weight_pct = Math.round(((BASE_WEIGHTS[g] || 10) / rawTotal) * 1000) / 10;
  }
  if (present.length) {
    const total = present.reduce((s, g) => s + groups.get(g).weight_pct, 0);
    const last = groups.get(present[present.length - 1]);
    last.weight_pct = Math.round((last.weight_pct + (100 - total)) * 10) / 10;
  }
  return { mode: 'weighted', pass_pct: passPct, groups: [...groups.values()] };
}

function defaultConfig(levelGroup) {
  if (levelGroup === 'kg' || levelGroup === 'nursery') {
    return {
      mode: 'weighted',
      pass_pct: 50,
      groups: [
        { code: 'test', name: 'Test', weight_pct: 20, is_final: false, components: [{ code: 'test', name: 'Test', max_marks: 100, input_type: 'number' }] },
        { code: 'mid', name: 'Mid', weight_pct: 30, is_final: false, components: [{ code: 'mid', name: 'Mid', max_marks: 100, input_type: 'number' }] },
        { code: 'rhyme', name: 'Rhyme', weight_pct: 25, is_final: false, components: [{ code: 'rhyme', name: 'Rhyme', max_marks: 100, input_type: 'number' }] },
        { code: 'song', name: 'Song', weight_pct: 25, is_final: false, components: [{ code: 'song', name: 'Song', max_marks: 100, input_type: 'number' }] },
      ],
    };
  }
  return {
    mode: 'weighted',
    pass_pct: 50,
    groups: [
      { code: 'ca', name: 'Continuous Assessment', weight_pct: 20, is_final: false, components: [
        { code: 'homework', name: 'Homework', max_marks: 10, input_type: 'number' },
        { code: 'classwork', name: 'Class work', max_marks: 10, input_type: 'number' },
        { code: 'assignment', name: 'Assignment', max_marks: 10, input_type: 'number' },
        { code: 'worksheet', name: 'Worksheet', max_marks: 10, input_type: 'number' },
        { code: 'quiz', name: 'Quiz', max_marks: 10, input_type: 'number' },
      ] },
      { code: 'test', name: 'Tests', weight_pct: 10, is_final: false, components: [
        { code: 'test_1', name: 'Test 1', max_marks: 20, input_type: 'number' },
        { code: 'test_2', name: 'Test 2', max_marks: 20, input_type: 'number' },
      ] },
      { code: 'mid', name: 'Mid Exam', weight_pct: 20, is_final: false, components: [
        { code: 'mid', name: 'Mid Exam', max_marks: 50, input_type: 'number' },
      ] },
      { code: 'final', name: 'Final Exam', weight_pct: 50, is_final: true, components: [
        { code: 'final', name: 'Final Exam', max_marks: 100, input_type: 'number' },
      ] },
    ],
  };
}

/**
 * Pick the most specific template for a class/subject/term.
 * Precedence: subject+term > subject > level+term > level > school default.
 */
async function resolveTemplate(tenantId, { level_group = null, subject_id = null, term_id = null } = {}) {
  const rows = await db('assessment_templates')
    .where({ tenant_id: tenantId })
    .where(function () {
      this.whereNull('level_group');
      if (level_group) this.orWhere('level_group', level_group);
    })
    .where(function () {
      this.whereNull('subject_id');
      if (subject_id) this.orWhere('subject_id', subject_id);
    })
    .where(function () {
      this.whereNull('term_id');
      if (term_id) this.orWhere('term_id', term_id);
    });

  let best = null;
  let bestScore = -1;
  for (const row of rows) {
    let score = 0;
    if (subject_id && row.subject_id === subject_id) score += 40;
    else if (row.subject_id) continue;
    if (term_id && row.term_id === term_id) score += 20;
    else if (row.term_id) continue;
    if (level_group && row.level_group === level_group) score += 10;
    else if (row.level_group) continue;
    if (score > bestScore) { bestScore = score; best = row; }
  }
  if (!best) return { id: null, name: 'Default', config: defaultConfig(level_group) };
  let config = best.config;
  if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch { config = defaultConfig(level_group); }
  }
  return { id: best.id, name: best.name, config: normaliseConfig(config) };
}

/**
 * Columns for a sheet: the exams that back it, in display order.
 */
function columnsFromExams(exams, config) {
  const order = new Map();
  (config?.groups || []).forEach((g, gi) => {
    g.components.forEach((c, ci) => order.set(c.code, gi * 1000 + ci));
  });
  return (exams || [])
    .map((e, i) => ({
      exam_id: e.id,
      code: e.component_code || `item_${i + 1}`,
      name: e.name || 'Assessment',
      group: e.component_group || groupForType(e.type),
      weight_pct: e.weight_pct != null ? Number(e.weight_pct) : null,
      max_marks: e.total_marks == null ? null : Number(e.total_marks),
      input_type: e.input_type === 'text' ? 'text' : 'number',
      sort_order: e.sort_order != null ? e.sort_order : i,
      total_marks: e.total_marks == null ? null : Number(e.total_marks),
      pass_marks: e.pass_marks == null ? null : Number(e.pass_marks),
      type: e.type,
      date: e.date,
      subject_id: e.subject_id,
      class_ids: e.class_ids,
      class_id: e.class_id,
    }))
    .sort((a, b) => {
      const oa = order.has(a.code) ? order.get(a.code) : 500000 + a.sort_order;
      const ob = order.has(b.code) ? order.get(b.code) : 500000 + b.sort_order;
      return oa - ob || a.name.localeCompare(b.name);
    });
}

/**
 * Add groups that exist on the columns but not in the config (legacy or
 * manually added exams), so no mark is ever hidden from the total.
 */
function ensureGroups(config, columns) {
  const out = normaliseConfig(config);
  const existing = new Set(out.groups.map((g) => g.code));
  const missing = [...new Set(columns.map((c) => c.group).filter(Boolean))]
    .filter((g) => !existing.has(g));
  if (!missing.length) return out;
  const present = out.groups.map((g) => g.code).concat(missing);
  const rawTotal = present.reduce((s, g) => s + (BASE_WEIGHTS[g] || 10), 0) || 1;
  out.groups.forEach((g) => { g.weight_pct = Math.round(((BASE_WEIGHTS[g] || 10) / rawTotal) * 1000) / 10; });
  for (const g of missing) {
    out.groups.push({
      code: g,
      name: GROUP_NAMES[g] || g,
      weight_pct: Math.round(((BASE_WEIGHTS[g] || 10) / rawTotal) * 1000) / 10,
      is_final: g === 'final',
      components: [],
    });
  }
  // Force 100 after rounding.
  const total = out.groups.reduce((s, g) => s + g.weight_pct, 0);
  if (out.groups.length) out.groups[out.groups.length - 1].weight_pct = Math.round((out.groups[out.groups.length - 1].weight_pct + (100 - total)) * 10) / 10;
  return out;
}

/**
 * Compute one student's subject mark.
 *
 * @param {object} config normalised sheet config
 * @param {Array} columns sheet columns (from columnsFromExams)
 * @param {object} values map component_code -> { marks, text }
 * @returns {object} totals, coverage, missing columns, letter
 */
function computeStudent(config, columns, values, { scale, passPct } = {}) {
  const groups = [];
  const missing = [];
  let usedWeight = 0;
  let weighted = 0;
  let ca = 0;
  let final = 0;
  let finalUsed = 0;
  let caPctWeighted = 0;
  let caPctWeight = 0;
  let finalPercent = null;
  const activeScale = Array.isArray(scale) && scale.length ? scale : grading.DEFAULT_SCALE;
  const pass = passPct != null ? Number(passPct) : 50;

  for (const group of config.groups || []) {
    const gcols = columns.filter((c) => c.group === group.code);
    if (!gcols.length) continue;
    let marks = 0;
    let total = 0;
    let used = 0;
    for (const c of gcols) {
      const v = values?.[c.code];
      const hasText = c.input_type === 'text' && v && String(v.text || '').trim() !== '';
      if (c.input_type === 'text') {
        if (!hasText) missing.push({ code: c.code, name: c.name, group: group.code });
        continue;
      }
      if (v && v.marks != null && v.marks !== '' && Number.isFinite(Number(v.marks))) {
        marks += Number(v.marks);
        total += Number(c.max_marks || 0);
        used += 1;
      } else {
        missing.push({ code: c.code, name: c.name, group: group.code });
      }
    }
    const pct = total > 0 && used > 0 ? (marks / total) * 100 : null;
    const contribution = pct == null ? null : (pct * group.weight_pct) / 100;
    groups.push({
      code: group.code,
      name: group.name,
      weight_pct: group.weight_pct,
      is_final: !!group.is_final,
      entered: used,
      expected: gcols.filter((c) => c.input_type !== 'text').length,
      marks: Math.round(marks * 100) / 100,
      total: Math.round(total * 100) / 100,
      percent: pct == null ? null : Math.round(pct * 10) / 10,
      contribution: contribution == null ? null : Math.round(contribution * 100) / 100,
    });
    if (pct != null) {
      weighted += pct * group.weight_pct;
      usedWeight += group.weight_pct;
      if (group.is_final) { final += contribution; finalUsed += 1; finalPercent = pct; }
      else { ca += contribution; caPctWeighted += pct * group.weight_pct; caPctWeight += group.weight_pct; }
    }
  }

  const totalWeight = (config.groups || []).reduce((s, g) => s + Number(g.weight_pct || 0), 0);
  const percent = usedWeight > 0 ? weighted / usedWeight : null;
  const rounded = percent == null ? null : Math.round(percent * 10) / 10;
  const coverage = totalWeight > 0 ? Math.round((usedWeight / totalWeight) * 1000) / 10 : 0;
  const complete = usedWeight > 0 && Math.abs(usedWeight - totalWeight) < 0.01 && missing.filter((m) => {
    const col = columns.find((c) => c.code === m.code);
    return col && col.input_type !== 'text';
  }).length === 0;

  return {
    percent: rounded,
    raw_total: Math.round(weighted * 100) / 100,
    ca_total: Math.round(ca * 100) / 100,
    final_total: Math.round(final * 100) / 100,
    ca_percent: caPctWeight > 0 ? Math.round((caPctWeighted / caPctWeight) * 10) / 10 : null,
    final_percent: finalPercent == null ? null : Math.round(finalPercent * 10) / 10,
    final_used: finalUsed > 0,
    used_weight: Math.round(usedWeight * 10) / 10,
    total_weight: Math.round(totalWeight * 10) / 10,
    coverage,
    complete,
    missing,
    groups,
    letter: rounded == null ? null : grading.letterFor(activeScale, rounded),
    passed: rounded == null ? null : rounded >= pass,
    pass_pct: pass,
  };
}

module.exports = {
  num,
  slug,
  normaliseConfig,
  normaliseComponent,
  weightTotal,
  groupForType,
  configFromExams,
  defaultConfig,
  resolveTemplate,
  columnsFromExams,
  ensureGroups,
  computeStudent,
  GROUP_NAMES,
  BASE_WEIGHTS,
};
