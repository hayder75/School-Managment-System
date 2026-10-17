// Shared source of truth for the SMS user manual content.
// Consumed by:
//   - scripts/generate_docs_pdf.js      (renders the PDF manual)
//   - src/modules/help/help.service.js   (serves the in-app help page)
//   - backend/scripts/generate_training_pdf.js (training program)
const p = (t) => ({ t: 'p', text: t });
const h = (t) => ({ t: 'h', text: t });
const h2 = (t) => ({ t: 'h2', text: t });
const ul = (...items) => ({ t: 'ul', items });
const steps = (...items) => ({ t: 'steps', items });
const table = (head, rows) => ({ t: 'table', head, rows });
const note = (t) => ({ t: 'note', text: t });

const DOC = [
  {
    part: 'Part I — Foundations',
    short: 'Foundations',
    chapters: [
      {
        title: 'Introduction',
        blocks: [
          p('The School Management System is a single platform that runs a school end to end. It was built by EnglesTech Plc to replace the disconnected spreadsheets, paper registers and ad-hoc databases most schools accumulate, and to give every member of staff one accurate view of the school.'),
          p('The system covers the whole life of a student — admission, class placement, attendance, results, fees, library loans — and the whole life of a staff member — recruitment record, attendance, leave, performance, overtime and salary. Around those two spines sit the academic structure (classes, subjects, timetable, exams), the money side (fees, payments, expenses, payroll), operations (assets, security, shifts) and a reporting layer that turns all of it into dashboards and downloadable workbooks.'),
          h('Three ideas shape everything else'),
          p('First, the system is role-based. You never see a menu item you are not allowed to use, and you never see another person’s data unless your job requires it. A teacher cannot open payroll; a parent sees only their own children; a principal scoped to KG does not see the primary school’s numbers.'),
          p('Second, data is entered once. Register a student and they immediately exist for attendance, billing, exams and reporting. Mark staff attendance and the same data feeds payroll deductions and performance scores. There is no second place to update.'),
          p('Third, everything is reportable. Any list on screen can be turned into a spreadsheet, a PDF, or a shareable link, so the answer to "can you send me that report?" is always a link rather than a screenshot.'),
          h('What you will find in this manual'),
          p('This manual is organised the way the system is. Parts I and V explain the foundations and the administrative controls. Part II is a chapter per role — each one lists every screen that role can open and explains what it does and how to use it. Part III is the day-to-day workflows, written as procedures. Part IV covers reporting and sharing.'),
        ],
      },
      {
        title: 'Getting Started',
        blocks: [
          p('Everything below happens once, the first time you sign in.'),
          h('Signing in'),
          steps(
            'Open the school site in any modern browser (Chrome, Edge, Safari or Firefox). The address is https://mountoliveschool.net.',
            'Enter your username, your email address, or your phone number in the first field. The system accepts all three, and phone numbers may be typed with or without the country code.',
            'Enter your password.',
            'Press Sign in. You land on your dashboard, already scoped to your role.'
          ),
          p('If you are evaluating the system, use the "Try a demo account" panel above the login form. It lists one account per role; choose any of them and you are signed in automatically with the password 1234. This is the fastest way to see exactly what a given role can do.'),
          h('Changing the language'),
          p('The interface is fully bilingual. Use the English / አማርኛ switch in the top-right corner of the login page, and the same switch inside the application, to move between English and Amharic. The choice applies to menus, buttons and table headings.'),
          h('The left-hand menu'),
          p('The menu is generated from your role, so two people at the same school can see different menus. Sections appear only if your role both holds the role and has the underlying permission. If something you need is missing, that is a permissions question rather than a bug — an Owner or Administrator can grant it under Roles & Permissions.'),
          h('Finding things quickly'),
          p('Most list screens have a search box that filters as you type. Search covers names, email addresses and phone numbers; phone numbers are matched on their digits, so 0911223344 finds +251911223344. On student, staff and parent records the search also looks inside related fields — searching a child’s name on the Parents screen finds that child’s parent.'),
          h('Changing your password and signing out'),
          p('Use the account menu at the bottom of the sidebar to change your password or to sign out. Signing out on a shared or public computer is always advisable.'),
          note('If you are shown a menu item but pressing it returns an error about permissions, your role has the menu entry but not the permission behind it. Ask an Administrator to check Roles & Permissions for your role.'),
        ],
      },
      {
        title: 'How the System Fits Together',
        blocks: [
          p('Five structures run underneath every screen. Understanding them once makes the rest of the manual obvious.'),
          h('Academic year and terms'),
          p('All results, fees and reports are anchored to an academic year, which is divided into terms. Exams belong to a term, report cards are produced per term, and monthly billing runs inside a year. When a new year starts you create a new academic year and its terms; nothing from the previous year is lost.'),
          h('Levels, classes and sections'),
          p('Students are grouped by level group (Nursery, KG, Primary, Secondary), then by grade level, then by section — for example KG A or Grade 4 B. Subjects are assigned to a class, and teachers are assigned to a subject within a class. This is why the timetable, exam entry and workload reports all work per class.'),
          h('Scope levels'),
          p('Some roles are restricted to part of the school. A principal can be scoped to Nursery and KG only, another to Primary only. The scope is applied automatically to students, classes, enrolment and reports, so each leader sees their own part of the school without filtering anything by hand.'),
          h('Users, staff and people'),
          p('Every person in the system is a user record. Staff members (teachers, HR, finance, admin, support) additionally carry employment data: job title, joining date, qualifications and salary components. Students and parents are users too, so they can sign in, but they are not staff and never appear in payroll or staff reports.'),
          h('Records versus archives'),
          p('A student or staff member is either active or archived. Archiving keeps the full history — attendance, results, payments — but removes the record from rosters, billing and most lists. This is how you handle leavers and transfers without losing data.'),
        ],
      },
    ],
  },

  {
    part: 'Part II — Roles and What Each One Does',
    short: 'Roles',
    chapters: [
      {
        title: 'School Owner',
        blocks: [
          p('The Owner is the school’s principal account holder. Every other role is ultimately created and controlled from here, and the Owner sees the whole school without any scope restriction.'),
          h('Screens available to the Owner'),
          table(['Screen', 'What it does'], [
            ['Dashboard', 'Whole-school overview: enrolment by level, collections, outstanding balances, staffing and alerts.'],
            ['Users', 'Every account in the school — staff, teachers, students and parents. Create, edit, archive, reset passwords and set roles.'],
            ['Teachers', 'The teaching staff view: subjects, classes, assignments and performance.'],
            ['Students', 'All student records with enrolment, class, guardians and status.'],
            ['Parents', 'Parent accounts, their children, and the list of students with no linked guardian.'],
            ['Classes', 'Every class with its homeroom teacher, student count and roster drill-down.'],
            ['Subjects', 'The subject catalogue used by classes, timetables and exams.'],
            ['Attendance', 'Daily student attendance by class and date.'],
            ['Exams & Grades', 'Create exams, set total marks, enter marks and publish results.'],
            ['Timetable', 'The weekly timetable for every class and teacher.'],
            ['Fee Structures', 'Tuition and fee definitions used to bill students monthly.'],
            ['Payments', 'Every payment recorded, with receipts and balances.'],
            ['Collection Report', 'Daily and monthly collection analysis by method and by class.'],
            ['Expenses', 'School expenses by category.'],
            ['Payroll', 'Run and post monthly payroll, including tax, pension and deductions.'],
            ['Salary Register', 'Staff salary components — the basis payroll reads from.'],
            ['Operations', 'School operations records: vehicles, incidents, facilities and related registers.'],
            ['Assets', 'Asset register with codes, categories, locations and cost.'],
            ['Teacher Attendance', 'Staff attendance, daily summary and weekly grid.'],
            ['Teacher KPIs', 'Teacher key performance indicators per period.'],
            ['Tax Brackets', 'The income tax bracket table payroll uses for automatic tax.'],
            ['Leave Mgmt', 'Leave requests, approvals and rejections.'],
            ['Homeroom Assignment', 'Assign which teacher is homeroom for each class.'],
            ['Overtime', 'Record, approve and pay staff overtime.'],
            ['Payroll Audit', 'Every change to payroll, with who made it and when.'],
            ['Roles & Permissions', 'Define what each role may do and change it.'],
            ['Backup', 'Create and download a database backup.'],
            ['Announcements', 'Post school-wide notices.'],
            ['Chat', 'Internal messaging with staff.'],
            ['Reports', 'The report centre — analytics, downloads and sharing.'],
            ['Audit Logs', 'A searchable record of sensitive actions across the system.'],
            ['Import', 'Bulk import students, staff and class data from a file.'],
            ['Settings', 'School details, branding and system-wide options.'],
          ]),
          h('How the Owner actually works'),
          steps(
            'Sign in and read the dashboard first — it is the only screen that shows every area at once.',
            'Deal with structure in the right order: Subjects, then Classes, then Users, then Timetable, then Fees. Each later screen depends on the ones before it.',
            'Keep Roles & Permissions current. Every extra role handed out is extra surface area; review it when staff change roles.',
            'Take a Backup before any bulk change such as an import or a large re-classification.',
            'Check Audit Logs periodically to see who has been changing sensitive records.'
          ),
        ],
      },
      {
        title: 'Administrator',
        blocks: [
          p('The Administrator runs the school day to day. In practice the Administrator does almost everything the Owner does except manage tenants, backup and the permission system itself.'),
          h('Screens available to the Administrator'),
          p('Dashboard · Users · Teachers · Students · Parents · Classes · Subjects · Attendance · Exams & Grades · Timetable · Fee Structures · Payments · Collection Report · Expenses · Payroll · Salary Register · Operations · Assets · Teacher Attendance · Teacher KPIs · Tax Brackets · Leave Mgmt · Homeroom Assignment · Overtime · Payroll Audit · Announcements · Reports · Audit Logs · Import.'),
          h('The Administrator’s daily loop'),
          steps(
            'Start on the Dashboard and clear anything flagged: students with no guardian, unmarked attendance, unpaid bills.',
            'Handle admissions — register new students and assign them to a class (see Admissions & Student Registration).',
            'Confirm attendance was marked for every class; chase the teachers who have not.',
            'Record any payments taken at the counter, or verify the cashier recorded them.',
            'At month end, run payroll and review the deductions before posting.',
            'Export and read the reports that matter to the head of school before the monthly meeting.'
          ),
          h('Delegating work'),
          p('The Administrator should not be the person who marks attendance or enters every mark. Give the teaching work to teacher accounts, the money work to Finance, and people work to HR — then use Roles & Permissions to remove what they do not need.'),
        ],
      },
      {
        title: 'General Manager',
        blocks: [
          p('The General Manager is the executive view: whole-school performance, money and risk, without editing academic records.'),
          h('Screens available to the General Manager'),
          p('Executive Dashboard · Dashboard · Students · Classes · Payroll · Salary Register · Overtime · Reports · Audit Logs · Announcements · Chat.'),
          h('The Executive Dashboard'),
          p('This screen exists specifically for the GM. It aggregates the signals that matter at board level — enrolment trend, collection rate against target, outstanding debt ageing, staffing cost against budget, attendance risk and teacher performance spread — and it is the fastest way to decide where to look deeper.'),
          steps(
            'Open the Executive Dashboard and identify the two or three areas that have moved.',
            'Drill into the relevant area — Students or Classes for enrolment, Payroll and Salary Register for staff cost.',
            'Use Reports for the underlying numbers, and Share any report that others need to see without giving them an account.',
            'Check Audit Logs when a figure does not match what you expect.'
          ),
          note('The GM normally cannot enter marks, attendance or payments. That separation is deliberate: the GM reviews, the Administrator and Finance record.'),
        ],
      },
      {
        title: 'Principal',
        blocks: [
          p('The Principal owns academic quality: the teachers, the classes, the attendance and the results. Principals are usually scoped to a level — for example Nursery and KG, or Primary — so they see their own part of the school.'),
          h('Screens available to the Principal'),
          p('Dashboard (scoped) · Quality Assurance · Discipline · Students · Classes · Teachers · Attendance · Exams & Grades · Timetable · Teacher Attendance · Announcements · Reports · Chat.'),
          h('Quality Assurance'),
          p('The academic quality screen. It brings together teacher KPIs, syllabus completion, student feedback scores and substitution coverage into one review list, so a principal can see which teachers need support and which classes are behind.'),
          steps(
            'Open Quality Assurance and choose the current period.',
            'Read the teachers flagged by attendance, punctuality, feedback or syllabus completion.',
            'Open a teacher to see the individual metrics behind the score.',
            'Agree actions — a new subject assignment, a substitution, a development plan — and record them in the review notes.'
          ),
          h('Discipline'),
          p('Records student disciplinary incidents with date, student, category, severity and resolution. Incidents feed the student’s record and can be reviewed by period for patterns.'),
          h('Attendance as a principal'),
          steps(
            'Open Attendance and check which classes have no marks for today.',
            'Open Teacher Attendance to see which staff are late or absent frequently.',
            'Follow up with the class teacher directly; the system is the record, not the conversation.'
          ),
          h('Scope in practice'),
          p('If you are scoped to KG, every student, class and enrolment figure you see is KG only, and the reports you export are KG only. This makes level-based targets straightforward to monitor.'),
        ],
      },
      {
        title: 'Vice Principal',
        blocks: [
          p('The Vice Principal has the same academic remit as the Principal with more operational responsibility, most visibly for shifts and coverage.'),
          h('Screens available to the Vice Principal'),
          p('Dashboard · Quality Assurance · Discipline · Students · Classes · Teachers · Attendance · Exams & Grades · Shift Hub · Teacher Attendance · Reports · Announcements.'),
          h('Shift Hub'),
          p('The Shift Hub is the daily coordination screen: who is on duty, who is covering, and where the gaps are. It draws on the timetable and the substitution records so coverage is visible in one place rather than in WhatsApp threads.'),
          steps(
            'Open Shift Hub at the start of the day to see the duty list.',
            'Create or confirm the shifts for the week, including guard and support posts.',
            'When a teacher is absent, record the substitution from the same screen so the timetable and coverage agree.',
            'Escalate anything unresolved by mid-morning to the Principal.'
          ),
          h('Everyday use'),
          p('Beyond Shift Hub, the Vice Principal works exactly as the Principal does — reviewing quality, attendance and discipline — and is usually the person who actually enforces the follow-up.'),
        ],
      },
      {
        title: 'Quality Director',
        blocks: [
          p('The Quality Director is responsible for the school’s academic standards across every level, and for the teacher evaluation process itself.'),
          h('Screens available to the Quality Director'),
          p('Dashboard · Quality Assurance · Students · Classes · Teachers · Attendance · Exams & Grades · Timetable · Teacher KPIs · Teacher Attendance · Reports · Chat.'),
          h('Teacher KPIs in detail'),
          p('A KPI record is one teacher, one period, and four measured areas: attendance rate, punctuality rate, substitutions covered, student feedback score and syllabus completion. Three of these can be computed automatically from the data the system already holds, and a reviewer can override any of them with a comment when the numbers do not tell the whole story.'),
          steps(
            'Open Teacher KPIs and select the period being reviewed.',
            'Sort by overall rating to find the lowest and highest performers.',
            'For each teacher, check the component metrics — a low score caused by punctuality is a very different problem from one caused by syllabus completion.',
            'Override a metric only with a written reason; the override is kept alongside the automatic value.',
            'Publish the period once the reviews are complete; the ratings then appear on the Quality Assurance screen for the Principal.'
          ),
          h('Cross-level view'),
          p('Unlike a level-scoped principal, the Quality Director normally sees every level, which makes the Quality Assurance screen the natural place to compare KG against Primary and to spot a department-wide problem.'),
        ],
      },
      {
        title: 'HR Officer',
        blocks: [
          p('HR owns the staff record and the data that payroll depends on. If HR is accurate, payroll is automatic; if HR is late, payroll is wrong.'),
          h('Screens available to the HR Officer'),
          p('Dashboard · Teacher Attendance · Teachers · Timetable · Teacher KPIs · Assets · Reports · Payroll · Salary Register · Tax Brackets · Leave Mgmt · Homeroom Assignment · Overtime · Payroll Audit · Users (staff).'),
          h('Staff attendance — the three views'),
          p('Staff attendance is recorded in three complementary views, and HR needs all three.'),
          table(['View', 'What it is for'], [
            ['Daily summary', 'One screen for a chosen date: every active staff member with a status, check-in and check-out, and bulk actions to mark a whole row.'],
            ['Weekly grid', 'A week × staff matrix. The fastest way to fill a whole week for the whole staff in one pass, and the clearest way to spot a pattern.'],
            ['Period statistics', 'Aggregates per person over a date range: present, late, absent, leave, emergency, half days, unpaid days and attendance rate.'],
          ]),
          steps(
            'Choose the week in the grid view and fill each cell with Present, Late, Absent, Half day, Leave or Emergency.',
            'Leave days requested in Leave Mgmt appear automatically as unavailable, so HR only marks the exceptions.',
            'Check Period statistics for anyone whose unpaid days are climbing, and follow up before payroll is run.',
            'Leave the deduction settings alone unless the school’s policy has changed — they drive the automatic payroll deduction.'
          ),
          h('Deduction settings'),
          p('Attendance deductions can be calculated three ways, configured once by HR: a fixed amount per unpaid day, a percentage of basic pay per unpaid day, or a simple proration of basic pay across the working days. The chosen method is applied automatically during payroll.'),
          h('Leave management'),
          steps(
            'Open Leave Mgmt to see pending requests.',
            'Open a request to read the type, dates and reason.',
            'Approve or reject. Approving makes those days unavailable for teaching and substitution, and they appear as leave in the attendance statistics.',
            'Rejected requests leave the staff member’s attendance untouched.'
          ),
          h('Homeroom assignment'),
          p('Assigns which teacher is the homeroom teacher for each class. The assignment shows on the Classes screen, in the timetable, and on the homeroom report. Do it at the start of the academic year and whenever a class changes hands.'),
          h('Overtime — HR’s responsibility'),
          p('HR records and approves overtime; Finance pays it. See the Overtime chapter for the full procedure and the multipliers.'),
          h('Payroll support'),
          p('HR does not post payroll but supplies its inputs: attendance, unpaid days, leave and approved overtime. Before Finance runs the month, HR should confirm that attendance is complete for every staff member, because missing days default to present and will not be deducted.'),
          note('Salary data is visible to HR but should be edited only by Finance. HR maintains qualifications, job titles, joining dates and assignments.'),
        ],
      },
      {
        title: 'Finance Officer and Accountant',
        blocks: [
          p('Finance owns the money: what is owed, what has been paid, what was spent, and what staff are paid. Both roles see the same finance screens; the Accountant role additionally includes the reconciliation portal.'),
          h('Screens available to Finance and Accountant'),
          p('Dashboard · Accountant Portal (Accountant) · Fee Structures · Payments · Collection Report · Expenses · Payroll · Salary Register · Overtime · Reports.'),
          h('Fee structures and billing'),
          p('A fee structure defines what a student is charged per month — usually by grade level, sometimes with different items per level. Once defined, the system generates a monthly bill for every active student automatically, applying any penalty rules and recording what has been paid against it.'),
          steps(
            'Open Fee Structures and define the monthly amount per grade level, including any separate items.',
            'Confirm the academic year is current, because bills are generated per year.',
            'Run the monthly billing for the period; every active student receives a bill.',
            'Check the Outstanding Balances sheet in Reports for anything unpaid.'
          ),
          h('Recording a payment'),
          steps(
            'Open Payments and choose Record Payment.',
            'Search for the student by name or phone — the search tolerates partial numbers.',
            'Enter the amount and the method, and any reference or receipt number.',
            'Save. The bill balance updates immediately and the student’s payment history is appended to.'
          ),
          h('Payroll'),
          p('Payroll is prepared per staff member per month. The system fills basic pay from the Salary Register, adds approved overtime, then computes the rest: income tax from the tax bracket table, employee and employer pension as percentages of basic pay, and an attendance deduction from the unpaid days HR has recorded.'),
          steps(
            'Confirm the month and year, and check the staff list is complete.',
            'Press Calculate on each entry to apply tax, pension and attendance deductions before saving anything.',
            'Check the deduction lines — an unexpected attendance deduction almost always means attendance was not marked.',
            'Save the entry, then post the run. Posted payroll is what counts towards cost reporting.',
            'Review Payroll Audit afterwards to confirm what was changed and by whom.'
          ),
          h('Tax brackets'),
          p('The tax bracket table is a set of salary ranges, each with a rate and a deduction. Payroll picks the bracket containing the taxable income (basic plus overtime) and computes tax automatically, so updating the bracket table updates every future run.'),
          steps(
            'Open Tax Brackets and review the current brackets against the current tax schedule.',
            'Edit or add brackets, keeping the ranges continuous so no salary falls between two rows.',
            'Mark old brackets inactive rather than deleting them, so historical payroll keeps its meaning.'
          ),
          h('Overtime in payroll'),
          p('Approved overtime for a staff member and month is added to that person’s payroll automatically when the entry is calculated and no overtime has been entered by hand. If you enter an overtime figure manually it always wins — use that to correct a payroll run without editing the overtime record.'),
          h('The Accountant Portal'),
          p('The Accountant gets a dedicated reconciliation screen that compares what was billed, what was collected and what remains outstanding, with ageing so old debt is visible separately from new.'),
          note('Never post a payroll run before the month’s attendance is complete. Payroll trusts the attendance data as recorded.'),
        ],
      },
      {
        title: 'Cashier',
        blocks: [
          p('The Cashier is the front desk: enrolling students and taking money. The role is deliberately narrow so that cash handling stays auditable.'),
          h('Screens available to the Cashier'),
          p('Dashboard · Enroll · Students · Fee Structures · Payments · Collection Report · Reports · Announcements · Chat.'),
          h('Enrolling a student at the counter'),
          p('The Enroll screen is a guided wizard that collects the student, the guardian and the class in one pass, because at the counter all three are usually needed immediately.'),
          steps(
            'Open Enroll and enter the student’s first, middle and last name, gender and date of birth.',
            'Enter at least one guardian phone number — this is what makes the parent account reachable later.',
            'Choose the level and class; the section list follows from the class.',
            'Save. The student is created, the guardian gets a parent account, and the student can be billed immediately.'
          ),
          h('Taking a payment'),
          steps(
            'Open Payments and choose Record Payment.',
            'Search the student by name or phone number.',
            'Enter the amount received and the payment method, plus the receipt number if your office issues one.',
            'Save and issue the receipt. The bill balance reduces straight away.'
          ),
          h('End-of-day routine'),
          steps(
            'Open the Collection Report and filter to today.',
            'Compare the total against the cash and electronic receipts in your drawer.',
            'Investigate any difference before the day is closed.'
          ),
          note('The Cashier can see fee structures and students for reference but cannot change fee amounts, edit other users, or run payroll.'),
        ],
      },
      {
        title: 'Teacher',
        blocks: [
          p('The Teacher is the most-used role in the school, and the most focused. A teacher sees their own classes and their own results, and nothing else.'),
          h('Screens available to the Teacher'),
          p('Teacher Workspace · Dashboard · Attendance · Exams & Grades · My Timetable · Teacher KPIs · Reports · Announcements · Chat.'),
          h('Teacher Workspace'),
          p('The landing screen. It lists the classes and subjects assigned to you, with today’s timetable, your classes’ attendance for the current day, and any results still waiting to be entered. It is built to answer “what do I need to do today?” in one glance.'),
          h('Marking attendance'),
          steps(
            'Open Attendance — it opens on your classes only.',
            'Choose the date and the class.',
            'Mark each student Present, Late or Absent. Bulk actions set a whole class or a section at once, which is how most teachers do it.',
            'Save. The marks are immediately available to the Principal and to reports.'
          ),
          h('Entering marks'),
          steps(
            'Open Exams & Grades and choose the exam for your class and subject.',
            'Enter each student’s mark out of the exam’s total.',
            'Save. Results are aggregated by subject and by student and appear on report cards and academic reports.',
            'Once marks are entered the exam is no longer marked as pending on your workspace.'
          ),
          h('My Timetable'),
          p('Your weekly teaching timetable, including any substitutions recorded for you. If a colleague is absent and you are covering, the substitution shows here so you know what to teach.'),
          h('Teacher KPIs'),
          p('Your own key performance indicators for the current period — attendance, punctuality, substitutions covered, feedback and syllabus completion — together with the reviewer’s comments. Use the screen to understand your own standing; only your reviewer can change the scores.'),
          h('My Teaching report'),
          p('On the Reports screen a teacher sees My Teaching: the students in your classes, which you can export per class or per subject when you need a list for a lesson.'),
          note('A teacher cannot open fees, payroll, staff salaries, other teachers’ results, or school-wide reports.'),
        ],
      },
      {
        title: 'Librarian',
        blocks: [
          p('The Librarian runs the library catalogue and every loan that passes through it.'),
          h('Screens available to the Librarian'),
          p('Dashboard · Library (books, borrowings, settings) · Library Transactions · Book Assessment / Inventory · Announcements.'),
          h('Books'),
          p('The book catalogue. Each title is added with its author, category, ISBN, publisher and the number of copies held. Copy count is what makes borrowing meaningful: a title with two copies can be issued twice.'),
          steps(
            'Open Library and choose the Books tab.',
            'Add the title, then set the number of copies the school owns.',
            'Use the category field to group the collection — fiction, reference, textbooks, magazines — so the inventory report can be split usefully.'
          ),
          h('Issuing and returning'),
          steps(
            'Open the Borrowings tab and choose Issue.',
            'Search the borrower by name for a student or parent, or by student ID. Student IDs can be typed with or without the leading zero.',
            'Search and select the book, then confirm the issue.',
            'When the book comes back, open the borrowing and mark it returned; the copy count is restored automatically.'
          ),
          h('Transactions'),
          p('The Transactions page is the full loan history: who borrowed what, when it was issued, whether it is still out, and when it was returned. It is the page to use when a book is overdue, lost, or a borrower disputes a loan.'),
          h('Book assessment and inventory'),
          p('Inventory is a stock check. Run it to compare the copies the system believes exist against the copies physically on the shelf, and record the difference with its reason. The Book Assessment page records the condition of a copy — new, good, fair, damaged, lost — which is what tells you whether a missing copy was lost or never existed.'),
          steps(
            'Open Book Assessment and choose a category or the whole collection.',
            'Walk the shelves and mark the condition of each copy.',
            'Open Inventory and reconcile the counted quantity against the system quantity.',
            'Record any shortfall with a reason so the loss is visible in the year-end stock value.'
          ),
          note('Students see their own loans under My Library; they cannot issue, return or edit the catalogue.'),
        ],
      },
      {
        title: 'Security Head',
        blocks: [
          p('The Security Head manages the gate, the visitors and the incident log.'),
          h('Screens available to the Security Head'),
          p('Dashboard · Security Hub · Reports · Announcements · Chat.'),
          h('Security Hub'),
          p('The Security Hub is the working screen for a shift, and it holds the three registers that matter:'),
          table(['Register', 'What it records'], [
            ['Visitors', 'Every visitor with name, phone, who they came to see, purpose, badge number, and time in and out.'],
            ['Incidents', 'Anything that happened on campus — title, location, category, severity, status, and whether it was escalated to the General Manager.'],
            ['Gate passes', 'Students leaving campus early — pass code, date, time, reason, and the authorised person collecting them.'],
          ]),
          steps(
            'At the start of each shift, open the Security Hub.',
            'Issue a badge and log every visitor as they arrive; close the entry when they leave.',
            'Issue a gate pass for any student being collected early, and record the authorised person.',
            'Log any incident the same day, while the detail is fresh, and escalate the serious ones.',
            'At the end of the shift, review the day’s incidents and hand over anything open.'
          ),
          h('Reporting'),
          p('The Security report exports the Visitors, Incidents and Gate Passes sheets for any period, which is what the school produces for inspection or for an incident review.'),
          note('Gate passes are the most sensitive register on this screen. A pass authorises a child to leave; always record the authorised person by name.'),
        ],
      },
      {
        title: 'General Services',
        blocks: [
          p('General Services owns the physical school: assets, facilities, the library as a service, and running expenses.'),
          h('Screens available to General Services'),
          p('Dashboard · General Services · Operations · Library · Library Transactions · Book Assessment · Assets · Expenses · Reports · Announcements.'),
          h('Assets'),
          p('The asset register. Every item of equipment is recorded with a code, category, quantity, unit and total cost, location and purchase date, and a status. The status is what makes the register useful rather than decorative — an asset that is out of service should not still be counted as available.'),
          steps(
            'Open Assets and add each item with its asset code — the code is what appears on the year-end stock list.',
            'Set the category (furniture, electronics, vehicles, sports, IT) so the Operations report can total by category.',
            'Record the location so a physical audit can be done shelf by shelf.',
            'Update the status when an item is moved, repaired, written off or disposed of.'
          ),
          h('Operations and expenses'),
          p('Operations holds the day-to-day service registers for the school. Expenses records what is spent, by category and date, which feeds both the Finance report and the Operations report without re-entry.'),
          h('Libraries as a service'),
          p('General Services can work the same library screens as the Librarian — catalogue, loans, transactions and inventory — which is useful when one person covers both roles.'),
        ],
      },
      {
        title: 'Shift Coordinator',
        blocks: [
          p('The Shift Coordinator publishes and maintains the duty roster and makes sure every post is covered.'),
          h('Screens available to the Shift Coordinator'),
          p('Dashboard · Shift Hub · Timetable · Teacher Attendance · Reports · Announcements · Chat.'),
          h('Shift Hub'),
          steps(
            'Open Shift Hub and choose the week.',
            'Assign staff to each duty post for each day.',
            'Publish the roster so supervisors on the ground see the same version.',
            'When someone calls out, reassign the post and record the change so the handover is traceable.'
          ),
          h('Coverage and substitutions'),
          p('The Shift Hub is tied to the timetable, so a teaching substitution and a duty reassignment are visible in the same place. The Shifts & Coverage report exports the roster and every substitution for a period, which is what proves coverage was maintained.'),
        ],
      },

      {
        title: 'Student',
        blocks: [
          p('A student signs in to see their own school life: what they have to do today, how they are doing, and what they have borrowed.'),
          h('Screens available to the Student'),
          p('Dashboard · My Timetable · My Library · Reports (My Progress) · Announcements.'),
          h('My Timetable'),
          p('Your weekly timetable by day and period. It is the screen to check before every lesson, and it reflects any substitution recorded for you.'),
          h('My Progress'),
          p('My Progress is your own academic record: attendance percentage, every exam result with the mark, the percentage and the letter grade, and a running total of what has been paid. It is the same data the school holds, shown without anybody else’s.'),
          steps(
            'Open Reports to see My Progress.',
            'Read the attendance rate first — it is the one number teachers watch.',
            'Check each subject’s result and the overall average.',
            'Ask your teacher about anything you expected to see and did not.'
          ),
          h('My Library'),
          p('The books you currently have on loan and the full borrowing history, so you know what is due back and when.'),
          note('A student cannot see other students, staff salaries, school finances, or any school-wide report.'),
        ],
      },
      {
        title: 'Parent',
        blocks: [
          p('A parent sees their own children and nothing else — their classes, results, attendance and fee position.'),
          h('Screens available to the Parent'),
          p('Dashboard · My Timetable · My Library · Reports (My Children) · Announcements · Chat.'),
          h('My Children'),
          p('My Children lists every child linked to your account, with their class. Each child’s report card, results, attendance and payment history are under that child.'),
          steps(
            'Open Reports to see My Children.',
            'Choose the child if you have more than one.',
            'Review the term results and the attendance rate.',
            'Check the payment position and settle anything outstanding at the office.'
          ),
          h('My Timetable'),
          p('The timetable for the child you are viewing, so you can see what is being taught and when.'),
          h('Finding the right parent account'),
          p('Parents are matched on phone number. If your child shows no parent linked, ask the office to confirm the guardian phone recorded at admission — the school’s Unlinked Students list shows exactly which students are missing a guardian and lets the office link or create one.'),
        ],
      },
    ],
  },

  {
    part: 'Part III — Daily Workflows',
    short: 'Workflows',
    chapters: [
      {
        title: 'Admissions and Student Registration',
        blocks: [
          p('Registering a student is the single most important data-entry task in the school, because everything downstream — attendance, billing, results, reporting — attaches to that record.'),
          h('Before you start'),
          ul('The academic year must exist and be the current one.',
            'The class the student will join must already exist, with its section chosen.',
            'Decide who the guardian is and get their phone number. A student with no reachable guardian will appear on the Unlinked Students list until this is fixed.'
          ),
          h('Registering a student'),
          steps(
            'Open Students and choose Add Student (the Cashier uses Enroll, which is the same form in a guided wizard).',
            'Enter first name, middle name and last name exactly as they appear on the birth certificate or the transfer document. Names are stored in three parts and appear that way on reports and report cards.',
            'Enter gender and date of birth.',
            'Choose level group, then grade level, then class and section. Selecting the class filters the section list automatically.',
            'Enter the guardian phone number, and the mother’s and father’s phone numbers where they are known. These are stored separately and used to match parent accounts.',
            'Save. The student is created active and immediately available for attendance, billing and exams.'
          ),
          h('After registration'),
          ul('Check the student appears on the class roster, not in "Unassigned".',
            'Confirm a monthly bill was generated for the current month.',
            'Check the Parents screen: a parent account should now exist for the guardian phone.',
            'Give the parent their sign-in details — they use the same phone number.'
          ),
          h('Students with no guardian'),
          p('Some students arrive without a reachable guardian phone, or with a phone that matches no parent. The Parents screen has an Unlinked Students tab listing every such student, with the ability to link the student to an existing parent account or create a new guardian record.'),
          steps(
            'Open Parents and switch to the Unlinked Students tab.',
            'Search or filter by class to work through the list.',
            'Choose Link guardian, then either pick an existing parent whose phone matches, or create a new guardian with the correct number.',
            'Save. The student moves out of the unlinked list and the parent can now see them.'
          ),
          h('Archiving and reactivating'),
          p('A student who leaves is archived, not deleted. Archiving keeps attendance, results and payment history intact while removing the student from rosters, billing and most lists. Archived students can be reactivated if they return.'),
          steps(
            'Open Students, find the student, and choose Archive.',
            'Confirm the reason when prompted.',
            'To reverse it, filter by Archived and choose Reactivate.'
          ),
          note('Never delete a student record. If the data is wrong, edit it; if the student left, archive it. Deleting breaks the history that reports and report cards depend on.'),
        ],
      },
      {
        title: 'Classes, Subjects and Homeroom',
        blocks: [
          p('The academic structure is the skeleton of the school. Set it up once, correctly, and timetables, exams and workload reports mostly build themselves.'),
          h('Subjects'),
          steps(
            'Open Subjects and add each subject the school teaches.',
            'Give the subject a name and, where the school uses them, a short code — the code appears on report cards and exam papers.',
            'Subjects are reused across classes, so a subject is created once, not per class.'
          ),
          h('Classes'),
          p('A class is one level, one grade, one section — KG A, Grade 4 B. Creating the class is what lets you assign a subject, a homeroom teacher, students and a timetable.'),
          steps(
            'Open Classes and add a class.',
            'Choose the level group (Nursery, KG, Primary, Secondary), the grade level, and the section letter.',
            'The class now accepts student enrolments, subject assignments and timetable slots.'
          ),
          h('The Classes screen'),
          p('The Classes screen is the operational view: every class with its homeroom teacher and its current student count, ordered Nursery through Secondary.'),
          steps(
            'Open Classes to review the whole structure at once.',
            'Drill into a class to see its roster and student count.',
            'Assign or change the homeroom teacher from the class itself using the homeroom control.',
            'The assignment appears immediately on the timetable and in the homeroom report.'
          ),
          h('Homeroom teacher'),
          p('The homeroom teacher is the accountable adult for a class: first point of contact for parents, and the person responsible for that class’s records. Assign one homeroom teacher per class; the system will accept a change at any time and keeps the history.'),
          h('How classes flow into everything else'),
          ul('Timetable slots belong to a class and a subject.',
            'Exams belong to a class, a subject and a term.',
            'Attendance is marked per class.',
            'Teacher workload and teaching load reports are built from class and subject assignments.'
          ),
        ],
      },
      {
        title: 'Attendance',
        blocks: [
          p('Attendance is recorded twice in the system — once for students and once for staff — and both feed reports, deductions and performance scores.'),
          h('Student attendance'),
          steps(
            'Open Attendance and choose the date and the class.',
            'Mark each student Present, Late or Absent. Use the bulk actions to set a whole class or section at once, then adjust individuals.',
            'Save. The marks are available immediately to the Principal, to reports and to report cards.'
          ),
          ul('Present — in school and on time.',
            'Late — present but after the start of the session; this is counted separately from present because it feeds punctuality.',
            'Absent — not in school. This is the only student status that carries an unpaid-day weight.'
          ),
          h('Staff attendance'),
          p('Staff attendance is the HR screen and it has three views, described in the HR chapter. The summary is for a single date, the grid is for a week, and the statistics aggregate a period per person.'),
          steps(
            'Open Teacher Attendance.',
            'Use the Daily summary for one-off or late entries on a single day.',
            'Use the Weekly grid to fill a whole week for all staff in one pass — this is the efficient way to do a normal week.',
            'Check Period statistics before payroll to confirm nobody has unexpected unpaid days.'
          ),
          h('How attendance is used elsewhere'),
          ul('Payroll — absent and half days become unpaid days, which produce the attendance deduction.',
            'Performance — attendance and punctuality rate are automatic teacher KPI components.',
            'Reports — the Attendance report shows rates by class, by level, by weekday and lists students with the most absences.',
            'Availability — approved leave appears as unavailable days so substitution and timetabling know who is free.'
          ),
        ],
      },
      {
        title: 'Exams, Grades and Report Cards',
        blocks: [
          p('The academic results path runs from an exam definition, through mark entry, to aggregation and the report card.'),
          h('Creating an exam'),
          steps(
            'Open Exams & Grades and choose New Exam.',
            'Choose the class, the subject and the term the exam belongs to.',
            'Set the exam name and the total marks it is out of — the total is what every percentage is calculated from, so set it before entering marks.',
            'Save the exam. It is now open for mark entry.'
          ),
          h('Entering marks'),
          steps(
            'Open the exam.',
            'Enter each student’s mark obtained.',
            'Save. Each mark is stored against the student, subject and exam.',
            'The exam stops being shown as pending on the teacher’s workspace once marks are in.'
          ),
          h('How results are aggregated'),
          p('Marks are rolled up by subject and by term. For each student the system computes a percentage per subject, a letter grade, and an overall percentage and GPA across the term. Subject results print in the subject order the school uses.'),
          h('Report cards'),
          steps(
            'Open the student’s record and choose the report card for the term.',
            'Review subject marks, the overall average and the GPA.',
            'Print or export as PDF. The report card carries the school’s identity and the term’s data.',
            'Report cards for a whole class can be produced together from the class results view.'
          ),
          h('Reweighting and scales'),
          p('Where continuous assessment and final exams are combined, the class result view supports entering CA and final components separately against a weighting, so the reported score reflects the school’s weighting policy rather than a raw total.'),
          note('Set the exam total before entering marks. Changing it later recalculates every percentage for that exam.'),
        ],
      },
      {
        title: 'Fees, Billing and Payments',
        blocks: [
          p('The money side for students runs fee structure → monthly bill → payment → balance, and each stage updates the next.'),
          h('Fee structures'),
          steps(
            'Open Fee Structures.',
            'Define the monthly amount per grade level. Add separate items where the school charges for transport, meals or uniforms.',
            'Confirm the structure is active for the current academic year.',
            'Structures are versioned by year, so last year’s fees stay intact for last year’s reports.'
          ),
          h('Monthly billing'),
          steps(
            'Open Fees and run the monthly billing for the period.',
            'Every active enrolled student receives a bill at the rate for their grade level.',
            'Any late payment may attract a penalty, applied by the billing rules.',
            'Bills appear against each student with their balance, and unpaid bills appear on the Outstanding Balances sheet.'
          ),
          h('Taking payments'),
          steps(
            'Open Payments and choose Record Payment.',
            'Find the student by name or phone number.',
            'Enter the amount, the method, and a receipt or transaction reference.',
            'Save. The bill balance reduces and the payment is appended to the student’s history.'
          ),
          h('What Finance sees'),
          table(['Report', 'What it answers'], [
            ['Payments sheet', 'Every payment in the period with student, class, amount, method and receipt.'],
            ['Outstanding Balances', 'Who still owes, how much, and how old the oldest unpaid bill is.'],
            ['Collection Report', 'Daily and monthly collection totals, by method and by class, with the outstanding position.'],
          ]),
          note('Payments are never edited in place. To correct a payment, record the difference or reverse and re-enter it, so the ledger stays auditable.'),
        ],
      },
      {
        title: 'Payroll',
        blocks: [
          p('Payroll turns the staff record and the month’s HR data into a paid amount, and it does most of the arithmetic for you.'),
          h('What feeds a payroll run'),
          ul('Basic pay — read from the Salary Register for the staff member.',
            'Overtime — approved overtime for that staff member and month.',
            'Attendance deduction — derived from the unpaid days HR recorded.',
            'Income tax — computed from the Tax Brackets table against basic plus overtime.',
            'Pension — employee and employer percentages of basic pay.',
            'Other allowances and deductions — transport, housing, phone, back pay, loans, office loan, school pay.'
          ),
          h('Running the month'),
          steps(
            'Confirm HR has finished marking attendance for the month. This is the step that most often causes surprises.',
            'Open Payroll and select the month and year.',
            'For each staff member, press Calculate. The system fills basic pay from the salary register, adds approved overtime, and computes tax, pension and the attendance deduction.',
            'Review the computed lines. Check the attendance deduction especially — a deduction that looks wrong means the attendance record is wrong.',
            'Save the entry, then post the run to make it count towards reporting.',
            'Review Payroll Audit to see exactly what was changed and by whom.'
          ),
          h('Correcting a run'),
          p('A payroll entry can be edited after saving but before it is locked. Editing re-applies the automatic calculations for anything you did not override, so correct the source — overtime, attendance — rather than forcing a number, unless the correction is genuinely manual.'),
          h('The salary register'),
          p('The Salary Register holds each staff member’s salary components: basic pay, transport, housing, account and phone allowances, back pay and unit or department leadership allowances. Payroll reads from it, so the register is the place to change what someone is paid, not the payroll entry.'),
          note('Only Finance should edit salary components. Administrators can read them for reporting.'),
        ],
      },
      {
        title: 'Overtime',
        blocks: [
          p('Overtime is recorded by HR, approved by HR, and paid by Finance through payroll. This chapter covers the whole path.'),
          h('The calculation'),
          p('Overtime pay is built from the staff member’s hourly rate and a multiplier that depends on when the work was done:'),
          table(['Type', 'When it applies', 'Multiplier'], [
            ['Day', 'A working day, inside the configured day window.', '× 1.5'],
            ['Night', 'A working day, outside the day window.', '× 1.75'],
            ['Rest day', 'A weekend or other rest day.', '× 2'],
            ['Public holiday', 'A date listed as a public holiday.', '× 2.5'],
          ]),
          p('The hourly rate is derived from basic pay: hourly rate = basic pay ÷ working days per month ÷ hours per day. With a default of 26 working days and 8 hours, a staff member on 14,300 birr has an hourly rate of 68.75, and three hours of day overtime pays 3 × 68.75 × 1.5 = 309.38 birr.'),
          h('Adjusting the settings'),
          p('Every number above is editable by an administrator from the Overtime screen’s Settings panel, so the school can match its own policy.'),
          table(['Setting', 'Default', 'What it does'], [
            ['Working days per month', '26', 'The divisor in the hourly-rate formula.'],
            ['Hours per day', '8', 'The second divisor in the hourly-rate formula.'],
            ['Day window start / end', '06:00 / 22:00', 'The hours treated as day overtime; anything outside is night overtime.'],
            ['Day multiplier', '1.5', 'Pay factor for day overtime.'],
            ['Night multiplier', '1.75', 'Pay factor for night overtime.'],
            ['Rest day multiplier', '2', 'Pay factor for weekend and rest-day work.'],
            ['Holiday multiplier', '2.5', 'Pay factor for public holidays.'],
            ['Public holidays', 'list of dates', 'Dates classified as holidays, which also take precedence over the rest-day rule.'],
          ]),
          h('Recording overtime'),
          steps(
            'Open HR → Overtime and choose Add Overtime.',
            'Select the staff member, then the date and the number of hours.',
            'If you enter a start time, the system classifies the entry automatically — weekend or holiday becomes rest day or holiday, and otherwise it is day or night depending on the window. You can also set the type yourself.',
            'Add a note if the reason matters (for example, a school event).',
            'Save. The amount, multiplier and hourly rate are stored on the entry as a snapshot, so later settings changes do not rewrite history.'
          ),
          h('Approval and payment'),
          steps(
            'Pending entries are not paid. Approve an entry to include it in payroll.',
            'When Finance calculates payroll for that staff member and month, the approved overtime total is added to the entry automatically.',
            'If Finance types an overtime figure by hand, that manual figure is used instead — the way to correct a run without touching the overtime record.'
          ),
          h('Reviewing'),
          p('The Overtime screen summarises the period by type and by staff member, showing total hours, total value, and how much is still pending versus approved. The same data is a sheet in the Staff & HR report download.'),
        ],
      },
      {
        title: 'Leave and Staff Performance',
        blocks: [
          p('Leave and performance are the two HR areas that decide whether a staff member’s record is complete for the year.'),
          h('Leave'),
          steps(
            'A staff member requests leave from the Leave Mgmt screen, choosing the leave type, the start and end dates and a reason.',
            'HR opens Leave Mgmt, reviews the pending request and approves or rejects it.',
            'Approving makes every day in the range unavailable for teaching, and those days show as leave in the attendance statistics.',
            'Approved leave is also exported in the Leave sheet of the Staff & HR report, which lists each person with the number of days taken.'
          ),
          h('Performance criteria'),
          p('Performance is scored against criteria that HR defines. Each criterion has a weight and can be scored manually by a reviewer or filled automatically from a data source.'),
          table(['Automatic source', 'What it uses'], [
            ['Attendance & punctuality', 'The staff member’s attendance rate and punctuality rate for the period.'],
            ['Attendance', 'Attendance rate only.'],
            ['Punctuality', 'Punctuality rate only.'],
            ['Student results', 'The results of the students the staff member teaches.'],
          ]),
          steps(
            'Open Staff Performance and define the criteria the school reviews, giving each a weight.',
            'Choose the period — monthly is typical for teachers.',
            'Review the automatic scores. Where a metric is unfair or incomplete, override it with a written comment; the override is kept next to the automatic value.',
            'Complete the reviews for all staff in the period.',
            'The resulting ratings feed the Quality Assurance screen for principals.'
          ),
          h('Weights'),
          p('The criteria weights must add up to 100%. The Staff Performance screen shows the current total and warns if it does not, because the overall score is meaningless until the weights are complete.'),
        ],
      },
      {
        title: 'Library Operations',
        blocks: [
          p('The library module covers the catalogue, the loans, the transaction history and the physical stock.'),
          h('Adding books'),
          steps(
            'Open Library and choose Books.',
            'Add the title with author, category, ISBN and publisher.',
            'Set the number of copies held — this is what allows the same title to be issued more than once.',
            'The book is immediately available for issuing.'
          ),
          h('Issuing a book'),
          steps(
            'Open Borrowings and choose Issue.',
            'Search the borrower. Students are found by name or by student ID; IDs work with or without the leading zero.',
            'Search and select the book.',
            'Confirm. The copy is marked out and the transaction appears in the history with its issue date.'
          ),
          h('Returning a book'),
          steps(
            'Open Borrowings, find the open loan, and choose Return.',
            'The copy becomes available again automatically.',
            'If the copy is damaged or lost, record the condition from the Book Assessment page so the loss is visible in stock value.'
          ),
          h('Overdue and disputes'),
          p('The Transactions page is the authority on who has what. Filter by borrower or by book, and the outstanding loans are visible with their issue dates.'),
          h('Inventory and assessment'),
          steps(
            'Open Book Assessment and record the condition of copies — new, good, fair, damaged, lost.',
            'Open Inventory to reconcile counted quantity against system quantity.',
            'Record any shortfall with a reason; the difference flows into the year-end stock position.'
          ),
          h('Students and parents'),
          p('Students see their own loans under My Library, including what is due back. Parents see the same for their children. Neither can alter the catalogue.'),
        ],
      },
      {
        title: 'Operations, Assets and Security',
        blocks: [
          p('These are the non-academic registers that keep the school running day to day.'),
          h('Assets'),
          p('The asset register records each item with a code, category, quantity, unit and total cost, location, status and purchase date. Status matters: an item that is out of service, written off or disposed of should not still be counted as available. Assets can be exported for a physical audit.'),
          h('Operations registers'),
          p('General Services maintains the operational registers — facilities, vehicles, services and related day-to-day records — and records expenses by category and date, which feed both the Operations and Finance reports.'),
          h('Security'),
          p('The Security Hub holds the Visitors, Incidents and Gate Passes registers, described in full in the Security Head chapter. All three export through the Security report.'),
          h('Shifts and coverage'),
          p('The Shift Hub publishes the weekly duty roster, and substitutions recorded against the timetable keep teaching coverage in the same view. The Shifts & Coverage report exports the roster and substitutions for a period.'),
        ],
      },
    ],
  },

  {
    part: 'Part IV — Reporting and Data',
    short: 'Reporting',
    chapters: [
      {
        title: 'The Report Center',
        blocks: [
          p('Reports is the analytics layer of the system. It gives a role-appropriate set of dashboards, and every dashboard can be downloaded or shared.'),
          h('The report catalogue'),
          table(['Report', 'Shows', 'Who sees it'], [
            ['School Overview', 'Enrolment by level, collections, outstanding balances, staffing and key ratios.', 'Admin, Owner, GM, Principal, VP, Quality Director'],
            ['Academic Performance', 'Exam results, averages and subject-level comparisons.', 'Admin, Owner, GM, Principal, VP, Quality Director, Teacher'],
            ['Attendance', 'Attendance rates, daily trend, by-grade comparison and students with the most absences.', 'Admin, Owner, GM, Principal, VP, Quality Director, Teacher'],
            ['Finance', 'Revenue, expenses by category and outstanding balances.', 'Admin, Owner, GM, Finance, Accountant'],
            ['Collections', 'Daily receipts, payment methods and collection totals.', 'Admin, Owner, Cashier, Finance'],
            ['Staff & HR', 'Headcount by role, qualifications, joining trend, plus detailed sheets (see below).', 'Admin, Owner, GM, HR'],
            ['Quality Assurance', 'Syllabus completion, feedback scores and substitution coverage.', 'Admin, Owner, Quality Director, Principal, VP'],
            ['Operations & Assets', 'Asset counts by category and status, and operational registers.', 'Admin, Owner, GM, General Services'],
            ['Security', 'Visitors, incidents and gate passes for a period.', 'Admin, Owner, Security Head, GM, Principal'],
            ['Shifts & Coverage', 'Duty roster and teacher substitutions for a period.', 'Admin, Owner, Shift Coordinator, Principal, VP, Quality Director'],
            ['My Teaching', 'The students in the teacher’s own classes, by class and subject.', 'Teacher'],
            ['My Progress', 'The student’s own attendance, results and payments.', 'Student'],
            ['My Children', 'A parent’s children, their results, attendance and payments.', 'Parent'],
          ]),
          h('Using a report'),
          steps(
            'Open Reports. You see only the reports your role is allowed.',
            'Pick a report and set the period with the from and to dates.',
            'Read the dashboard — KPI tiles first, then the charts and any tables listing the underlying rows.',
            'Drill down where a figure surprises you before exporting anything.',
            'Download the workbook or share the report when someone else needs it.'
          ),
          h('Scope in reports'),
          p('A principal scoped to KG receives KG-only enrolment, attendance and student figures in every report and in every export. Scoping is applied to the data, not just the charts, so a shared link is scoped too.'),
          h('The Staff & HR workbook'),
          p('The Staff & HR report is the most detailed download in the system. Its workbook contains a Summary sheet plus a set of list sheets:'),
          table(['Sheet', 'Contents'], [
            ['Staff', 'The full staff list with role, title, qualification, joining date and salary components.'],
            ['Teachers w/o Assignment', 'Teachers who have no subject or class assigned — the coverage gap list.'],
            ['Leave', 'Every staff member who took approved leave in the period, with leave type, dates, reason and the number of days.'],
            ['Staff Attendance', 'Per person: present, late, absent, leave, emergency, half days, days marked and attendance percentage.'],
            ['Overtime', 'Every overtime entry with date, hours, type, multiplier, hourly rate, amount and approval status.'],
          ]),
          p('The student-facing reports follow the same pattern of one sheet per class or section, so a large cohort can be handed to a coordinator as a single workbook rather than a screen-by-screen copy.'),
        ],
      },
      {
        title: 'Exports and Formats',
        blocks: [
          p('Every report and every major list can be exported. The format determines what you do next.'),
          table(['Format', 'Best for'], [
            ['Excel (.xlsx)', 'Working with the data. Contains a Summary sheet and one or more detailed list sheets, with filters and frozen headers.'],
            ['CSV', 'Feeding another system or a database; no formatting overhead.'],
            ['PDF', 'Formal documents that will be printed or filed — report cards in particular.'],
            ['Print / image', 'Charts and summaries for a slide or a meeting pack.'],
            ['Per-class Excel', 'Handing one coordinator exactly their own class, sheet by sheet.'],
          ]),
          steps(
            'Open the report or list you need.',
            'Set the period and any filters — the export honours exactly what you are looking at.',
            'Choose the format and download.',
            'For a shared audience, prefer sharing over sending attachments (see Sharing Reports).'
          ),
          h('Named exports'),
          p('Some lists have their own export in addition to the report download — for example the student master list, the per-class student roster, the teacher workload list, and library transactions. These are the exports to use when you need a list rather than a report.'),
          h('Large cohorts'),
          p('Exports are built server-side, so a workbook for several thousand students or a full year of transactions is generated as a file rather than assembled in the browser. This is why an export may take a few seconds before the download starts.'),
        ],
      },
      {
        title: 'Sharing Reports',
        blocks: [
          p('Sharing lets you give someone a specific report without creating them an account and without exporting anything.'),
          h('Creating a share link'),
          steps(
            'Open the report and set the period as you want it to be seen.',
            'Press Share.',
            'Choose whether the shared view shows aggregate figures only or also includes the detailed name lists — this matters for sensitive reports.',
            'Optionally set an expiry date.',
            'Copy the link and send it to the recipient.'
          ),
          h('What the recipient sees'),
          p('The link opens a clean, public page showing the report as it was when the link was created. It is a snapshot: if the underlying data changes afterwards, the shared page keeps showing the original figures. No login is required, and the recipient sees only that report.'),
          h('Managing shared links'),
          steps(
            'Open the shared links list — it shows every link you and your colleagues have created, with the report, the creator and the creation date.',
            'Use it to find the recipient who claims they cannot open a report.',
            'Revoke a link to stop it working immediately; the page then refuses to load.'
          ),
          h('Sharing rules to follow'),
          ul('Share with the least detail that answers the question — aggregate-only for anything involving individual pay or performance.',
            'Always set an expiry on a share that contains name lists.',
            'Revoke links once the period has been reviewed.',
            'Anything shared this way is as public as the link, so do not forward it outside the school.'
          ),
        ],
      },
    ],
  },

  {
    part: 'Part V — Administration',
    short: 'Administration',
    chapters: [
      {
        title: 'Users, Roles and Permissions',
        blocks: [
          p('This is where access to the system is defined. Every person has a role, and every role has a set of permissions.'),
          h('Users'),
          p('The Users screen holds every account in the school — staff, teachers, students and parents. From it you can create a person, edit their details, change their role, set their status and reset their password.'),
          steps(
            'Open Users and filter by role to find the person.',
            'Edit details, or use the role selector to change what they can do.',
            'Set status to inactive rather than deleting, so their history is preserved.',
            'Use Reset password to let them set their own on next sign-in.'
          ),
          h('Roles and permissions'),
          p('Roles are permission bundles. A role is a set of capabilities — view students, manage fees, run payroll, approve leave — and the application hides or disables anything a role cannot do.'),
          steps(
            'Open Roles & Permissions.',
            'Choose the role to review — HR, Finance, Teacher, Cashier and so on.',
            'Review each capability and switch it on or off to match the job.',
            'Save. The change applies the next time the affected user loads a screen.'
          ),
          h('Granting a new role'),
          steps(
            'Prefer an existing role over inventing a new one — existing roles already carry sensible permissions.',
            'If a new role is genuinely needed, create it and copy the permissions of the closest existing role, then adjust.',
            'Test the role with the demo account of that type before rolling it out.',
            'Review roles whenever staff change position, and remove roles from people who have left.'
          ),
          note('Broader access is not safer. Give each person the narrowest role that lets them do their job, and rely on scopes for partial visibility.'),
        ],
      },
      {
        title: 'Settings, Import and Backup',
        blocks: [
          p('Three administrative tools that matter at the start of a year and occasionally during one.'),
          h('Settings'),
          p('Settings holds school-wide options: school identity and contact details, the current academic year, attendance deduction policy, and other defaults that affect how the whole system behaves.'),
          h('Import'),
          p('Import is for bulk-loading existing data — students, staff and classes — from a file, rather than typing records one at a time. It is the fastest way to bring a school onto the system.'),
          steps(
            'Prepare the file with the columns the importer expects, one record per row.',
            'Open Import and choose what you are loading.',
            'Upload the file and let the importer validate it. Validation reports what it accepted and what it rejected.',
            'Review the rejected rows, correct them, and upload again.',
            'Verify the result on the relevant list screens before closing.'
          ),
          p('Import validates before it writes, so a malformed row does not half-load the school. Always import the academic structure — subjects and classes — before importing students and staff, since records depend on it.'),
          h('Backup'),
          p('Backup produces a full database snapshot you can download and keep off-site.'),
          steps(
            'Open Backup.',
            'Create a backup.',
            'Download the file and store it somewhere that is not the web server.',
            'Take a backup before any bulk import, any large re-classification, and before a payroll posting.'
          ),
          note('A backup taken after the damage is not a backup. Schedule them before you need them, not after.'),
        ],
      },
      {
        title: 'Audit Logs and Security',
        blocks: [
          p('The audit log records sensitive actions so you can answer who changed what, and when.'),
          h('What is recorded'),
          ul('Payroll changes, including who created, edited and posted each entry.',
            'Permission and role changes.',
            'Student and staff record changes, including archival and reactivation.',
            'Record deletions.',
            'Report sharing and link revocation.'
          ),
          h('Using the log'),
          steps(
            'Open Audit Logs.',
            'Filter by date range, user or action type.',
            'Read the entry details — what changed, from what, to what.',
            'Investigate anything unexpected with the person concerned, then correct the record through the normal screen.'
          ),
          h('Practical security habits'),
          ul('Give every member of staff their own account. Never share a login.',
            'Review Roles & Permissions after every staff change.',
            'Revoke shared report links once the period has been reviewed.',
            'Sign out on shared and public computers.',
            'Take regular backups and keep a copy off the server.',
            'Use the audit log to review access when someone leaves the school.'
          ),
        ],
      },
    ],
  },

  {
    part: 'Appendix',
    short: 'Appendix',
    chapters: [
      {
        title: 'Glossary',
        blocks: [
          table(['Term', 'Meaning'], [
            ['Active', 'A student or staff member currently enrolled or employed. Active records appear in rosters, billing and most lists.'],
            ['Archived', 'A record that is no longer active but whose history is preserved. Archived students can be reactivated.'],
            ['Basic pay', 'The base salary in the Salary Register that payroll builds on.'],
            ['Basic Allowance (BA)', 'The base component of a fee structure for a grade level.'],
            ['Class', 'One level, grade and section — for example KG A or Grade 4 B.'],
            ['Homeroom teacher', 'The accountable teacher for a class and first point of contact for its parents.'],
            ['Level group', 'Nursery, KG, Primary or Secondary. The top of the academic structure.'],
            ['Overtime multiplier', 'The pay factor applied to overtime hours: 1.5 day, 1.75 night, 2 rest day, 2.5 public holiday.'],
            ['Report card', 'The per-term summary of a student’s subject results, average and GPA.'],
            ['Scope', 'A restriction limiting a role to part of the school, such as Nursery and KG only.'],
            ['Section', 'The subdivision of a grade level, such as A or B.'],
            ['Share link', 'A public URL showing a snapshot of one report, optionally with an expiry.'],
            ['Substitution', 'A recorded replacement teacher for a scheduled lesson.'],
            ['Unpaid day', 'A day absent (1.0) or a half day (0.5), which drives the payroll attendance deduction.'],
            ['Unlinked student', 'A student with no parent account matched to their guardian phone.'],
            ['Working days', 'The divisor in the overtime hourly-rate formula, configurable in Overtime Settings.'],
          ]),
        ],
      },
      {
        title: 'Troubleshooting',
        blocks: [
          table(['Symptom', 'What it usually means'], [
            ['A menu item is missing.', 'Your role does not include it. An Owner or Administrator can grant it under Roles & Permissions.'],
            ['A screen opens but returns an error.', 'Your role has the menu entry but not the permission behind it. Have the permission checked.'],
            ['Cannot find a parent for a student.', 'No parent account matches the guardian phone. Check the Unlinked Students tab on the Parents screen and link or create the guardian.'],
            ['A student is missing from a class roster.', 'The student is archived, or has not been assigned a class. Check status first, then enrolment.'],
            ['Payroll attendance deduction looks wrong.', 'Attendance was not marked or was marked after the run. Check the period statistics, correct the attendance, then re-calculate.'],
            ['Overtime is missing from payroll.', 'The entry is still pending. Approve it, then re-calculate the payroll entry.'],
            ['Overtime amount changed unexpectedly.', 'Basic pay or the Overtime Settings changed. Each entry stores the rate and multiplier used at the time, so review the entry’s stored values.'],
            ['A report shows fewer students than expected.', 'The report follows your role’s scope. A level-scoped principal sees only their levels.'],
            ['An export is slow.', 'Large workbooks are generated server-side; a full-year or full-cohort export takes a few seconds before the download starts.'],
            ['A shared link stopped working.', 'It expired or was revoked. Manage links from the shared links list and create a new one.'],
            ['Cannot log in.', 'Check the identifier: username, email or phone all work. If the account is inactive or the password was reset, ask an Administrator.'],
            ['Something looks broken after a deployment.', 'Hard-refresh the browser to clear the previous bundle, then try again.'],
          ]),
          h('Who to ask'),
          ul('Data and records — the Administrator.',
            'Staff, leave, attendance and overtime — HR.',
            'Money, fees and payroll — Finance.',
            'Teaching load, results and classes — the Principal or Quality Director.',
            'Access and permissions — the Owner or Administrator.',
            'The system itself — EnglesTech Plc support.'
          ),
        ],
      },
    ],
  },
];

// ── Role scope per chapter ────────────────────────────────────────────
// Used to personalise the help page: a signed-in user sees the chapters
// that apply to their role first. '*' means the chapter applies to everyone.
const ROLE_SCOPE = {
  'Introduction': '*',
  'Getting Started': '*',
  'How the System Fits Together': '*',
  'School Owner': ['owner'],
  'Administrator': ['admin'],
  'General Manager': ['general_manager'],
  'Principal': ['principal'],
  'Vice Principal': ['vice_principal'],
  'Quality Director': ['quality_director'],
  'HR Officer': ['hr'],
  'Finance Officer and Accountant': ['finance', 'accountant'],
  'Cashier': ['cashier'],
  'Teacher': ['teacher'],
  'Librarian': ['librarian'],
  'Security Head': ['security_head'],
  'General Services': ['general_services'],
  'Shift Coordinator': ['shift_coordinator'],
  'Student': ['student'],
  'Parent': ['parent'],
  'Admissions and Student Registration': ['owner', 'admin', 'cashier', 'principal', 'vice_principal'],
  'Classes, Subjects and Homeroom': ['owner', 'admin', 'principal', 'vice_principal', 'quality_director', 'hr', 'teacher'],
  'Attendance': ['owner', 'admin', 'principal', 'vice_principal', 'quality_director', 'teacher', 'hr', 'shift_coordinator'],
  'Exams, Grades and Report Cards': ['owner', 'admin', 'principal', 'vice_principal', 'quality_director', 'teacher'],
  'Fees, Billing and Payments': ['owner', 'admin', 'finance', 'accountant', 'cashier'],
  'Payroll': ['owner', 'admin', 'finance', 'accountant', 'general_manager'],
  'Overtime': ['owner', 'admin', 'hr', 'finance', 'accountant'],
  'Leave and Staff Performance': ['owner', 'admin', 'hr', 'quality_director', 'principal'],
  'Library Operations': ['owner', 'admin', 'librarian', 'general_services'],
  'Operations, Assets and Security': ['owner', 'admin', 'general_services', 'security_head', 'shift_coordinator'],
  'The Report Center': '*',
  'Exports and Formats': '*',
  'Sharing Reports': ['owner', 'admin', 'general_manager', 'principal', 'vice_principal', 'hr', 'finance', 'cashier', 'quality_director', 'general_services', 'security_head', 'shift_coordinator'],
  'Users, Roles and Permissions': ['owner', 'admin'],
  'Settings, Import and Backup': ['owner', 'admin'],
  'Audit Logs and Security': ['owner', 'admin', 'general_manager'],
  'Glossary': '*',
  'Troubleshooting': '*',
};

const ROLE_LABELS = {
  owner: 'School Owner', admin: 'Administrator', general_manager: 'General Manager',
  principal: 'Principal', vice_principal: 'Vice Principal', quality_director: 'Quality Director',
  hr: 'HR Officer', finance: 'Finance Officer', accountant: 'Accountant', cashier: 'Cashier',
  teacher: 'Teacher', librarian: 'Librarian', security_head: 'Security Head',
  general_services: 'General Services', shift_coordinator: 'Shift Coordinator',
  student: 'Student', parent: 'Parent', super_admin: 'Super Admin',
};

// Attach role scope + a stable slug to every chapter
function decorate() {
  DOC.forEach((part) => {
    part.chapters.forEach((ch, i) => {
      ch.roles = ROLE_SCOPE[ch.title] || '*';
      ch.slug = String(ch.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    });
  });
  return DOC;
}

module.exports = { DOC: decorate(), ROLE_SCOPE, ROLE_LABELS };
