# Roles & Responsibilities Plan — Mount Olive SMS

Research base: PowerSchool Schoolnet materials-approval workflow, national QA directorate
duty lists (Kenya MoE QAS, Nigeria UBEC/FQEQA, Ethiopia MoE የት/ጥራት ማሻሻል structure),
standard SIS role models.

---

## 1. QUALITY DIRECTOR — የት/ጥ/በ/መሪ (`quality_director`)

### What the job really is
In real systems (Schoolnet "Pending Materials", Kenya MoE QAS, UBEC QA):
- Reviews tests, exams, notes, lesson plans, worksheets submitted by teachers BEFORE use
- Scores them against a rubric (curriculum alignment, clarity, difficulty mix, answer key)
- Approves / sends back for revision with comments
- Monitors teacher appraisal, classroom observations, exam result analysis; proposes interventions
- Maintains an approved materials/test item bank

### Who they relate to
Teachers (submit → get feedback) · Principal/VP (escalation) · HR (appraisal/KPI feed)

### Current system state
Nothing. Teachers create exams directly with no review step anywhere.

### Changes we need — NEW SUBSYSTEM: Academic Content Approval
1. New table `content_submissions`: type (test|exam|notes|lesson_plan|worksheet), title,
   class_id, subject_id, teacher_id, body/file + answer_key file,
   status (draft → submitted → needs_revision → approved → archived),
   submitted_at, reviewed_by, review_comment, rubric scores.
2. Teacher page "My Submissions": upload → Submit for Approval → status timeline +
   reviewer comments → revise & resubmit.
3. Quality Director page "Review Center":
   - Pending queue (filter by subject/class/type/teacher)
   - Review view: content + answer key side by side + rubric form
   - Approve / Request Changes (comment mandatory on reject)
   - Approved items land in an "Approved Materials Bank" browsable by all teachers
4. Analytics tab: submissions per teacher/subject, approval rate, avg revisions,
   late submitters → feeds teacher appraisal (HR module).
5. Notifications: on submit → reviewer; on decision → teacher; overdue reminders.
6. Optional hook: push approved exam submissions into Exams module as draft exam.
7. Permissions: new `quality.review` (quality_director, principal, vice_principal),
   `quality.submit` (teacher).

---

## 2. SHIFT COORDINATOR — ፈረቃ አስተባባሪ (`shift_coordinator`)

### What the job really is
- Owns the daily duty/shift roster: which guard is on day/night shift (ፈረቃ = guard duty),
  which teacher covers which class/period
- Cross-checks reported presence vs actual: staff check-in, absences, lateness
- Sees who is on leave today/this week so no slot is uncovered
- Arranges substitutions when someone reports absent (already partly built)
- Reports staffing gaps to HR and VP

### Who they relate to
Teachers + guards (roster) · Security Head (guard shifts) · HR (leave records, attendance) · VP (escalation)

### Current system state
- ✅ `shifts` module exists: substitutions list/create, available teachers, reports
  (already grants `shift_coordinator`)
- ✅ `staff_attendance` table exists; HR module has teacher-attendance endpoints — but
  they exclude `shift_coordinator`
- ❌ No leave visibility, no guard-shift roster, no "today" dashboard

### Changes we need — SHIFT & DUTY HUB page
1. **Today view**: on-duty now / absent / late / on-leave lists, uncovered periods count.
2. Add `shift_coordinator` to hr teacher-attendance endpoints (read-only) +
   `leave-management.manage` read access (new `leave.view` perm).
3. **Guard shift roster** (ፈረቃ): new table `guard_shifts` (guard_user_id, date,
   shift day|night, post/location, status). Coordinator assigns weekly roster;
   security head gets read access.
4. **Substitution board** upgrade: from absent teacher → one-click pick substitute →
   notify both + VP sees log. (Endpoints exist; needs UI polish + notifications.)
5. Weekly report auto-summary to VP/GM: absences by staff, lateness trend, coverage %.

---

## 3. GENERAL MANAGER — ሥራ አስኪያጅ (`general_manager`)

### What the job really is
Top executive: oversees all departments, approves big spending, signs off payroll before
disbursement, reviews cross-department performance, represents school to owners/board.

### Current state
Has dashboard/reports/payroll-view/audit perms but no distinct executive surface.

### Changes we need
1. **Executive Dashboard**: money in (collections), money out (expenses+payroll),
   enrollment trend, attendance health, pending-approvals count across departments.
2. **Approval step for payroll**: GM sign-off required before payroll run executes
   (`payroll.approve` permission; status draft → gm_approved → paid).
3. **Expense approval threshold**: expenses above X birr require GM approval queue
   (status pending_gm).
4. Read-only everything else. No data entry.

---

## 4. PRINCIPAL & VICE PRINCIPAL — ር/መ/ር እና ም/ር/መ/ር

### What the job really is
Principal: academic head — supervises VPs and Quality Director, final academic authority,
discipline appeals, parent escalations, exam integrity.
VP: operational deputy — daily discipline, timetable conflicts, substitute escalation,
announcement drafting, KG section oversight (one of our two VPs is KG).

### Current state
Both have exams/grades/attendance/timetable/report perms. No distinct pages.

### Changes we need
1. Principal gets `quality.review` (final approver above Quality Director — two-tier
   review optional per submission type).
2. **Discipline oversight**: student_discipline table exists — give principal/VP a
   Discipline page (cases list, assign hearing, record outcome, parent notification).
3. VP(KG) scoping: filter views by section flag (KG classes) — add `section` tag on classes.
4. Timetable conflict resolver view (existing timetable module + substitutions feed).
5. Exam integrity: lock/unlock exams already exists via grades.manage — surface a clean UI.

---

## 5. ACCOUNTANT — አካውንታንት (`accountant`)

### What the job really is
Books and reconciles; distinct from Finance Head (strategy) and Cashier (cash collection).
- Verifies daily cashier collections vs receipts
- Reconciles bank/telebirr/CBE statements vs recorded payments
- Maintains expense records with proper documentation
- Monthly trial balance / income vs expenditure for GM & owner
- Fee defaulter aging analysis

### Current state
Perm set exists (fees/payments/expenses/reports/tax) but identical shape to finance role —
no accountant-specific surface.

### Changes we need
1. **Reconciliation page**: payments list grouped by method + collected_by, matched
   against expected (fee structures × enrollment), flag mismatches/duplicates.
2. **Defaulter aging report**: outstanding per student bucketed 30/60/90+ days.
3. **Monthly close pack**: one-click PDF: collections, expenses by category, payroll total,
   net position — for GM/owner signature.
4. Restrict: cannot edit payments after reconciliation lock (new `payments.lock` flow).

---

## 6. GENERAL SERVICES HEAD — ጠቅላላ አገልግሎት (`general_services`)

### What the job really is
Non-teaching operations: facilities, maintenance, cleaning, water/power, transport fleet,
purchasing of consumables, school property.

### Current state
Has `operations.manage` + `expenses.manage`. Assets CRUD exists (school_assets table).
No maintenance concept, no purchasing requests.

### Changes we need
1. **Maintenance requests** table + page: reported_by → assigned_to → status
   (open|in_progress|done) with cost field feeding expenses module.
2. **Asset registry polish**: assets page exists — add assignment history + condition field,
   annual inventory count mode.
3. **Consumables purchase requests**: request → GM approval (threshold) → expense record.

---

## 7. HEAD OF SECURITY — የጥበቃ ኃላፊ (`security_head`)

### What the job really is
Guard team management, gate control, incident register, student early-departure control,
lost & found. Works with Shift Coordinator who schedules his guards.

### Current state
Nothing beyond dashboard/announcements/chat.

### Changes we need
1. **Visitor log**: name, host/person visited, purpose, time in/out, badge no.
2. **Incident register**: type, location, people involved, action taken, follow-up;
   serious incidents escalate to GM/principal automatically.
3. **Student gate pass**: student leaves early only with pass issued by front-desk/admin
   role; security verifies pass code at gate.
4. Read access to guard_shifts roster (created by shift coordinator).

---

## 8. OWNER — `owner`

Keep as super-user of the tenant (already ALL permissions). Add:
1. Multi-year financial trend view.
2. Role assignment audit: who granted which permission when (audit logs already capture).

---

## 9. EXISTING ROLES — small fixes

| Role | Change |
|---|---|
| teacher | Add "My Submissions" page (quality workflow); see own KPI results (endpoint already allows teacher) |
| hr | Keep staff attendance/KPI ownership; add leave calendar view shared with shift coordinator |
| finance | Distinct from accountant: keeps fee structures, strategy, reports; loses nothing |
| cashier | Daily cash-close report (collected today vs receipts) sent to accountant |
| support | No change |
| student / parent | See approved materials bank? (optional later) |

---

## 10. NEW PERMISSIONS SUMMARY

| Permission | Granted to |
|---|---|
| quality.submit | teacher |
| quality.review | quality_director, principal, vice_principal |
| shifts.manage | shift_coordinator |
| guard-roster.view | security_head |
| leave.view | shift_coordinator, hr, principal, vp |
| payroll.approve | general_manager |
| expenses.approve | general_manager |
| security.manage | security_head |
| services.manage | general_services |
| discipline.manage | principal, vice_principal |

## 11. BUILD ORDER

1. **Phase 1** (the two unique roles): Content Approval subsystem + Shift/Duty Hub
   (includes DB migration 038: content_submissions, guard_shifts, submission_comments)
2. **Phase 2**: Accountant reconciliation + GM executive dashboard & approvals
3. **Phase 3**: Security suite + General Services maintenance/purchasing + Discipline page

All UI text EN + AM via existing i18n system from day one.


