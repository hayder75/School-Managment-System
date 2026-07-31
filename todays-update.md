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
