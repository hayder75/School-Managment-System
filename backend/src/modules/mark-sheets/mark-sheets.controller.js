const service = require('./mark-sheets.service');
const audit = require('../../shared/audit');

function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ success: false, error: { code, message, ...extra } });
}

function handle(res, err) {
  const code = err?.code || 'ERROR';
  const map = {
    CLASS_NOT_FOUND: [404, 'Class not found'],
    SUBJECT_NOT_FOUND: [404, 'Subject not found'],
    TERM_NOT_FOUND: [404, 'Term not found'],
    SHEET_NOT_FOUND: [404, 'Mark sheet not found'],
    FORBIDDEN: [403, 'You cannot edit this mark sheet'],
    READ_ONLY: [403, 'This page is read-only for your role'],
    SHEET_LOCKED: [409, 'This mark sheet was submitted or approved. Ask an administrator to reopen it.'],
    ALREADY_SUBMITTED: [409, 'This mark sheet is already submitted'],
    NOT_SUBMITTED: [409, 'This mark sheet has not been submitted'],
    NO_MARKS: [400, 'Enter at least one mark before submitting'],
    NO_COLUMNS: [400, 'Add at least one assessment column'],
    COMMENT_REQUIRED: [400, 'Please write a reason when sending it back'],
    WEIGHTS_MUST_TOTAL_100: [400, `Weights must total 100. They currently total ${err.total ?? '?'}.`],
    DUPLICATE_COMPONENT: [400, `Duplicate column code: ${err.code_value || ''}`],
    COMPONENT_HAS_MARKS: [409, 'That column already has marks. Clear the marks before removing it.'],
    MAX_BELOW_MARKS: [400, 'Some students already have marks above the new maximum. Lower those marks before changing the maximum.', { blocked: err.blocked }],
    INCOMPLETE_SHEET: [400, 'Some students still have blank marks. Save them as 0 before submitting.', { incomplete: err.incomplete, students: err.students }],
  };
  const [status, message, extra] = map[code] || [500, err?.message || 'Something went wrong', {}];
  if (status === 500) throw err;
  return fail(res, status, code, message, extra);
}

async function overview(req, res) {
  const data = await service.overview(req.tenant.id, { termId: req.query.term_id }, { role: req.user.role, userId: req.user.userId });
  res.json({ success: true, data });
}

async function getSheet(req, res) {
  const data = await service.getSheetData(
    req.tenant.id,
    { classId: req.query.class_id, subjectId: req.query.subject_id, termId: req.query.term_id },
    { role: req.user.role, userId: req.user.userId }
  );
  res.json({ success: true, data });
}

async function updateConfig(req, res) {
  try {
    const row = await service.updateConfig(req.tenant.id, req.params.id, req.validated.body.config, {
      role: req.user.role, userId: req.user.userId,
    });
    await audit.record(req, 'update', 'mark_sheet', row.id, null, { config: row.config });
    res.json({ success: true, data: { id: row.id, config: row.config } });
  } catch (err) {
    handle(res, err);
  }
}

async function save(req, res) {
  try {
    const data = await service.saveSheet(req.tenant.id, req.params.id, {
      role: req.user.role, userId: req.user.userId,
    }, req.validated.body);
    await audit.record(req, 'update', 'mark_sheet', req.params.id, null, { saved: data.saved, warnings: data.warnings?.length || 0 });
    res.json({ success: true, data });
  } catch (err) {
    handle(res, err);
  }
}

async function submit(req, res) {
  try {
    const data = await service.submitSheet(req.tenant.id, req.params.id, {
      role: req.user.role, userId: req.user.userId,
    });
    await audit.record(req, 'submit', 'mark_sheet', req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    handle(res, err);
  }
}

async function review(req, res) {
  try {
    const data = await service.reviewSheet(req.tenant.id, req.params.id, {
      role: req.user.role, userId: req.user.userId,
    }, req.validated.body);
    await audit.record(req, 'review', 'mark_sheet', req.params.id, null, req.validated.body);
    res.json({ success: true, data });
  } catch (err) {
    handle(res, err);
  }
}

async function exportSheet(req, res) {
  try {
    const wb = await service.exportWorkbook(req.tenant.id, req.params.id, {
      role: req.user.role, userId: req.user.userId,
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="mark-sheet-${req.params.id}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    if (!res.headersSent) handle(res, err);
  }
}

async function listTemplates(req, res) {
  const data = await service.listTemplates(req.tenant.id, {
    level_group: req.query.level_group,
    subject_id: req.query.subject_id,
  });
  res.json({ success: true, data });
}

async function saveTemplate(req, res) {
  try {
    const row = await service.saveTemplate(req.tenant.id, req.user.userId, { ...req.validated.body, id: req.validated.body.id || req.params.id });
    await audit.record(req, 'update', 'assessment_template', row.id, null, { name: row.name });
    res.json({ success: true, data: row });
  } catch (err) {
    handle(res, err);
  }
}

async function applyTemplate(req, res) {
  try {
    const data = await service.applyTemplateToSheets(req.tenant.id, req.params.id, {
      updateWeights: !!req.validated.body?.update_weights,
      dryRun: !!req.validated.body?.dry_run,
    });
    if (!req.validated.body?.dry_run) {
      await audit.record(req, 'update', 'assessment_template', req.params.id, null, data);
    }
    res.json({ success: true, data });
  } catch (err) {
    handle(res, err);
  }
}

async function deleteTemplate(req, res) {
  await service.deleteTemplate(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

module.exports = {
  overview,
  getSheet,
  updateConfig,
  save,
  submit,
  review,
  exportSheet,
  listTemplates,
  saveTemplate,
  applyTemplate,
  deleteTemplate,
};
