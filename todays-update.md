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
