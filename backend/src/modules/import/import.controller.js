const importService = require('./import.service');

async function importData(req, res) {
  const { type } = req.body;
  let records;
  try {
    records = typeof req.body.records === 'string' ? JSON.parse(req.body.records) : req.body.records;
  } catch {
    return res.status(400).json({ success: false, error: { code: 'INVALID_DATA', message: 'records must be a valid JSON array' } });
  }
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_DATA', message: 'records must be a non-empty array' } });
  }

  let result;
  switch (type) {
    case 'students':
      result = await importService.importStudents(req.tenant.id, records);
      break;
    case 'teachers':
      result = await importService.importTeachers(req.tenant.id, records);
      break;
    case 'payments':
      result = await importService.importPayments(req.tenant.id, records);
      break;
    default:
      return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'type must be students, teachers, or payments' } });
  }

  res.json({ success: true, data: result });
}

module.exports = { importData };
