const PERMISSIONS = [
  { key: 'dashboard.view', label: 'View Dashboard', description: 'Access the dashboard page' },
  { key: 'users.manage', label: 'Manage Users', description: 'Create, edit and deactivate staff accounts' },
  { key: 'teachers.manage', label: 'Manage Teachers', description: 'Manage teachers and their subject assignments' },
  { key: 'students.view', label: 'View Students', description: 'View student records and profiles' },
  { key: 'students.manage', label: 'Manage Students', description: 'Create, edit and enroll students' },
  { key: 'parents.manage', label: 'Manage Parents', description: 'Manage parents and student guardian links' },
  { key: 'classes.manage', label: 'Manage Classes', description: 'Create and manage classes' },
  { key: 'subjects.manage', label: 'Manage Subjects', description: 'Create and manage subjects' },
  { key: 'attendance.manage', label: 'Manage Attendance', description: 'Mark and manage attendance records' },
  { key: 'exams.manage', label: 'Manage Exams', description: 'Create and manage exams' },
  { key: 'grades.manage', label: 'Enter & Lock Grades', description: 'Enter grades and lock exams' },
  { key: 'timetable.view', label: 'View Timetables', description: 'View class and teacher timetables' },
  { key: 'timetable.manage', label: 'Manage Timetables', description: 'Create and edit timetable entries' },
  { key: 'chat.access', label: 'Use Chat', description: 'Send and receive chat messages' },
  { key: 'announcements.view', label: 'View Announcements', description: 'Read announcements' },
  { key: 'announcements.manage', label: 'Post Announcements', description: 'Create and delete announcements' },
  { key: 'fees.manage', label: 'Manage Fee Structures', description: 'Create and manage fee structures' },
  { key: 'payments.manage', label: 'Record Payments', description: 'Record and edit student payments' },
  { key: 'expenses.manage', label: 'Manage Expenses', description: 'Record and manage expenses' },
  { key: 'payroll.view', label: 'View Payroll', description: 'View payroll and payslips' },
  { key: 'payroll.manage', label: 'Manage Payroll', description: 'Create and edit payroll runs' },
  { key: 'reports.view', label: 'View Reports', description: 'View reports and analytics' },
  { key: 'operations.manage', label: 'Lifecycle Operations', description: 'Promote, transfer, graduate students' },
  { key: 'backup.manage', label: 'Backup & Restore', description: 'Backup and restore school data' },
  { key: 'import.manage', label: 'Bulk Import', description: 'Import data from files' },
  { key: 'tax-settings.manage', label: 'Tax Brackets', description: 'Manage tax bracket settings' },
  { key: 'leave-management.manage', label: 'Leave Management', description: 'Manage staff leave requests' },
  { key: 'payroll-audit.view', label: 'Payroll Audit', description: 'View payroll audit log' },
  { key: 'audit.view', label: 'View Audit Logs', description: 'View system audit logs' },
  { key: 'settings.manage', label: 'School Settings', description: 'Manage school settings' },
  { key: 'roles.manage', label: 'Manage Roles & Permissions', description: 'Create roles and assign permissions' },
  { key: 'academics.manage', label: 'Manage Academic Setup', description: 'Manage academic years, terms and rollovers' },
];

const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

const DEFAULT_ROLE_PERMISSIONS = {
  owner: ALL_PERMISSION_KEYS,
  admin: ALL_PERMISSION_KEYS,
  teacher: [
    'dashboard.view', 'students.view', 'attendance.manage', 'exams.manage',
    'grades.manage', 'timetable.view', 'announcements.view', 'chat.access',
  ],
  student: ['dashboard.view', 'timetable.view', 'announcements.view'],
  parent: ['dashboard.view', 'timetable.view', 'announcements.view', 'chat.access'],
  finance: [
    'dashboard.view', 'fees.manage', 'payments.manage', 'expenses.manage',
    'payroll.view', 'reports.view', 'announcements.view',
  ],
  cashier: [
    'dashboard.view', 'students.view', 'students.manage', 'fees.manage',
    'payments.manage', 'reports.view', 'announcements.view',
  ],
  hr: [
    'dashboard.view', 'users.manage', 'payroll.view', 'reports.view',
    'tax-settings.manage', 'leave-management.manage', 'payroll-audit.view', 'announcements.view',
  ],
  support: ['dashboard.view', 'announcements.view', 'chat.access'],
};

module.exports = { PERMISSIONS, ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS };
