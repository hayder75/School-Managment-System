require('express-async-errors');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');

const authRoutes = require('./modules/auth/auth.routes');
const tenantRoutes = require('./modules/tenants/tenants.routes');
const userRoutes = require('./modules/users/users.routes');
const classRoutes = require('./modules/classes/classes.routes');
const subjectRoutes = require('./modules/subjects/subjects.routes');
const teacherRoutes = require('./modules/teachers/teachers.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const examRoutes = require('./modules/exams/exams.routes');
const gradeRoutes = require('./modules/grades/grades.routes');
const timetableRoutes = require('./modules/timetable/timetable.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');
const feeRoutes = require('./modules/fees/fees.routes');
const expenseRoutes = require('./modules/expenses/expenses.routes');
const payrollRoutes = require('./modules/payroll/payroll.routes');
const auditLogRoutes = require('./modules/audit-logs/audit-logs.routes');
const reportRoutes = require('./modules/reports/reports.routes');
const importRoutes = require('./modules/import/import.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const studentRoutes = require('./modules/students/students.routes');
const parentRoutes = require('./modules/parents/parents.routes');
const announcementRoutes = require('./modules/announcements/announcements.routes');
const academicsRoutes = require('./modules/academics/academics.routes');

const app = express();

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser(config.cookie.secret));

app.use('/api/auth', authRoutes);
app.use('/api/admin/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/academics', academicsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/operations', require('./modules/operations/operations.routes'));
app.use('/api/pdf', require('./modules/pdf/pdf.routes'));

app.get('/', (req, res) => {
  res.redirect(config.frontendUrl);
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'SMS API is running' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'SERVER_ERROR', message: 'Internal server error' },
  });
});

module.exports = app;
