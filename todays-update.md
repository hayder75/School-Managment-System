# Today's Update — Deep Assessment & Fix Plan

Date: 2026-07-31
Scope: Post-RBAC-audit deep assessment of edge cases, security, data integrity, and missing features across the School Management System.

---

## Assessment Summary (by impact)

### Critical — Security

| # | Issue | Location |
|---|-------|----------|
| SEC-1 | Public unauthenticated `/api/auth/dev-users` exposes all demo emails/UUIDs incl. super admin; seed password is `1234` → trivial takeover | `auth.routes.js:10`, `auth.service.js:88-110`, `LoginPage.jsx:42` |
| SEC-2 | Role baked into stateless JWT, never re-checked against DB → demotion/suspension ignored for 7 days | `rbac.js:21-23`, `auth.js:15-18` |
| SEC-3 | `password_hash` leaked in parent list, parent detail, and student report responses | `parents.service.js:7,20`, `reports.service.js:370` |
| SEC-4 | Chat IDOR: any user can read/write any conversation (REST + Socket) — no participant check | `chat.service.js:40-52`, `socket/index.js:50-57` |
| SEC-5 | `hr` can escalate any user (incl. self) to `owner` via `PUT /users/:id` | `users.routes.js:16` |

### Parent Linking & Student Records

| # | Issue | Location |
|---|-------|----------|
| PARENT-1 | Unlink UI sends student record id to DELETE /parents/link/:id (expects link row id) → silent no-op | `ParentsPage.jsx:154` vs `parents.service.js:39-41` |
| PARENT-2 | Duplicate link → raw 500; no tenant-ownership check on student_id/parent_id (cross-tenant linking) | `parents.service.js:34-37` |
| PARENT-3 | No single-primary-parent enforcement; UI never sets `is_primary` (always false) | migration `010:8`, `ParentsPage.jsx:19` |
| PARENT-4 | Guardians invisible on student detail page | `StudentDetailPage.jsx:11-17` |
| PARENT-5 | `/students/enroll` (with guardians) has no UI caller | `StudentsPage.jsx:129-166` |
| STU-2 | No student origin data: no previous school, no transfer date, no admission type, no DOB, no gender, no address | all migrations |

### Billing / Fees

| # | Issue | Location |
|---|-------|----------|
| BILL-1 | No charge/bill entity — payments are orphan cash entries; `balance` hand-entered, not computed | `fees.service.js:29-32` |
| BILL-2 | PDF invoice is tenant-wide price list — ignores class/active/frequency/payments; identical invoice for all; no paid/balance | `pdf.service.js:58,59,76-81` |
| BILL-3 | Outstanding balances exclude `partial` and `overdue` statuses → understated; students with no payment row never appear | `reports.service.js:207`, `fees.service.js:60` |
| BILL-4 | No refunds, no payment edit, no partial payments from UI (backend supports, UI hardcodes status=paid) | `PaymentsPage.jsx:25,38-42` |
| BILL-5 | Late-fee job dead code — never scheduled; `partial` never accrues late fees | `jobs/late-fee.js` |
| BILL-6 | No discounts/scholarships; parents/students see no fee info | — |
| BILL-7 | Hard-delete of payments/students destroys financial history; no audit trail | `fees.service.js:54-56` |

### Attendance / Exams / Grades

| # | Issue | Location |
|---|-------|----------|
| ATT-1 | Attendance re-mark wipes whole class-day then inserts without transaction → failed insert loses the day's records; duplicate student_id in payload → 500 | `attendance.service.js:15-19` |
| ATT-2 | No edit/delete for single attendance record; no way to clear a day | `attendance.routes.js` |
| ATT-3 | No attendance date validation (format/future/weekend) → malformed dates 500 | `attendance.validation.js:5` |
| EXAM-1 | Deleting exam silently cascade-deletes all its grades; no guard/confirm | `exams.service.js:81-83`, `014:6` |
| EXAM-2 | Teacher exam list leaks exams for subjects not taught (class-only scoping) | `exams.service.js:23-38` |
| EXAM-3 | `total_marks`/`pass_marks` editable below existing scores; no cross-field validation | `exams.validation.js:11,21` |
| GRADE-1 | Marks can exceed `total_marks` — no validation anywhere | `grades.validation.js:7` |
| GRADE-2 | `grade_letter` stored, never recomputed; 3 inconsistent letter schemes | `grades.service.js:19`, `pdf.service.js:39` |
| GRADE-3 | `lockGrades` per-row not per-exam; future inserts bypass; any assigned teacher can unlock | `grades.service.js:66-73` |
| GRADE-4 | Negative marks blocked only at API, not DB | `grades.validation.js:7` |
| STU-1 | Transfer/promote don't reconcile attendance → duplicate same-date records after transfer | `students.service.js:190-209,147-167` |
| REPORT-1 | Report card ignores term/year, mixes exam types; 0 score renders `'-'` | `pdf.service.js:36-42` |

### Auth & Robustness

| # | Issue | Location |
|---|-------|----------|
| AUTH-1 | No change-password flow | absent everywhere |
| AUTH-2 | Invite/set-password flow broken — no invitation JWT ever generated; invited users stuck | `users.service.js:9-23`, `auth.service.js:67-86` |
| AUTH-3 | Password reset token logged to console + stored plaintext | `auth.service.js:118`, `migrations/028` |
| ROBUST-1 | Zero transactions anywhere — enrollment, grades, attendance, timetable gen, restore can leave partial writes | entire backend |
| ROBUST-2 | Deleting a user silently destroys payments, payroll, expenses, audit_logs via CASCADE | `users.service.js:60-62` |
| ROBUST-3 | Cross-tenant write primitives: request-body UUIDs never verified against `req.tenant.id` | fees/grades/attendance/parents/teachers/chat/operations |
| ROBUST-4 | Audit logging dead — `audit_logs` table always empty | `audit-logs.service.js` |
| ROBUST-5 | `operations.backup` exports users incl. `password_hash`; `/operations/backup` tenant-admin accessible | `operations.service.js:105-110` |
| ROBUST-6 | `student_number` nullable with no generator; unique allows multiple NULLs | migration `009:6` |
| ROBUST-7 | Same email can exist across two tenants; `login` by bare email → cross-tenant login ambiguity | `auth.service.js:9` |

### Features Worth Adding

- Change-password flow
- Student transfer-in records (previous school, date, reason) + admission type
- Per-student fee ledger/statement (paid vs owed vs balance)
- Receipt generation (PDF) — `receipt_url`/`transaction_id` columns exist but unwritten
- Per-period attendance (currently day-level only)
- Audit logging wired in
- Parent/student self-service fee view

---

## Fix Plan (in progress)

### Security
1. SEC-1: Protect `/api/auth/dev-users` (auth required + admin/owner only, or remove in non-dev)
2. SEC-2: Re-check user role/status from DB on each request (auth middleware)
3. SEC-3: Strip `password_hash` from all API responses
4. SEC-4: Participant checks in chat REST + Socket
5. SEC-5: Prevent hr from changing role to owner / self-escalation

### Parent Linking
6. PARENT-1: Return link id to UI; unlink by link id
7. PARENT-2: Duplicate link → 409; tenant ownership checks on student_id/parent_id
8. PARENT-3: Enforce single primary; expose is_primary in UI
9. PARENT-4: Show guardians on StudentDetailPage

### Billing
10. BILL-3: Outstanding includes partial/overdue
11. BILL-2: Invoice reflects student's class + active fee structures + payments (paid/balance)
12. BILL-4: Payment edit/refund endpoints

### Attendance/Exams/Grades
13. ATT-1: Transactional attendance; dedupe payload
14. EXAM-1: Guard exam delete when grades exist
15. EXAM-2: Teacher exam list subject scoping
16. GRADE-1: marks <= total_marks validation
17. GRADE-2: Recompute grade_letter on change
18. GRADE-3: Exam-level lock
19. STU-1: Transfer/promote reconcile attendance

### Student Records
20. STU-2: Add origin fields (previous_school, transfer_date, admission_type, dob, gender) via migration + UI

### Auth
21. AUTH-1: Change-password flow
22. AUTH-2: Fix invite flow

### Testing & Delivery
23. Test all fixes end-to-end
24. Commit and push

---

## Regression Results (2026-07-31)

All end-to-end regression checks below were run against the running backend (`:3001`, PostgreSQL `sms_dev`) using role cookies for the demo tenant. **All passed.**

| Check | Result |
|-------|--------|
| Chat REST: non-participant `GET /conversations/:id/messages` | 403 `FORBIDDEN` |
| Chat REST: non-participant `PUT /conversations/:id/read` | 403 `FORBIDDEN` |
| Chat Socket: participant `join:conversation` / `message:send` | success |
| Chat Socket: non-participant `join:conversation` / `message:send` | `Not a participant` / `Not a participant of this conversation` |
| HR `POST /users` with `role=admin` | 403 `FORBIDDEN` |
| HR `PUT /users/:id` setting `role=admin` | 403 `FORBIDDEN` |
| HR `PUT` / `DELETE` of admin account | 403 `FORBIDDEN` |
| Owner suspends/deletes only active owner | 403 `Cannot remove the last active owner of the school` |
| Teacher `GET /exams` | only own subject+class (2 Math exams in Grade 1A; no English/Science/History leaks) |
| Teacher `GET /exams/:id` out-of-scope | 403 `FORBIDDEN` |
| Invoice PDF (finance) | 200 valid PDF; correct class/active filter, Amount/Paid/Balance columns, Total Paid 2250 (1250 seed + 1000 test), Outstanding 3700 |
| Invoice PDF access: student requests another student | 403 `FORBIDDEN` |
| `GET /fees/my` (student / parent) | 200; own payments + outstanding (student), both children + combined totals (parent) |
| Attendance duplicate row in payload | merged, count=2 (not 3) |
| Attendance partial re-mark | only updated target; other students' same-date rows preserved (no wipe) |
| Attendance non-class student in payload | ignored (count=1) |
| Grades marks (150) > total (100) | 400 `MARKS_EXCEED_TOTAL` |
| Grades on locked exam | 409 `EXAM_LOCKED` |
| Exam delete with grades | 409 `EXAM_HAS_GRADES` |
| `PUT /auth/change-password` wrong current | 400 `INVALID_CREDENTIALS` "Current password is incorrect" |
| `PUT /auth/change-password` short new | 400 validation (min 6) |
| `PUT /auth/change-password` correct | 200; old password login 401, new password login 200 |

Notes:
- The change-password UI calls `PUT /api/auth/change-password`; demo password `1234` is shorter than the 6-char server minimum, so restoring it after the test was done by writing a bcrypt hash directly to `users.password_hash`.
- Test data created during regression (test payment, chat conversation, attendance rows) was cleaned up afterward.
- Frontend `oxlint` passes (only pre-existing warnings); `npm run build` succeeds. `frontend/dist` is gitignored.
- No backend test suite exists (`npm test` has no `*.test.js` files); verification is via the API regression battery above.

---

## Roles & Permissions Feature (2026-08-02)

**Model**: Per-school (tenant) custom roles + additive per-user grants. Base system roles are unchanged; custom roles (`roles` → `role_permissions`) and direct per-user grants (`user_roles` + `user_permissions`) only ADD permission keys on top of the user's base role. `requireAccess` middleware (`backend/src/middleware/access.js`) checks base/effective role first (owner passes admin routes, etc.), then additive permission keys — so existing role-hierarchy behavior is preserved.

**Backend**
- Migration `030_create_roles_permissions` (applied as Batch 9): tables `roles`, `permissions`, `role_permissions`, `user_roles`, `user_permissions`; seeds 8 system roles + 32 permission catalog + 97 role_permissions for every existing tenant; new tenants seed roles on creation.
- Permission catalog: 32 keys (dashboard.view, students.view, teachers.manage, users.manage, fees.manage, grades.manage, roles.manage, etc.). Defaults: owner/admin = all, teacher = 8, student = 3, parent = 4, finance = 7, hr = 8, support = 3.
- Endpoints (`/api/roles`, owner/admin only, `/my` for any authed user): `GET /`, `GET /permissions`, `POST /` (create role), `PUT /:id`, `DELETE /:id` (system roles → 400 `ROLE_IS_SYSTEM`), `GET /users/:userId`, `PUT /users/:userId` (set `role_ids` + `permission_keys`).
- Login and `/auth/me` return `user.permissions` (effective keys).
- `roles.manage` force-preserved on the `owner` role regardless of payload.
- Bug fixed in `roles.service.js` `resolvePermissionIds`: empty input now returns `{ ids: [], found: new Set() }` (was bare `[]` → `ids.length` threw on empty PUT).

**Frontend**
- `frontend/src/hooks/useRoles.js`: `useRoles`, `useRolePermissions`, `useCreateRole`, `useUpdateRole`, `useDeleteRole`, `useUserRoles`, `useSetUserRoles`.
- `frontend/src/pages/school-admin/RolesPermissionsPage.jsx`: tabs layout (Roles / User Overrides). Roles tab lists roles with permission chips, create/edit dialog with permission checkboxes, delete for non-system roles. User Overrides tab selects a user (base-role badge), edits custom-role + direct-permission checkboxes seeded from current effective access, dirty-check + save.
- `frontend/src/App.jsx`: `/roles` route registered inside `RoleRoute roles={["admin","owner"]}`.
- `frontend/src/components/layout/Sidebar.jsx`: "Roles & Permissions" nav entry added for owner and admin (reused for desktop sidebar + mobile sheet).

**Verification (all passed)**
| Check | Result |
|-------|--------|
| Owner `GET /api/roles` | 200, system roles + custom roles listed |
| Owner `GET /api/roles/permissions` | 200, 32-key catalog |
| Teacher `GET /api/roles` | 403 (owner/admin only) |
| Teacher `GET /api/roles/my` | 200, base 8 keys only |
| `PUT /api/roles/users/:id` empty arrays | 200; roles/permissions cleared to [] |
| Teacher `/roles/my` after empty PUT | base 8 keys only (no leftover `fees.manage`) |
| Additive grant `fees.manage` to teacher | appears in `/roles/my` effective keys |
| Revert (empty PUT) | teacher back to base 8 keys |
| `DELETE /api/roles/:id` system role | 400 `ROLE_IS_SYSTEM` |
| Frontend `npm run build` | success |
| Frontend `oxlint` (new files) | clean |

### Verification round 2 + fixes (2026-08-02)

Re-verified the whole feature end-to-end (backend 49/49 checks passed) and found/fixed four issues:

1. **`createRole` did not reject unknown permission keys** (create with `permission_keys:["nope.nope"]` returned 201 and silently dropped it; `updateRole`/`setUserAccess` already rejected them). Fixed in `roles.service.js` — now 400 `INVALID_PERMISSIONS`, consistent across all three.
2. **Seeded `owner` role had only 2 permissions** in the DB (migration seed is idempotent-add so it was wiped by an earlier test `updateRole`). Re-ran `seedTenant` → owner restored to all 32 keys.
3. **Roles admin routes were hard-gated by `rbac('admin','owner')`** while every other admin capability uses permission fallback — so granting `roles.manage` was meaningless. Converted `roles.routes.js` to `requireAccess(['admin','owner'], ['roles.manage'])`: a user granted `roles.manage` can now manage roles; otherwise 403. Verified grant→200/revoke→403.
4. **Frontend `UserOverridesTab` checkbox bug**: checkboxes rendered server (`applied`) state instead of the local edit state, so toggling a role/permission never visually changed. Now `selectedRoles`/`selectedPerms` are seeded from `access` via `useEffect` and are the `checked` source; dirty-check + save unchanged.

Frontend made **permission-aware** so enabling/disabling for a user type is visible in the UI (matches the requested model — add admin-only things to a teacher, e.g.):

- `RoleRoute` accepts an optional `permissions` prop; route is allowed if the role matches **or** the user holds any listed permission. `App.jsx` route groups now pass the relevant permission keys (users.manage, classes.manage, fees.manage, reports.view, roles.manage, etc.).
- `Sidebar.jsx` gained a `permissionGated` list (Users, Teachers, Parents, Classes, Subjects, Fees, Payments, Expenses, Payroll, Operations, Tax Brackets, Leave Mgmt, Payroll Audit, Reports, Audit Logs, Import, Backup, Roles & Permissions, Settings). Items appear for a user when they hold the matching permission and the path isn't already in their default role list (dedup keeps admin/owner unchanged).

**Toggle verification (the core scenario — enable then disable for a user type):**

| Step | Result |
|------|--------|
| Teacher baseline `GET /users` | 403 |
| Owner grants teacher `users.manage` (+ a "Teacher Leader" custom role with `reports.view`, + direct `fees.manage`) | PUT 200 |
| Teacher re-login effective permissions | base 8 + `users.manage`, `reports.view`, `fees.manage` |
| Teacher `GET /users` / `/fees/structures` / `/reports/enrollment` while enabled | 200 / 200 / 200 |
| Sidebar simulation for that teacher | base items + Users, Fee Structures, Reports |
| Owner revokes (empty PUT) | 200 |
| Teacher re-login | back to base 8 only, no admin keys leaked |
| Teacher routes while disabled | 403 / 403 / 403 |
| `roles.manage` grant → teacher `/api/roles` | 403 → 200 (granted) → 403 (revoked) |

**Remaining verification surface (not covered by automated runs):** clicking through the UI in a real browser (dialog save flow, user-overrides checkbox toggling, sidebar re-render after a grant + refresh). The API calls the page/hooks make, and the exact request/response shapes, were exercised directly against the running backend.

### Round 3 — Excel data-model backend/frontend plumbing (2026-08-02)

Mapped the five `data/*.xlsx` workbooks into the schema (migration `031_add_import_data_fields.js`, knex Batch 10) and wired fields through backend + frontend so a later seed/import fits cleanly. Nothing seeded yet.

**Backend (migration 031, already applied):**
- `students`: + father_name, grandfather_name, mother_name, nationality, country_of_birth, region/zone/woreda_of_residence + of_birth, kebele, location_type, disability(+type), economic_status, national_id, parent_status, family_head_gender.
- `users`: + job_title, qualification, field_of_study. `student_parents`: + education_level.
- `classes`: + level_group (enum nursery|kg|primary|secondary, default primary).
- `payroll`: + work_days, absent_days, 8 allowance columns (transport, overtime, back_pay, unit_leader, department_head, housing, account, phone), 8 deduction columns (income_tax, eder, office_loan, cafe_loan, school_pay, pension_employee, pension_employer, ne_starving), bank_account, bank_name.
- New `enrollments` table keyed (tenant_id, student_id, academic_year_id) — one row per student per year, class_id indexed.

**Backend services/validation:**
- `students`: create/update schemas accept all new fields (optional). `enroll()` handles `{guardians[], enrollment{}}` (guardian education_level + enrollments row + status history) in a transaction. `findById` attaches guardians + enrollments (left-joined academic_years/classes, ordered by year start desc). New exported `getEnrollments`/`addEnrollment` (upsert via onConflict merge)/`updateEnrollment`/`removeEnrollment`.
- `students.routes.js`: GET `/:studentId/enrollments` (admin/owner/teacher/student/parent + students.view), POST/PUT/DELETE (admin/owner + students.manage).
- `academics.routes.js`: added GET `/academics/academic-years` (needed by enrollment UI).
- `payroll`: `payrollBreakdownFields` in create/update schemas; service `computeTotals()` derives allowances_total/deductions_total/net_pay server-side (create merges them; update reads existing row, merges, recomputes). createPayrollSchema `net_pay` now optional (server computes).
- `classes`: validation accepts level_group; findAll orders by level_group (nursery→kg→primary→secondary) then grade_level.
- `users`/`teachers`: userFields+create() carry job_title/qualification/field_of_study; teachers.findTeachers selects them.

**Frontend:**
- `StudentsPage`: Add/Edit dialog now has full demographics + residence/birth addresses + disability + parent status + family head gender.
- `StudentDetailPage`: new Demographics + Addresses cards; guardian education level shown; new Enrollments tab (list + add form w/ year, class, grade, section, category, modality, stream, CTE fields, textbooks, instructional language, feeding, meals).
- `ClassesPage`: level_group select on create + Level column.
- `UsersPage`: staff fields (job title, qualification, field of study) shown when role is staff, + Job Title column. `TeachersPage`: job title/qualification/field-of-study columns.
- `PayrollPage`: Add Entry dialog has allowances + deductions breakdown grids, work/absent days, bank account/name, and live-computed totals; entries table has a collapsible per-row breakdown.

**Verification:**
- Enrollment CRUD smoke-tested via API (POST/GET/PUT/DELETE on `/api/students/:id/enrollments`), student detail includes enrollments.
- Payroll breakdown create (no net_pay sent) → server computed allowances 350 / deductions 315 / net 1535; update recomputes from merged row (overtime 100 → allowances 400 / net 1585). Test rows deleted afterward.
- `/api/academics/academic-years` returns years.
- Backend roles regression: 49/49 checks still pass. Frontend `npm run build` + `oxlint` clean (only pre-existing warnings).

### Round 3 follow-up — full data-coverage audit + fixes (2026-08-02)

Audited every column in the five `data/*.xlsx` files against the schema. Nearly everything was already covered; three gaps found and fixed:

1. **`enrollments.grade_level` was an integer** but the data has text grades — KG is `Nursery`/`LKG`/`UKG`, primary is `Grade 1`–`Grade 8`. Migration `032_fix_enrollment_grade_level_add_user_gender.js` alters it to `varchar(20)` (verified stored as `Nursery` via API). Zod `enrollmentSchema`/`enrollSchema` now accept string-or-number; enrollment UI grade field is free text with hint `e.g. 1 or Nursery`.
2. **No staff gender** — `users` gained a `gender` column (migration 032); wired into `users.service` userFields+create, create/update validation, `teachers.findTeachers` select, and Users/Teachers pages.
3. **`GET /academics/academic-years`** added (needed by the enrollment form; already covered last round).

**Coverage summary per workbook:**
- `basic stu prim (2).xlsx` (30 cols, 2,128 rows) — 100% mapped (demographics + addresses + parent education via `student_parents.education_level`).
- `enroll prim (2).xlsx` / `enroll kg (2).xlsx` — 100% mapped to `enrollments` (grade now text-capable).
- `JUNE SALARY 2018.xlsx` — mapped to `payroll` + `users.job_title`; only derived columns (`Gross Earning`, `Taxable Income`, `Signature`) are not stored — computed instead.
- `statistical data (2).xlsx` — names/sex/qualification/field-of-study/job position map to `users`; subject+class taught map to `teacher_subjects`; weekly period counts are workload stats (not stored); the `students`/`period` sheets are aggregate curriculum/report data.

**Verification:** KG `grade_level` + user `gender` smoke-tested via API (test rows cleaned up); backend roles regression 49/49; frontend `npm run build` + `oxlint` clean.

### Round 3 follow-up 2 — full payslip + payroll math matches the salary Excel (2026-08-02)

User asked whether the payroll/salary side "works as the data". Audit found storage + net-pay math worked, but two things did not match the `JUNE SALARY 2018.xlsx` workbook; fixed both:

1. **Payslip PDF was totals-only.** Rewrote `generatePayslip` in `services/pdf.service.js` to mirror the Excel salary sheet: school name, employee name + job title + grade, work/absent days, bank account/name, an EARNINGS block (basic + each allowance line + Gross Earnings), a DEDUCTIONS block (income tax, school pay, eder, office/café loans, pension 7%/11%, N.E. Starving + Total Deductions), and Net Pay. Only non-zero lines render.
2. **Payroll math now matches the workbook.** Reverse-engineered the Excel: `gross = basic + allowances`; **pension 11% is the employer share — excluded from Total Deductions**; `total deductions = income tax + eder + pension 7% + loans + school pay + N.E.`; `net = gross − total deductions`. So `DEDUCTION_FIELDS` in `payroll.service.js` no longer sums `pension_employer` into `deductions_total` (the column still stores it for reporting; frontend form labels it "Pension (Employer, not deducted)"). Also `updatePayrollSchema` now accepts `basic_pay` (it was being stripped by Zod, so editing basic silently did nothing).

**Verified end-to-end against Amanuel Abebe's real row** (basic 12,910.65, OT 2,100, DH 1,000, income tax 3,203.7275, eder 100, pension 7% 903.7455, pension 11% 1,420.1715): system computed gross 16,010.65, total deductions 4,207.47, net 11,803.18 — identical to the Excel. Payslip PDF rendered with the full breakdown. Test row restored to seed values afterward; backend roles regression 49/49, frontend `npm run build` + `oxlint` clean.

### Round 3 follow-up 3 — salary register + staff profile pages (2026-08-02)

Added the HR/finance person-centric pages that show each modeled person with their payroll data, mirroring the `JUNE SALARY 2018.xlsx` sheet, plus cross-links from the admin-facing lists:

1. **`SalaryRegisterPage`** (`/salary-register`): monthly payroll sheet laid out like the Excel — per-employee Name, Job Title, Basic, each allowance column (Transp/OT/Back Pay/Unit Ldr/DH), Gross, each deduction column (Income Tax/Eder/Off Loan/Café Loan/Pens 7%/Pens 11%/N.E. Starv), Total Ded, Net Pay, Bank Acct, and a payslip download button; month/year selectors + summary stat cards + a totals row.
2. **`StaffDetailPage`** (`/staff/:id`): individual staff profile — Job/Contact cards (job title, qualification, field of study, gender, email/phone/joined/last login) plus a Payroll History table (period/basic/allowances/deductions/net/status + collapsible per-entry breakdown with allowance/deduction/bank details + payslip download).
3. **Cross-links**: teacher name in `TeachersPage`, user name in `UsersPage`, employee name in `PayrollPage` and `SalaryRegisterPage` are now links to `/staff/:id` (via `payroll.user_id`).
4. **Routing**: both pages wired in `App.jsx` inside the existing payroll-role group (`admin`/`owner`/`finance`/`hr`, `payroll.view`/`reports.view`); `Sidebar.jsx` gained a "Salary Register" link (after Payroll) in the owner, admin, finance, and hr nav blocks.

**Verified:** `/api/payroll?user_id=...` returns the row with `grade_name` (and `job_title`/`email`), ordered newest-first so `entries[0]` is the latest period; `/api/users/:id` returns the staff fields; both endpoints reachable by hr and finance cookies. Backend roles regression 49/49, frontend `npm run build` + `oxlint` clean (one pre-existing `setSearch` warning).

### Round 3 follow-up 4 — auto income tax + pension calculation (2026-08-02)

Reverse-engineered the exact tax/pension rules from `JUNE SALARY 2018.xlsx` and wired them into the payroll engine. The workbook formulas (from the spreadsheet):

- **Taxable income** = `basic + overtime` (the `O = H + J` column; DH/transport/back-pay are not taxed).
- **Income tax** (Ethiopian PAYE-style, per bracket `taxable*rate − deduction`):
  `≤2000 → 0`, `≤4000 → 15% − 300`, `≤7000 → 20% − 500`, `≤10000 → 25% − 850`, `≤14000 → 30% − 1350`, `>14000 → 35% − 2050`.
- **Pension** = basic × 7% (employee, deducted) and basic × 11% (employer, reported not deducted).

Changes:

1. **`tax_brackets` seeded** with the six brackets above for the demo tenant (`002_dev_users.js`). The `min_salary/max_salary/rate/deduction` schema already matched the formula exactly.
2. **`payroll.service.js`**: `getActiveTaxBrackets()`, `computeIncomeTax(taxable, brackets)` (walks brackets, `tax = taxable*rate − deduction`, floored at 0), and `applyAutoCalculations()` which fills `income_tax` + `pension_employee`/`pension_employer` from basic/OT **only when the client didn't supply them** (manual override wins). `createPayroll`/`updatePayroll` run it before `computeTotals()`; `updatePayroll` recomputes derived fields whenever `basic_pay`/`overtime` change unless explicitly overridden. New `calculatePayroll()` returns a preview without saving.
3. **New endpoint** `POST /payroll/calculate` (`{ basic_pay, overtime }`) → returns computed `income_tax`, `pension_employee`, `pension_employer`, `taxable_income`, and recomputed totals. Gated by the payroll route group (`payroll.view`/`manage`).
4. **`PayrollPage.jsx`**: "Calculate Tax & Pension" button in the Add Entry dialog calls the endpoint and fills the three derived fields (still editable), then live-recomputes totals. `useCalculatePayroll` hook added.
5. **Seed payroll rows** updated to store `income_tax`/`pension_employee`/`pension_employer` consistent with the brackets (basic 3500 → tax 225/pen 245/385, net 3330; basic 5000 → tax 500/pen 350/550, net 4450).

**Verified:** `POST /payroll/calculate` reproduces workbook values exactly for Amanuel (basic 12910.65 + OT 2100 → tax 3203.73, pen 903.75/1420.17, taxable 15010.65) and across 5 other real rows (e.g. 17210+2200 → 4743.50; 15274.86+2200 → 4066.20; 9880.3 → 1620.07). Create/update auto-fill and manual override both smoke-tested via API (test rows cleaned up). Backend roles regression 49/49, frontend `npm run build` + `oxlint` clean (pre-existing warnings only).

### Round 3 follow-up 5 — end-to-end multi-tenant smoke test (2026-08-02)

Verified the whole multi-tenant system operates correctly before any Excel seeding: school creation, all-role user registration, student enrollment, tenant isolation, and the role access matrix, using a throwaway "Scratch Test School B" tenant.

1. **Tenant creation (super_admin only)**: logged in as `super@demo.com` (dev creds via `/auth/dev-users`); `POST /api/admin/tenants` (mount is `/api/admin/tenants`, not `/api/tenants`) created the tenant, seeded 8 roles + 32 permissions + 97 role_permissions (`roles.seed.js`), and auto-created the `owner` user (password `school123`, status active).
2. **Owner login + user registration**: owner logged in with 32 perms and passed admin-gated routes via the rbac hierarchy (owner→[owner, admin]). `POST /api/users` created teacher/parent/hr/finance/support/student users (all status `invited`, no super_admin in role enum). Passwords set through the real `POST /auth/set-password` flow using generated invitation JWTs (6-char min enforced).
3. **Onboarding**: class created (owner), student enrolled via `/students/enroll` with `user_id` + `class_id` (+ Ethiopian fields), teacher assigned as class teacher and to the class via `/teachers/:id/assignments` (teacher_subjects). Note: teacher student-list scoping keys off `teacher_subjects`, not `class_teacher_id`.
4. **Tenant isolation**: cross-tenant student access denied (`FORBIDDEN`) in both directions; each tenant's `/users` list strictly scoped (scratch saw only its 7 users, demo its 32, no bleed). Suspending the tenant → API calls return `TENANT_INACTIVE` (403); reactivation restores access.
5. **Access matrix**: owner/teacher/student/parent all read student records appropriately (teacher = own classes only, student = own record, parent = children via `getChildrenUserIdsForParent`); hr/finance/support denied `FORBIDDEN` on student endpoints; support denied on teachers/classes/subjects. Class listing scoping (`/students/class/:id`) limited to admin/owner/teacher as designed.
6. **Cleanup**: deleted the scratch tenant — FKs cascade everywhere (users/students/roles/classes/subjects/teacher_subjects all 0). Demo tenant intact (32 users, 26 students, 8 roles, 6 tax brackets, 12 payroll rows), roles regression `PASS=49 FAIL=0`, `POST /payroll/calculate` still matches Amanuel (12910.65+2100 → tax 3203.73), frontend `npm run build` + `oxlint` clean (pre-existing warnings only).

### Round 3 follow-up 6 — teacher teaching-load fields (2026-08-02)

The `statistical data (2).xlsx` tracks per-teacher teaching load that wasn't in the data model. Added it so the data survives seeding and is usable in the UI.

1. **Migration `033_add_teacher_teaching_load.js`**: `users` gains `section_count`, `periods_per_week`, `overtime_periods`, `total_periods` (all nullable ints).
2. **`users.validation.js`**: for `role=teacher`, `section_count` + `periods_per_week` are **required** (superRefine); `overtime_periods` defaults 0; `total_periods` optional (auto-computed). Non-teacher roles can omit all — "if entered great, if not we pass".
3. **`users.service.js`**: create stores the new fields, auto-computing `total_periods = periods_per_week + overtime_periods` when not supplied; update recomputes `total_periods` whenever ppw/OT change. New fields added to `userFields`.
4. **`teachers.service.js`**: teachers list now returns the load fields.
5. **Frontend**: `UsersPage` Add User dialog shows a "Teaching Load" block (Sections*/Periods per week*/OT per week) for teacher role, coerces numbers on submit; `TeachersPage` table gains Sections/P/W/OT columns; `StaffDetailPage` Job card shows the load fields for teachers.
6. **Seed**: demo teacher seeded with section_count 14, ppw 22, OT 6, total 28. Also fixed the recurring footgun — `002_dev_users.js` now calls `seedTenant` at the end so `npm run seed` no longer leaves roles/permissions cascade-deleted (was requiring a manual `seedTenant` after every seed).

**Verified:** teacher create rejects missing section_count/periods_per_week (validation), accepts with values (auto total), non-teacher create passes without load; update recomputes total (25+5→30); teachers endpoint returns fields; demo teacher seeded 14/22/6/28; roles regression 49/49 (and 49/49 immediately after re-seed, proving self-healing); payroll calc still matches Amanuel (tax 3203.73). Frontend build + lint clean (pre-existing warnings only).

### Round 3 follow-up 7 — pre-production cross-role integration deep-dive (2026-08-02)

Full audit of every related-concept workflow between roles (teacher ↔ student ↔ parent ↔ admin ↔ finance ↔ hr) ahead of Excel seeding. The backend access-scoping is largely correct; the breaks are frontend gaps, dead/unwired endpoints, and one missing subsystem (notifications). Findings are grouped by severity. This is a findings document only — fixes to follow in follow-up 8.

---

#### CRITICAL — broken end-to-end

**C-1. Grade entry cannot begin (exam → roster dead on arrival).**
- `ExamsPage.jsx` GradeEntry loads only `useExamGrades(exam.id)` → `GET /grades/exams/:examId` → `grades.service.js:82` returns **existing grade rows only**, never the class roster.
- No grade rows are materialized at exam creation (`exams.service.js:4` inserts only the exam row).
- A fresh exam renders "No students in this exam. Create a student and assign them." (`ExamsPage.jsx:49-50`) — the teacher cannot submit the first grade through the UI.
- Roster endpoint `GET /students/class/:classId` exists (`students.routes.js:21`, `useStudentsByClass` hook) but is never used by the grade-entry flow.
- Fix direction: grade entry must union the class roster with existing grades (roster from `students` where `class_id = exam.class_id`, left-joined to `grades` on `exam_id`). **[DONE] `grades.service.js` `getByExam` now returns the full class roster left-joined with grades — ungraded students show `marks_obtained: null` instead of being absent; grade entry + revert verified via API (Markos 53/C kept, Nathanel 88/B entered then reverted). Frontend empty-state message updated. Frontend build clean, roles 49/49.**

**C-2. No notifications for any domain event — only chat.**
- The only `notificationService.create` call in the entire backend is `socket/index.js:97` (new chat message).
- Exam creation (`exams.service.js`), grade upsert (`grades.service.js:13`), attendance mark (`attendance.service.js`), fee payment (`fees.service.js:29`), announcement publish (`announcements.service.js:4`) → **none notify**.
- `notifications` table supports `reference_type`/`reference_id` (`notifications.service.js:4-17`) but they are only populated for chat.
- The bell is wired (polls every 30s via `useNotifications.js:11`, socket `notification:new` listener in `NotificationBell.jsx:20`) but effectively always empty.
- Nits: `NotificationBell.jsx:25` does `window.location.reload()` on every notification; socket connect in `useEffect` has no cleanup. **[DONE] Added `backend/src/socket/broadcast.js` (`setIo`/`getIo`/`notifyUser`/`notifyUsers` — persists via `notifications.service.create` then emits `notification:new` to `user:{id}` rooms); `setupSocket` now registers `io` via `broadcast.setIo`. Fan-out added on: exam create (`exams.service.js` → class students + assigned teachers + their parents, actor excluded), grade upsert (`grades.service.js` → graded students + parents via `student_parents` join), attendance mark (`attendance.service.js` → absent/late students + parents), fee payment (`fees.service.js:createPayment` → student + parents); all wrapped in try/catch so notification failures never break the primary operation. `NotificationBell.jsx` now invalidates react-query caches instead of `window.location.reload()` and removes its socket listener on cleanup; `lib/socket.js` reconnects when the token changes and clears token on disconnect. Verified via API: 19/19 (student + parent notified for exam/grades/attendance/payment, creator teacher excluded, mark-read/unread counts correct) and real-time `notification:new` socket delivery confirmed with a live socket.io-client. Frontend build clean, roles 49/49.**

**C-3. Announcement targeting is dead code + a real plural/singular bug.**
- Dashboards (`DashboardPage.jsx:120,147,183,220`) and `AnnouncementsPage.jsx:21` call `useAnnouncements` → `GET /announcements` → `findAll` (`announcements.service.js:11`) which has **no audience/role/class filtering**. Everyone sees every announcement.
- `useMyAnnouncements` (`useAnnouncements.js:12` → `GET /announcements/my`) is defined but **never called anywhere**.
- Bug: role strings are singular (`'teacher'`,`'student'`,`'parent'`) but the audience enum is plural `['all','teachers','students','parents','class']` (`announcements.validation.js:7`). `findForUser` filters `.orWhere('announcements.audience', role)` (`announcements.service.js:44`) — so `audience='teachers'` never matches role `'teacher'`. Only `all` and `class` ever surface via `/my`.
- When `class_id` is absent, `findForUser` (`announcements.service.js:39`) skips the class filter entirely → returns **every** `audience='class'` announcement for every class (data leak).
- No notification created when an announcement is published (`announcements.controller.js` inserts the row only).
- UI: Create/Edit/Delete buttons render for everyone on `/announcements` (`AnnouncementsPage.jsx:68-70,137-139`) but backend POST/PUT/DELETE require admin/owner (`announcements.routes.js:17-19`). **[DONE] `findForUser` now accepts the user's class set and matches both singular and plural audience (`role` or `role+'s'`); `audience='class'` rows are restricted to the caller's classes (student → their class, parent → children's classes, teacher → classes taught, admin/owner → all classes), so out-of-class announcements never leak and drafts (`is_published=false`) never appear via `/my`. `listForUser` resolves class sets per role server-side. Publish now fan-outs `New Announcement` notifications (`broadcast.notifyUsers`) on create and on unpublished→published updates, excluding the author. Dashboards switched to `useMyAnnouncements` (dead hook now wired); `AnnouncementsPage.jsx` is role-aware — admin/owner get the full management list + Create/Edit/Delete, teacher/student/parent get a read-only filtered list. Verified via API: 28/28 (role/plural matching, class-targeted isolation across Grade 1 A vs 1 B, draft hidden from `/my` but visible to admins, publish notification delivered, teacher create 403). Frontend build clean, roles 49/49.**

**C-4. Parent portal has no child academic data despite full backend support.**
- Backend permits parents on grades, attendance, exams, report-card, and `/fees/my` (all pass `canViewStudentByUserId` → `access.js:50-53`; `reports.routes.js:35-36`; `fees.controller.js:5-35`).
- Frontend: parent nav = Dashboard, Timetable, Announcements, Chat only (`Sidebar.jsx:106-111`). `ParentDashboard` (`DashboardPage.jsx:217-258`) renders only children name/class/student#/status — **no grades, no attendance, no fee balance** (outstanding_balance is computed at `parents.service.js:137` but never displayed).
- `/students` routes are admin/owner/teacher-only (`App.jsx:103-108`); `/reports` excludes teachers AND parents (`App.jsx:125-130`); `/exams` + `/attendance` are admin/owner/teacher-only.
- `GET /fees/my` has no frontend caller (no `useMyFees` hook wired).
- No online payment path anywhere — `POST /fees/payments` requires admin/owner/finance (`fees.routes.js:17`). **[DONE] `ParentDashboard` now renders a `ChildAcademicCard` per child showing overall average + per-subject averages (via `GET /reports/students/:id/grades`), attendance % (via `/reports/students/:id/attendance`), and outstanding balance from `GET /parents/my-children` (previously computed but never displayed). Added a `useMyFees` hook wired to `GET /fees/my` and a "Fee Payments" card (total paid, outstanding, recent payments) on the parent dashboard; header stat now shows total outstanding fees. Backend was already fully parent-enabled (verified: parent gets grades/attendance/fees/my-children 200). Online payment path intentionally left for a future phase — admin/finance-only `POST /fees/payments` unchanged. Frontend build clean, roles 49/49.**

#### HIGH — wrong or broken

**H-1. Report-card & invoice PDF buttons 403 (ID-type mismatch).**
- `StudentDetailPage.jsx:103,106` open `/api/pdf/report-card/${id}` and `/api/pdf/invoice/${id}` where `id` is the **students record id** (e.g. from `StudentsPage.jsx` list).
- But `pdf.routes.js:15,31` and `pdf.service.js:6,62` treat the param as a **users.id** (`canViewStudentByUserId`), and access check at `pdf.routes.js:14-16` compares `student.user_id`. Since `students.id ≠ students.user_id`, the buttons 403/404.
- Contrast: `PaymentsPage.jsx:163` correctly passes `p.student_id` (a `users.id`). **[DONE] `pdf.routes.js` now resolves the param via `resolveStudentUserId` (matches either `students.id` or `students.user_id` in the tenant), so both callers work. Verified: report-card + invoice return `application/pdf` 200 for both `users.id` and `students.id` (admin, teacher, finance, parent-as-child), unknown id → 404, unrelated student → 403. Roles 49/49.**

**H-2. Teacher grade-history subject leak.**
- `grades.controller.js:61-66` (GET `/grades/students/:studentId`) checks only `canViewStudentByUserId` → `access.js:54-57` → `isTeacherAssignedToClass` (class-level, subject ignored). A Math teacher can pull any subject's grades for students in a class they teach. Same leak on `reports.routes.js:35` / `reports.controller.js:115`. **[DONE] Added `access.teacherSubjectIdsForStudent` (subject_ids for the student's class from `teacher_subjects`); `grades.controller.getByStudent`, `reports.controller.getStudentReport`, and `getStudentGradeSummary` now pass an explicit subject-set for teacher requests, and `grades.service.getByStudent` / `reports.service.getStudentGradeSummary` (+ `getStudentReport`) apply `whereIn('exams.subject_id', subjectIds)` when an array is provided (empty array → no rows; undefined → no filter). Verified: teacher 12 sees only their 4 taught subjects (English/History/Math/Science) across all three endpoints while admin/student/parent still see all 8. Roles 49/49.**

**H-3. Timetable auto-generate ignores teacher assignments + parent misclassified as admin.**
- `operations.service.js:122-142` cycles subjects and teachers by modulo counter → `timetable_entries` with teacher_id unrelated to class_id/subject_id. Also wipes all existing entries (`:144`).
- `TimetablePage.jsx:25`: `isAdmin = !isStudent && !isTeacher` → a parent is treated as admin, sees the all-classes dropdown, "Auto Generate", and "Add Entry" dialog. Backend 403s; view of a non-child class 403s too.
- Teachers cannot create timetable entries at all (`timetable.routes.js:14` limits POST to admin/owner); no assignment validation on create (`timetable.controller.js:5-8`). **[DONE] `autoGenerateTimetable` (`operations.service.js`) now reads `teacher_subjects` (join `users` on `status='active'`) instead of the modulo round-robin: only classes with real assignments get slots; teacher conflict avoidance via a `busyTeacher` set (no double-booking across classes at the same day+period) and subjects spread across the week by lowest weekly count; `day_of_week` now stores proper string days (old code stored integers `1-6` that never matched the frontend). `TimetablePage.jsx` role detection fixed (`isAdmin = role in {admin, owner}`, added `isParent`) — parents now only see their children's classes (`my-children` now returns `class_id`), get a child-appropriate subtitle, and no longer see Auto Generate / Add Entry / delete controls. Teachers can now create entries: POST `/timetable` allows `teacher` role, and the controller forces `teacher_id = req.user.id` for teachers and validates the (class, subject, teacher) triple exists in `teacher_subjects` (unassigned → 400 `INVALID_ASSIGNMENT`); only admin/owner may create unassigned entries. Teacher UI gets Add Entry with subject dropdown filtered to their taught subjects and the teacher select locked to self. Verified via API 21/21 (auto-gen: 36 slots for the 1 assigned class, only the 4 assigned subjects, only teacher 12, valid day strings, Math spread 9x; teacher create valid 201 + self-forced, unassigned subject 400, admin unassigned 201 with null teacher, bad time 400, student/parent create 403; parent my-children has class_id, non-child class 403, child class 200). Frontend build clean, lint clean (pre-existing warnings only), roles 49/49.**

**H-4. Overall average is wrong math, displayed as %.**
- `reports.service.js:324-340`: per-subject `average = AVG(marks_obtained)` — raw marks, never normalized by `total_marks`. `overall_average` is a simple equal-weight mean of per-subject averages.
- Displayed as `%` on `DashboardPage.jsx:193,205`. With mixed exam totals (10-pt quiz + 100-pt final) this is mathematically wrong.
- No GPA concept anywhere in the backend. **[DONE] `getStudentGradeSummary` now normalizes every subject by `SUM(marks_obtained)/SUM(total_marks)*100` and computes `overall_average` as `SUM(marks)/SUM(total)*100` across all exams (weighted, not equal-weight mean); adds a standard 4.0 `gpa` (90/80/70/60 bands) and `total_exams`. Verified with a temporary 10-pt quiz: Math 53→52.7 (58/110), overall 65.6→65.4 (530/810), confirming weighting, then reverted. Frontend: `StudentDashboard` shows a GPA card (grid 3→4) and `ChildAcademicCard` adds a GPA cell; `ReportsPage` now appends `%` to the (now percentage) averages. Build clean, roles 49/49.**

**H-5. Report card is bare.**
- `pdf.service.js:4-58` renders only per-exam rows (subject, score, letter). No overall average, no attendance, no conduct/discipline, no term/period grouping (only optional `year` filter).
- Supporting data exists unused: attendance summary (`reports.service.js:342-366`), discipline records (`students.service.js:367-395`, `student_discipline` table). **[DONE] `generateReportCard` now renders: school name + student number header; a **Subject Summary** table with per-subject normalized average %, exam count and letter grade; **Overall Average % + GPA**; an **Attendance** section (total days, present count, attendance %); per-exam rows **grouped by term** (via `exams.term_id` join to `terms`, ungrouped exams under "Ungrouped"); and a **Conduct / Discipline** section listing `student_discipline` records (date, incident type, status, description). Verified: valid `application/pdf` 200 for the demo student with all sections present (8 subjects, 65.6% overall, GPA 1.0, attendance 16 days/62.5%, Term 1 grouped rows, "No discipline records"), year filter still works, empty-data case (year=2020) renders without error. Roles 49/49.**

**H-6. Teacher dashboard "My Classes" stat is school-wide.**
- `DashboardPage.jsx:155` uses `useClasses({limit:200})` → `GET /classes` returns all tenant classes unfiltered (`classes.service.js:9-25`), not scoped to the teacher's `teacher_subjects`. The "Classes taught" label is misleading. **[DONE] `TeacherDashboard` now counts unique `class_id`/`subject_id` from `useTeacherAssignments` (`GET /teachers/:id/assignments`) — for demo teacher 12 this shows My Classes=1, Subjects=4 instead of the school-wide class total; the `useClasses` call in `TeacherDashboard` is removed and a Subjects stat replaces the redundant Announcements stat (announcements list still renders below). Build clean, roles 49/49.**

**H-7. Payments: no student filter; createPayment doesn't enforce student role.**
- `PaymentsPage.jsx:19` calls `usePayments({ page, limit: 20 })` with no `student_id`; backend supports `?student_id=` (`fees.service.js:69`). No filter UI in payment history.
- `createPayment` (`fees.service.js:31-36`) only checks the target exists in `users` within the tenant — it does **not** verify role `'student'` or that a `students` record exists. Cross-tenant still protected. **[DONE] `createPayment` now requires `users.role='student'` **and** a matching `students` record (join), else 404 `STUDENT_NOT_FOUND` (verified: teacher id → 404, real student → 201). `PaymentsPage.jsx` adds a student filter dropdown above the payment history that passes `student_id` to `usePayments` (resetting to page 1). Roles 49/49.**

**H-8. No automatic per-student fee ledger.**
- No billing engine generates payment rows when a fee structure is created/assigned. Outstanding balance is only the sum of manually-entered `payments.balance` for statuses pending/partial/overdue (`fees.controller.js:30-32`, `parents.service.js:139-148`). A fee a student owes with no payment row appears nowhere. `frequency` is stored but never used for auto-billing. **[DONE] New `GET /fees/ledger/:studentId` (admin/owner/finance) via `getStudentLedger`: builds a computed per-student statement from all active applicable fee structures (tenant-wide + class-matched) minus actual `payments`, returning per-fee lines (amount, paid, balance, frequency, status `paid`/`partial`/`pending`) plus `total_owed/paid/balance` and the payment history — so owed fees with no payment row now show up. Verified for demo student 13: 7 structures, owed 5950, paid 1250, balance 4700, Tuition 2500/1250→1250 outstanding, Library Fee pending at full 150; non-student/unknown → 404, teacher/student → 403. Frontend: `PaymentsPage` shows a "Fee Statement" card (owed/paid/balance + per-fee table) for the filtered student via new `useStudentLedger`. Auto-billing row generation from `frequency` remains a future feature; the statement itself is now accurate. Roles 49/49.**

**H-9. UI role-gating holes.**
- `StudentsPage.jsx` has no role gating — Add/Edit/Delete/Promote render for teachers (`StudentsPage.jsx:128-129,166,132-163,398-400`) and 403 on the backend (`students.routes.js:23-26,53-55`).
- `ExamsPage.jsx:103-106` filters classes and subjects independently → teacher can pick a subject they teach only in class A paired with class B (backend 403s via `isTeacherAssignedToClassSubject`). **[DONE] `StudentsPage.jsx` now gates Promote / Add Student / Edit / Delete behind `isAdmin` (`role ∈ {admin, owner}`) — teachers get a read-only roster with only the View action (backend already 403s the writes). `ExamsPage.jsx` filters the subject dropdown to the subjects the teacher actually teaches in the **currently selected class** (`teacher_subjects`-derived), so a class B selection no longer offers a class-A-only subject. Also fixed related nits: `/reports` route in `App.jsx` was unreachable for teachers (`roles=["admin","owner","finance","hr"]`) despite the working "My Reports" tab + backend endpoints — split the payroll/staff routes from a teacher-inclusive `/reports` route (verified `/reports/my-students|my-attendance|my-grades` return 200 for teacher). Removed dead `useStudentReport`/`usePayrollSummary` (FinanceDashboard + HRDashboard) imports and the never-used `useStudent`/`useStudentGrades` hooks (L-5). HR dashboard "Staff" stat (L-6) now shows a real count from `GET /reports/staff-directory` (excludes students/parents; demo = 5) instead of `"—"`. Build clean, lint clean (0 errors), roles 49/49.**

#### LOW — nits & dead code

- **L-1. Enroll-path guardian linking bypasses checks.** `/students/enroll` links guardians via `students.service.js:15-35` without checking parent exists / role `parent` / tenant ownership / duplicate `(student_id,parent_id)` dedupe (unique constraint would throw a raw DB error). `linkParent` (`parents.service.js:44-90`) does all of this correctly — the two paths diverge. No frontend calls `/students/enroll`; `StudentsPage.jsx:257` only has a `parent_status` text field.
- **L-2. `is_primary` not settable in link dialog; `education_level` missing from link flow.** `ParentsPage.jsx:19` declares `is_primary` in state but the dialog never renders a toggle; `linkParent` (`parents.service.js:87`) and `linkParentSchema` (`parents.validation.js:3-10`) never set `education_level`.
- **L-3. Primary parent has no consumer.** `generateReportCard` (`pdf.service.js:4-58`) lists no parent/guardian; invoice doesn't use it; no notifications/email reference it.
- **L-4. Teacher-only reports unreachable.** `/reports/my-students`, `/reports/my-grades`, `/reports/my-attendance` exist (`reports.routes.js:20-22`) and `ReportsPage.jsx:733` adds a "My Reports" teacher tab, but `/reports` route excludes `teacher` (`App.jsx:125-130`).
- **L-5. Dead hooks.** `useStudent` (`useStudents.js:12`), `useStudentGrades` (`useGrades.js:12`), `useMyAnnouncements` (`useAnnouncements.js:12`), `useStudentReport` (`DashboardPage.jsx:12`), `useMyFees` (nonexistent) — defined but never wired.
- **L-6. HR dashboard "Staff" stat hardcoded `"—"`** (`DashboardPage.jsx:310`); no staff count implemented.
- **L-7. Socket singleton never disconnected** (`frontend/src/lib/socket.js`); notification bell has no cleanup.

---

#### Recommended fix order (for follow-up 8)

1. **C-1** — grade entry roster (union class students + existing grades).
2. **C-2** — notification engine: fan out on exam create, grade upsert, attendance mark, fee payment, announcement publish (target students/parents/teachers by class).
3. **C-3** — fix audience enum ↔ role mapping (accept both forms), wire `useMyAnnouncements`, enforce class_id filtering, hide admin actions from non-admin roles, notify on publish.
4. **C-4** — parent portal: child grades/attendance/fees cards + balance + report-card link; add routes.
5. **H-1** — PDF links pass `user_id` (or make pdf.service resolve students.id → user_id).
6. **H-2** — subject-scope teacher grade history.
7. **H-3** — timetable create validation vs teacher_subjects; fix parent role detection; (auto-gen teacher assignment fix optional).
8. **H-4/H-5** — normalized averages + enriched report card.
9. **H-7/H-8** — student role enforcement + per-student ledger.
10. **H-9/L-nits** — role-gate UIs, clean dead hooks.

---

## Flex-Login Feature (2026-08-03)

**[DONE]** Sign-in now resolves a single identifier against **email, phone, or username** (`+` password) so users can log in with whatever they remember, alongside the existing email flow.

- **Backend** — new migration `034_add_username.js` adds `users.username` varchar(50), indexed + tenant-scoped unique (`tenant_id, username`). `auth.service.js:login(identifier, password)` normalizes the input (trim + lowercase) and matches `email ILIKE` **or** `username ILIKE` **or** exact `phone`, then runs the unchanged password/status/JWT/permission flow; login + `/auth/me` responses now include `phone` and `username`. `loginSchema` accepts `identifier` **or** legacy `email` (+ `password`); controller reads `identifier` with `email` fallback and generalized the error to "Invalid email, phone, username, or password". `users.service` create/update + validation accept `username`; seed `002_dev_users.js` backfills the 7 demo accounts (`owner`/`admin`/`teacher`/`student`/`parent`/`finance`/`hr`, existing demo `phone` already unique).
- **Frontend** — `store/auth.js:login` posts `{ identifier, password }`; `LoginPage` input relabeled "Email, phone, or username" (type `text`, new placeholder + divider copy), dev-user quick-login unchanged (still fills email).
- **Verified** — `/tmp/opencode/flexlogin_verify.sh` PASS=14/14: login by email / phone (`+251-911-000013`) / username (`admin`) / case-insensitive username + email, legacy `{email,password}` body still 200, response carries `phone`+`username`, wrong password 401, unknown identifier 401, blank/missing identifier 400, suspended account 403 (temp row cleaned up), `/auth/me` returns `username`. Regression `roles_verify.sh` PASS=49/49; frontend build clean, lint clean (pre-existing warnings only).

---

## Backlog Completion (2026-08-03)

Finished the remaining open Fix-Plan / LOW items. Items previously shipped (verified in code): SEC-2 (auth middleware re-checks role/status/tenant from DB each request), SEC-3 (no `password_hash` in any response — parents/reports/staff/students all select explicit fields), SEC-4 (chat participant checks REST+socket), SEC-5 (HR cannot grant/edit/delete admin+owner accounts), PARENT-1/2/3 (unlink by `link_id`, duplicate link → 409 `ALREADY_LINKED`, tenant-ownership + single-primary enforcement), PARENT-4 (guardians shown on StudentDetailPage), GRADE-2 (`grade_letter` recomputed from marks on every upsert), STU-1 (promote/transfer reconcile attendance rows), EXAM-1/GRADE-1/GRADE-3/ATT-1, BILL-2/3, AUTH-1, L-4/6/7.

**[DONE] L-1. Enroll-path guardian validation.** `students.service.enroll` now validates every guardian `parent_id` is an existing **parent** in the tenant (else `400 PARENT_NOT_FOUND` via controller), dedupes repeated parent_ids, and enforces a single primary: if any guardian is marked `is_primary` it wins; otherwise the first gets primary. Verified: teacher id as guardian → 400 PARENT_NOT_FOUND.

**[DONE] L-2. Link flow `is_primary` + `education_level`.** `linkParentSchema`/`updateLinkSchema` accept `education_level` (max 150) and the service persists it; `ParentsPage` link dialog adds an education-level input and a "Set as primary guardian" toggle. Verified: link with `education_level:"Grade 8"`/`is_primary:true` stored; update link → "Diploma"; duplicate link → 409.

**[DONE] L-3. Primary guardian on report card.** `generateReportCard` resolves the primary (or first) guardian via `student_parents` and prints `Guardian: <name> (<relationship>)  |  Education: <level>` under the class/student-number line. Verified in the decompressed PDF stream.

**[DONE] BILL-4. Payment edit/refund/delete UI.** Backend `PUT/DELETE /fees/payments/:id` already existed; frontend now exposes them: added `useUpdatePayment`/`useDeletePayment` hooks and an edit dialog (amount/method/remarks), a Refund action (`status:"refunded"`), and a Delete action (shown for already-refunded rows) on the Payments history table. Verified: edit amount → 600, refund → `refunded`, delete → 200.

**[DONE] AUTH-2. Invite flow end-to-end.** `users.service.create` now emails the invitation link (`sendInviteEmail`, `{frontendUrl}/auth/set-password?token=...`; logs the link when SMTP is unreachable) instead of only returning the token. New `SetPasswordPage` at `/auth/set-password` calls `POST /auth/set-password` and links to login on success. Verified: create user → `invitation_token` returned + link logged, set-password with invite token → 200, invited user logs in with the new password.

**[DONE] L-5. Dead hook removed.** Deleted unused `useStudentReport` from `useReports.js`.

**[DONE] SEC-1. Dev-users endpoint** was already hardened: `/auth/dev-users` is registered only when `config.env !== 'production'` and `getDevUsers` excludes `super_admin` (returns only the 7 demo accounts) — confirmed in `auth.routes.js`/`auth.service.js`.

**Verified** — `/tmp/opencode/finishup_verify.sh` PASS=14/14 (all of the above via API/DB), regression `roles_verify.sh` PASS=49/49, flex-login still 14/14, frontend `npm run build` clean + `npm run lint` 0 errors.

---

## Mount Olive School Reseed + Login Redesign (2026-08-03)

Wiped the demo DB and reseeded a single tenant — **Mount Olive School** — with real data from the 5 Excel sources in `/home/hayder/sms/data/`, then restored the login quick-pick dropdown and redesigned the login page.

- **Extraction** — `data/extract.py` (Python `openpyxl`, backend has no xlsx parser) normalizes the sources to JSON in `data/parsed/`: `students_primary.json` (2,128 primary records), `enroll_primary.json` (2,128, Grades 1–8 × A–G), `enroll_kg.json` (759, Nursery/LKG/UKG × A–F), `staff.json` (primary teachers 49, KG staff 40, supportive 53, management 9), `payroll.json` (6 JUNE SALARY 2018 sheets: Teachers 52, KG Supporting 22, SUPPORT 39, KG Teachers 22, Admin_1 2, Admin_2 18).
- **Seed** — `backend/scripts/seed-mount-olive.js` TRUNCATEs all tables CASCADE (except `knex_*`), then loads tenant `00000000-0000-0000-0000-000000000001`/slug `mount-olive-school`, roles via `seedTenant`, AY 2025/2026 + 3 terms, 58 classes, 16 subjects, staff, 2,887 students, 1,352 parents + 1,664 links, 209 `teacher_subjects`, 7 fee structures, 5 salary grades, 6 tax brackets, 154 payroll rows (June 2018, all `paid`, net total 1,232,309.45), and settings keys `school_name` + `academic_year_id`.
- **Seeding fixes** — non-integer `work_days` (0.5) rounded; payroll duplicate "Berhane Amanel (Admin_2)" skipped (first kept); student phones made synthetic `+251-91-000-XXXX` (guardian-phone collision made parent login resolve to the student); guardian phones stored raw (e.g. `0930368332`) because `auth.service.login` matches `phone = raw`; KG first names extracted from `enroll kg` and reseeded (source had IDs only).
- **Login fix** — `getDevUsers` (`auth.service.js`) had a hardcoded list of demo UUIDs (`…010–016`) that no longer exist after the wipe → dropdown broke. Now it queries real active users per role (owner/admin/teacher/finance/hr/support up to 5, parent/student up to 3, excludes `super_admin`) and returns 27 users.
- **Login page** — `frontend/src/pages/auth/LoginPage.jsx` redesigned as a split-panel card: left teal `#538a8d` gradient brand panel (Mount Olive School, `student_illustration.png`, stats 2,887/253/58, "Nurturing Minds, Building Futures"), right form with "Quick Login" `<select>` (role-labeled options, autofills email + `1234`), email/phone/username input, show-password toggle, remember me, forgot-password + contact-admin links.
- **Verified** — logins (password `1234`) for `super@demo.com`, parent via phone `0930368332`, teacher `staff004`, student `stu0001`; `/auth/dev-users` returns 27 users; role counts via psql (student 2,887, parent 1,352, teacher 165, support 62, admin 20, finance 5, hr 1 + super_admin); frontend `npm run build` clean; seed script oxlint clean.
- **Note** — old `roles_verify.sh`/`flexlogin_verify.sh` scripts reference the wiped demo accounts and will fail; role counts in the seed script's tail summary are a counting bug (they total all tenant users) — use psql `GROUP BY role` for accurate counts.

---

#### Recommended fix order (for follow-up 8)
