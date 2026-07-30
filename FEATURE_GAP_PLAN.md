# Feature Gap Analysis & Build Plan

> Comparison against School2Family reference project. All new features will integrate with our existing stack: Node.js/Express/Knex/PostgreSQL backend, React/Vite/Tailwind/shadcn frontend.

---

## Existing Roles (kept as-is)

| Role | Scope |
|---|---|
| **super_admin** | Global — no tenant. Manage all schools, audit logs |
| **owner** | Tenant — full school ownership |
| **admin** | Tenant — daily school operations |
| **teacher** | Tenant — classes, attendance, grades |
| **student** | Tenant — own timetable, grades, attendance |
| **parent** | Tenant — linked children, chat, payments |
| **finance** | Tenant — fees, payments, expenses, payroll |
| **hr** | Tenant — staff, payroll, leave |

---

## Phase 6 — Student Lifecycle & Records

### Backend

| Feature | Endpoints | Tables Needed |
|---|---|---|
| **Student enrollment** (create student + link guardians in one step) | `POST /api/students/enroll` | students, student_parents, users |
| **Student promotion** (bulk promote to next grade) | `POST /api/students/promote` | students, student_promotions (new) |
| **Student graduation** (mark graduated + certificate) | `POST /api/students/graduate` | students, student_graduations (new) |
| **Student transfer** (internal/external with history) | `POST /api/students/transfer` | students, student_transfers (new) |
| **Student documents** (upload/manage files) | `GET/POST/DELETE /api/students/:id/documents` | student_documents (new) |
| **Student medical info** (allergies, conditions, etc.) | `GET/PUT /api/students/:id/medical` | student_medical (new) |
| **Student discipline** (incidents + resolution) | `GET/POST/PATCH/DELETE /api/students/:id/discipline` | student_discipline (new) |
| **Student achievements** (awards tracking) | `GET/POST/DELETE /api/students/:id/achievements` | student_achievements (new) |
| **Student status history** (audit trail) | `GET /api/students/:id/status-history` | student_status_history (new) |

### Frontend Pages

| Page | Roles | Description |
|---|---|---|
| **EnrollStudentPage** | admin, owner | Multi-step enrollment form + guardian linking |
| **StudentDetailPage** | admin, owner, teacher | Full profile: docs, medical, discipline, achievements tabs |
| **PromoteStudentsPage** | admin, owner | Bulk select students → promote to next grade |
| **GraduateStudentsPage** | admin, owner | Mark graduating students + certificate numbers |

### Role Access

| Feature | super_admin | owner | admin | teacher | student | parent | finance | hr |
|---|---|---|---|---|---|---|---|---|
| Enroll student | — | ✓ | ✓ | — | — | — | — | — |
| View student profile | — | ✓ | ✓ | ✓ (own) | — | ✓ (child) | — | — |
| Promote/graduate | — | ✓ | ✓ | — | — | — | — | — |
| Upload documents | — | ✓ | ✓ | — | — | — | — | — |
| View documents | — | ✓ | ✓ | ✓ | ✓ (own) | ✓ (child) | — | — |
| Medical info | — | ✓ | ✓ | — | — | ✓ (child) | — | — |
| Discipline | — | ✓ | ✓ | ✓ (report) | — | ✓ (child) | — | — |
| Achievements | — | ✓ | ✓ | ✓ | — | ✓ (child) | — | — |

---

## Phase 7 — Operations (Library / Transport / Hostel)

### Backend

| Feature | Endpoints | Tables Needed |
|---|---|---|
| **Library** — books CRUD + issue/return + fines | `GET/POST/PATCH/DELETE /api/operations/books`, `POST /api/operations/books/issue`, `POST /api/operations/books/return` | books, book_borrowings (new) |
| **Transport** — routes + student allocation | `GET/POST /api/operations/routes`, `POST /api/operations/routes/allocate` | transport_routes, transport_allocations (new) |
| **Hostel** — rooms + bed allocation | `GET/POST /api/operations/rooms`, `POST /api/operations/rooms/allocate` | hostel_rooms, hostel_allocations (new) |

### Frontend Pages

| Page | Roles | Description |
|---|---|---|
| **LibraryPage** | admin, owner, student | Book catalog + issue/return |
| **TransportPage** | admin, owner | Route management + allocation |
| **HostelPage** | admin, owner | Room management + allocation |

### Role Access

| Feature | super_admin | owner | admin | teacher | student | parent | finance | hr |
|---|---|---|---|---|---|---|---|---|
| Library — manage books | — | ✓ | ✓ | — | — | — | — | — |
| Library — borrow/return | — | ✓ | ✓ | — | ✓ | — | — | — |
| Transport — manage | — | ✓ | ✓ | — | — | — | — | — |
| Transport — view route | — | ✓ | ✓ | — | ✓ | ✓ | — | — |
| Hostel — manage | — | ✓ | ✓ | — | — | — | — | — |
| Hostel — view assignment | — | ✓ | ✓ | — | ✓ | ✓ | — | — |

---

## Phase 8 — Tax, Payroll & HR

### Backend

| Feature | Endpoints | Tables Needed |
|---|---|---|
| **Ethiopian PAYE tax brackets** (progressive) | `GET/POST/PATCH /api/hr/tax-brackets` | tax_brackets (new) |
| **Payroll tax calculation** (PAYE + pension 7%/11%) | Auto-calculated during payroll generation | — (computed) |
| **Leave management** (requests + approval + balance) | `GET/POST /api/hr/leaves`, `PATCH /api/hr/leaves/:id/approve` etc. | leaves (new) |
| **Staff directory** (dedicated) | `GET /api/hr/staff` | — (uses users) |
| **Payroll audit trail** | `GET /api/hr/payroll/audits` | payroll_audits (new) |
| **Payslip PDF** | `GET /api/hr/payroll/:id/payslip/pdf` | — (PDFKit) |

### Frontend Pages

| Page | Roles | Description |
|---|---|---|
| **TaxSettingsPage** | admin, owner, hr | Configure tax brackets |
| **LeaveManagementPage** | admin, owner, hr, teacher | Request/approve leaves + calendar |
| **PayslipPage** | admin, owner, hr, teacher, finance | View/download payslip PDF |
| **StaffDirectoryPage** | admin, owner, hr | Staff list with details |

### Role Access

| Feature | super_admin | owner | admin | teacher | student | parent | finance | hr |
|---|---|---|---|---|---|---|---|---|
| Tax brackets config | — | ✓ | ✓ | — | — | — | — | ✓ |
| Generate payroll with tax | — | ✓ | — | — | — | — | ✓ | ✓ |
| View payslip | — | ✓ | ✓ | ✓ (own) | — | — | ✓ | ✓ |
| Leave — request | — | ✓ | ✓ | ✓ | — | — | — | ✓ |
| Leave — approve | — | ✓ | ✓ | — | — | — | — | ✓ |
| Staff directory | — | ✓ | ✓ | ✓ | — | — | — | ✓ |

---

## Phase 9 — PDF Generation

| Document | Library | Roles | Trigger |
|---|---|---|---|
| **Report card** (Ethiopian grading: A+ through F) | PDFKit | student, parent, teacher, admin | `GET /api/grades/report-card/:studentId` |
| **Invoice** (itemized fee breakdown) | PDFKit | finance, admin, student, parent | `GET /api/fees/invoices/:id/pdf` |
| **Payslip** (earnings + deductions + tax) | PDFKit | hr, staff | `GET /api/hr/payroll/:id/payslip/pdf` |

---

## Phase 10 — Communication & Notifications

| Feature | Backend | Frontend |
|---|---|---|
| **SMS service** (Africa's Talking / generic gateway) | `smsService.js` | — (backend only) |
| **Email service** (Nodemailer — already have) | `emailService.js` | — |
| **Forgot/reset password** | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | ForgotPasswordPage, ResetPasswordPage |
| **Self-registration** | `POST /api/auth/register` | RegisterPage |
| **Grade-posted auto-notifications** | Auto-triggered on grade save | — (uses existing NotificationBell) |
| **Announcement targets** (by grade/section/role) | Add `audience_type` + `audience_id` to announcements | CreateAnnouncementModal with targeting |
| **Parent-teacher messaging** (SMS fallback) | Enhance existing chat module | Enhance existing ChatPage |

### Role Access

| Feature | super_admin | owner | admin | teacher | student | parent | finance | hr |
|---|---|---|---|---|---|---|---|---|
| Forgot/reset password | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Self-register | — | — | — | — | — | ✓ (parent) | — | — |
| Grade notifications | — | ✓ | ✓ | — | ✓ (own) | ✓ (child) | — | — |
| Targeted announcements | — | ✓ | ✓ | ✓ | — | — | ✓ | ✓ |

---

## Phase 11 — Localization & School-Specific

| Feature | Details |
|---|---|
| **i18n (Amharic + English)** | React context-based, translation JSON files |
| **Ethiopian Calendar (E.C.)** | Date converter utility, display alongside Gregorian |
| **Local payment methods** | Telebirr, CBE Birr in PaymentsPage |
| **Ethiopian grading scale** | A+ (95-100), A (90-94), A- (85-89), B+ (80-84), B (75-79), B- (70-74), C+ (65-69), C (60-64), C- (55-59), D (50-54), F (<50) with GPA 4.0 equivalents |

---

## Phase 12 — Polish & Infrastructure

| Feature | Backend | Frontend |
|---|---|---|
| **Backup & restore** | `POST /api/operations/backup`, `POST /api/operations/restore` | BackupPage |
| **Offline attendance sync** | `POST /api/attendance/sync` (bulk upsert) | Enhanced AttendancePage |
| **Timetable auto-generation** | `POST /api/academic/timetable/generate` | TimetablePage (generate button) |
| **Parent portal** | Existing + new endpoints | ParentDashboard component |
| **Loading skeletons** | — | All pages (replace "Loading..." text) |
| **Mobile responsiveness** | — | Full pass |

---

## Summary: New Database Migrations Needed

| # | Migration | Tables |
|---|---|---|
| 025 | Student lifecycle | student_promotions, student_graduations, student_transfers, student_documents, student_medical, student_discipline, student_achievements, student_status_history |
| 026 | Operations | books, book_borrowings, transport_routes, transport_allocations, hostel_rooms, hostel_allocations |
| 027 | HR enhancements | tax_brackets, leaves, payroll_audits |
| 028 | Auth enhancements | password_reset_tokens |

---

## Build Order (Priority)

1. **Phase 6** — Student lifecycle (enrollment, promotion, graduation, documents, medical, discipline, achievements)
2. **Phase 8** — Tax brackets, leave management, payslip PDF, payroll audit
3. **Phase 9** — PDF generation (report cards, invoices, payslips)
4. **Phase 7** — Operations (library, transport, hostel)
5. **Phase 10** — Forgot/reset password, registration, SMS, grade notifications
6. **Phase 11** — i18n, Ethiopian calendar, local payments, grading scale
7. **Phase 12** — Backup, offline sync, timetable auto-gen, skeletons, mobile
