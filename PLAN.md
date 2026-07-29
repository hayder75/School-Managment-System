# School Management System (SMS) — Comprehensive Development Plan

> Multi-tenant SaaS platform for managing schools.
> Web-first: React + Node.js + Express + PostgreSQL + shadcn/ui.

---

## Project Status (Last Updated: 2026-07-25)

### ✅ Complete
**Phase 1 (Foundation):** Docker Compose, all 18 migrations, seed data, auth/JWT/httpOnly cookies, auth/tenant/RBAC/validate middleware, tenants/users/classes/subjects/teachers modules, invite flow. Frontend: Vite+React+Tailwind+shadcn setup, LoginPage, role-based sidebar (super_admin/owner/admin/teacher/student/parent/finance/hr), ProtectedRoute, AppLayout, TenantsPage (super admin), UsersPage, ClassesPage, SubjectsPage, TeachersPage.

**Phase 2 (Academics):** Migrations for attendance, exams, grades, timetable + FK fix (016). Backend modules for attendance, exams, grades, timetable. Frontend: AttendancePage, ExamsPage (with inline grade entry), TimetablePage (weekly Mon-Sat grid).

**Phase 3 (Communication):** Migrations for chat (conversations, participants, messages) and notifications. Backend: chat module (conversations CRUD, messages, mark-read, unread count, teacher list), notifications module (list, read, unread). Socket.io with JWT auth, rooms per user/conversation, message send/persist/emit, typing, notification create+emit. Frontend: ChatPage (sidebar + real-time bubbles + send bar + teacher selector), NotificationBell (header icon with badge + dropdown + mark-read), hooks useChat/useNotifications, socket client lib.

**Phase 4 (Finance):** Migrations 019-022 (fee_structures, payments, expenses, payroll + salary_grades). Backend: fees module (structures + payments CRUD + summary), expenses module (CRUD + category totals), payroll module (grades + entries + monthly summary). Frontend: FeeStructuresPage (stats + table), PaymentsPage (record + history), ExpensesPage (category breakdown), PayrollPage (tabs: entries + salary grades).

**Phase 5 (Extended — partial):** Migration 023 (audit_logs). Backend: audit-logs module (list + filters), reports module (15 endpoints — enrollment, grade distribution, class performance, attendance overview, teacher workload, teacher my-students/my-attendance/my-grades, fee collection, outstanding balances, revenue vs expenses, staff directory, payroll summary, headcount, student grades/attendance), import module (bulk CSV import for students/teachers/payments). Frontend: AuditLogsPage (filterable table), ReportsPage (role-aware tabs: admin/teacher/finance/hr/student with stat cards + tables), ImportPage (paste CSV → preview → import).

### 🔄 Remaining Work

#### Backend
- [ ] Settings module (per-tenant key-value settings CRUD)
- [ ] Students module (dedicated CRUD — currently managed via generic Users)
- [ ] Parents module (CRUD + link to students via student_parents)
- [ ] Announcement module (broadcast to class/school)
- [ ] Email notification service (Nodemailer for invites, fee reminders)
- [ ] PDF report card generation (PDFKit)
- [ ] Academic year rollover + student promotion
- [ ] Late fee auto-calculation job
- [ ] API rate limiting per tenant
- [ ] Caching strategy (Redis for hot data)
- [ ] Data archiving for old academic years

#### Frontend
- [ ] SettingsPage (per-tenant branding, grading scale, locale)
- [ ] StudentsPage (dedicated student list + details + enrollment)
- [ ] ParentsPage (parent list + link to students)
- [ ] Student/Parent role-specific dashboards
- [ ] Typing indicators in Chat UI
- [ ] Loading skeletons on all pages (replace "Loading..." text)
- [ ] Form validation error display improvements
- [ ] Mobile responsiveness pass
- [ ] PWA support (offline capability for basic tasks)

---

## Table of Contents

1. [Tech Stack (All Free & Open Source)](#1-tech-stack-all-free--open-source)
2. [Project Structure (Monorepo)](#2-project-structure-monorepo)
3. [Multi-Tenant Database Design](#3-multi-tenant-database-design)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Parent-Teacher Chat (Real-time)](#6-parent-teacher-chat-real-time)
7. [Phased Development Roadmap](#7-phased-development-roadmap)
8. [Free & Open-Source Tools Summary](#8-free--open-source-tools-summary)
9. [Week 1 Start Plan](#9-week-1-start-plan)

---

## 1. Tech Stack (All Free & Open Source)

| Layer | Choice | Why |
|---|---|---|
| **Backend** | Node.js + Express.js | Simple, huge ecosystem, widely known |
| **Database** | PostgreSQL 16 | Best open-source RDBMS, row-level security |
| **Query Builder** | Knex.js | Migrations + query building, lightweight |
| **Validation** | Zod | Schema validation for API inputs |
| **Auth** | JWT + bcrypt + httpOnly cookies | Stateless, secure, simple |
| **Real-time** | Socket.io | Chat + live notifications |
| **Background Jobs** | Bull + Redis | Fee reminders, report gen, email queue |
| **Cache** | Redis | Session store, hot data cache |
| **File Storage** | Local disk → MinIO (later) | Simple to start, S3-compatible later |
| **Email** | Nodemailer + Mailpit (dev) / SendGrid (prod) | Free tiers available |
| **Frontend** | React 18 + Vite | Fast dev, modern tooling |
| **UI Library** | shadcn/ui + Tailwind CSS | Consistent design system, copy-paste components |
| **State / Data** | TanStack Query + Zustand | Server state + client state separation |
| **Routing** | React Router v6 | Standard SPA routing |
| **Forms** | React Hook Form + Zod | Performant forms with validation |
| **PDF** | PDFKit | Report card generation |
| **Containers** | Docker + Docker Compose | Postgres + Redis + app in one command |
| **Reverse Proxy** | Nginx | Dev proxy + production static serving |
| **HTTP Client** | Axios | Promise-based, interceptor support |

---

## 2. Project Structure (Monorepo)

```
sms/
├── docker-compose.yml               # Postgres + Redis + app
├── .env.example
├── backend/
│   ├── src/
│   │   ├── server.js                # Entry point
│   │   ├── app.js                   # Express app setup (middleware, routes)
│   │   ├── config/
│   │   │   ├── index.js             # Env vars, constants
│   │   │   └── database.js          # Knex connection config
│   │   ├── database/
│   │   │   ├── migrations/          # Knex migration files
│   │   │   ├── seeds/               # Seed data (super admin, demo)
│   │   │   └── knexfile.js          # Knex CLI config
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT verification
│   │   │   ├── tenant.js            # Extract & set tenant context
│   │   │   ├── rbac.js              # Role/permission check
│   │   │   └── validate.js          # Zod schema validation
│   │   ├── modules/                 # Each module = route + controller + service + model
│   │   │   ├── auth/
│   │   │   ├── tenants/
│   │   │   ├── users/
│   │   │   ├── students/
│   │   │   ├── teachers/
│   │   │   ├── parents/
│   │   │   ├── classes/
│   │   │   ├── subjects/
│   │   │   ├── attendance/
│   │   │   ├── grades/
│   │   │   ├── timetable/
│   │   │   ├── fees/
│   │   │   ├── chat/
│   │   │   ├── notifications/
│   │   │   └── reports/
│   │   ├── shared/
│   │   │   ├── email.js             # Email sending service
│   │   │   ├── file.js              # File upload/storage service
│   │   │   └── pagination.js        # Pagination helper
│   │   ├── socket/
│   │   │   └── index.js             # Socket.io setup + chat rooms
│   │   └── jobs/                    # Bull queue processors
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn UI primitives (button, card, dialog, etc.)
│   │   │   ├── layout/              # Sidebar, navbar, app shell
│   │   │   ├── forms/               # Reusable form fields (FormField, Input, Select)
│   │   │   └── shared/              # DataTable, FileUpload, Avatar, etc.
│   │   ├── pages/
│   │   │   ├── auth/                # Login, register, forgot-password, reset-password
│   │   │   ├── super-admin/         # Tenant management, global dashboard
│   │   │   ├── dashboard/           # Role-based dashboards
│   │   │   ├── students/
│   │   │   ├── teachers/
│   │   │   ├── parents/
│   │   │   ├── classes/
│   │   │   ├── subjects/
│   │   │   ├── attendance/
│   │   │   ├── grades/
│   │   │   ├── timetable/
│   │   │   ├── fees/
│   │   │   ├── chat/
│   │   │   ├── notifications/
│   │   │   └── reports/
│   │   ├── hooks/                   # useAuth, useTenant, custom TanStack Query hooks
│   │   ├── lib/                     # Axios instance, utils, constants
│   │   ├── store/                   # Zustand stores (auth, chat, ui)
│   │   ├── types/                   # Shared type/interface definitions
│   │   └── App.jsx                  # Root component with routing
│   ├── public/
│   ├── index.html
│   ├── tailwind.config.js
│   ├── components.json              # shadcn config
│   └── package.json
└── README.md
```

---

## 3. Multi-Tenant Database Design

### Strategy

- **Shared database** with `tenant_id` column on every resource table.
- **Super Admin** has no tenant — works across all schools.
- **All other users** are scoped to a tenant. Every query auto-filters by `tenant_id` via Express middleware.
- Row-level security enforced at the **application layer** — no exceptions.

### Entity Relationship Summary

```
Tenant (School) ──has many──> Branches
Tenant ──has many──> AcademicYears
AcademicYear ──has many──> Terms
Tenant ──has many──> Classes
Tenant ──has many──> Subjects
Tenant ──has many──> Users (teachers, students, parents, staff)

Class ──has many──> Students
Class ──has many──> TeacherSubjects
Subject ──has many──> TeacherSubjects
User (Teacher) ──has many──> TeacherSubjects

Student ──has many──> Attendance
Student ──has many──> Grades
Student ──has many──> Payments
Student ──many to many──> Parents (via student_parents)

Exam ──has many──> Grades
Exam ──belongs to──> Class, Subject, Term

FeeStructure ──belongs to──> Class
Payment ──belongs to──> Student, FeeStructure

ChatConversation ──has many──> ChatMessages
ChatConversation ──has many──> ChatParticipants

User ──has many──> Notifications
```

### Core Tables (Full Schema)

#### Tenants (Schools)
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(255) | School name |
| slug | VARCHAR(100) | Unique, used in subdomain |
| domain | VARCHAR(255) | Custom domain (optional) |
| logo | TEXT | URL |
| address | TEXT | |
| phone | VARCHAR(50) | |
| email | VARCHAR(255) | |
| subscription_plan | VARCHAR(50) | free, basic, premium |
| status | VARCHAR(20) | active, suspended, trial |
| settings | JSONB | Branding, grading scale, locale, features |
| created_by | UUID | FK to users (super admin) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### Users
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK → tenants (nullable for super admin) |
| email | VARCHAR(255) | |
| password_hash | VARCHAR(255) | bcrypt hash |
| first_name | VARCHAR(100) | |
| last_name | VARCHAR(100) | |
| phone | VARCHAR(50) | |
| avatar | TEXT | URL |
| role | VARCHAR(50) | super_admin, owner, admin, teacher, student, parent, hr, finance, support |
| status | VARCHAR(20) | active, invited, suspended |
| last_login | TIMESTAMP | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**UNIQUE(tenant_id, email)** — same email can exist in different schools.

#### Branches
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| name | VARCHAR(255) | |
| address | TEXT | |
| phone | VARCHAR(50) | |
| is_head_office | BOOLEAN | |
| created_at | TIMESTAMP | |

#### Academic Years
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| name | VARCHAR(100) | e.g. "2025-2026" |
| start_date | DATE | |
| end_date | DATE | |
| is_current | BOOLEAN | Only one current per tenant |
| created_at | TIMESTAMP | |

#### Terms
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| academic_year_id | UUID | FK |
| name | VARCHAR(100) | e.g. "Term 1", "Semester 1" |
| start_date | DATE | |
| end_date | DATE | |
| created_at | TIMESTAMP | |

#### Classes
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| academic_year_id | UUID | FK |
| name | VARCHAR(100) | e.g. "Grade 7A" |
| grade_level | INTEGER | e.g. 7, 8, 9 |
| section | VARCHAR(50) | e.g. "A", "B" |
| room | VARCHAR(50) | |
| capacity | INTEGER | |
| class_teacher_id | UUID | FK → users (teacher) |
| created_at | TIMESTAMP | |

#### Subjects
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| name | VARCHAR(255) | e.g. "Mathematics" |
| code | VARCHAR(50) | e.g. "MATH101" |
| description | TEXT | |
| is_active | BOOLEAN | |
| created_at | TIMESTAMP | |

#### Teacher Subjects (Many-to-Many: Teacher ↔ Subject ↔ Class)
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| teacher_id | UUID | FK → users |
| subject_id | UUID | FK → subjects |
| class_id | UUID | FK → classes |
| is_primary | BOOLEAN | Primary teacher for this class-subject |
| created_at | TIMESTAMP | |

**UNIQUE(teacher_id, subject_id, class_id)**

#### Students
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| user_id | UUID | FK → users |
| student_number | VARCHAR(50) | School-assigned ID |
| class_id | UUID | FK → classes |
| enrollment_date | DATE | |
| status | VARCHAR(20) | active, transferred, dropped, graduated |
| emergency_contact | TEXT | |
| medical_info | JSONB | Allergies, conditions, notes |
| created_at | TIMESTAMP | |

#### Student Parents
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| student_id | UUID | FK → students |
| parent_id | UUID | FK → users |
| relationship | VARCHAR(50) | father, mother, guardian |
| is_primary | BOOLEAN | Primary contact |
| created_at | TIMESTAMP | |

#### Attendance
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| student_id | UUID | FK → students |
| class_id | UUID | FK → classes |
| date | DATE | |
| status | VARCHAR(20) | present, absent, late, excused |
| marked_by | UUID | FK → users (teacher) |
| remark | TEXT | |
| created_at | TIMESTAMP | |

**INDEX(tenant_id, class_id, date)** — heavy query pattern.

#### Exams
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| name | VARCHAR(255) | e.g. "Midterm Exam" |
| type | VARCHAR(50) | quiz, midterm, final, assignment |
| class_id | UUID | FK → classes |
| subject_id | UUID | FK → subjects |
| term_id | UUID | FK → terms |
| date | DATE | |
| total_marks | DECIMAL(10,2) | |
| pass_marks | DECIMAL(10,2) | |
| description | TEXT | |
| created_at | TIMESTAMP | |

#### Grades
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| student_id | UUID | FK → students |
| exam_id | UUID | FK → exams |
| marks_obtained | DECIMAL(10,2) | |
| grade_letter | VARCHAR(5) | A, B+, B, etc. |
| remarks | TEXT | |
| locked_by | UUID | FK → users (teacher who locked) |
| locked_at | TIMESTAMP | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### Fee Structures
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| name | VARCHAR(255) | e.g. "Tuition Fee" |
| class_id | UUID | FK → classes |
| amount | DECIMAL(12,2) | |
| frequency | VARCHAR(50) | monthly, termly, yearly, one-time |
| due_date | DATE | |
| late_fee | DECIMAL(10,2) | |
| applicable_to | JSONB | Which students it applies to |
| is_active | BOOLEAN | |
| created_at | TIMESTAMP | |

#### Payments
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| student_id | UUID | FK → students |
| fee_structure_id | UUID | FK → fee_structures |
| amount_paid | DECIMAL(12,2) | |
| balance | DECIMAL(12,2) | |
| due_date | DATE | |
| paid_date | DATE | |
| status | VARCHAR(20) | pending, partial, paid, overdue, refunded |
| transaction_id | VARCHAR(255) | Payment gateway ref |
| payment_method | VARCHAR(50) | cash, bank, card, mobile |
| receipt_url | TEXT | |
| remarks | TEXT | |
| created_at | TIMESTAMP | |

#### Chat Conversations
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| subject | VARCHAR(255) | Auto-generated or user-defined |
| created_by | UUID | FK → users |
| created_at | TIMESTAMP | |

#### Chat Participants
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| conversation_id | UUID | FK → chat_conversations |
| user_id | UUID | FK → users |
| last_read_at | TIMESTAMP | |
| joined_at | TIMESTAMP | |

#### Chat Messages
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| conversation_id | UUID | FK → chat_conversations |
| sender_id | UUID | FK → users |
| content | TEXT | |
| attachment_url | TEXT | |
| created_at | TIMESTAMP | |
| edited_at | TIMESTAMP | |

#### Notifications
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| user_id | UUID | FK → users |
| title | VARCHAR(255) | |
| message | TEXT | |
| type | VARCHAR(50) | info, warning, alert, message |
| reference_type | VARCHAR(50) | attendance, grade, fee, chat, etc. |
| reference_id | UUID | |
| is_read | BOOLEAN | Default false |
| created_at | TIMESTAMP | |

#### Audit Logs
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| user_id | UUID | FK → users |
| action | VARCHAR(50) | create, update, delete, login, etc. |
| entity_type | VARCHAR(100) | student, grade, payment, etc. |
| entity_id | UUID | |
| old_values | JSONB | |
| new_values | JSONB | |
| ip_address | VARCHAR(45) | |
| user_agent | TEXT | |
| created_at | TIMESTAMP | |

#### Settings (Per-Tenant Configuration)
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK |
| key | VARCHAR(255) | e.g. "grading_scale", "school_logo" |
| value | JSONB | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**UNIQUE(tenant_id, key)**

---

## 4. Backend Architecture

### Middleware Chain (per request)

```
Request
  → rate-limiter (express-rate-limit)
  → CORS (cors package)
  → cookie-parser
  → auth (JWT verification → sets req.user)
  → tenant (extracts tenant_id → sets req.tenant)
  → rbac(permission) (checks role/permission → 401/403)
  → route handler
  → response
```

### Module Pattern

Every module follows the same structure:

```
modules/students/
├── students.routes.js        # Route definitions
├── students.controller.js    # Parse request, call service, send response
├── students.service.js       # Business logic, DB queries via Knex
└── students.validation.js    # Zod schemas for request bodies
```

### Auth Flow

1. **POST /api/auth/login** → validate email+password → issue JWT
2. JWT payload: `{ userId, tenantId, role, email }`
3. JWT stored in **httpOnly cookie** (prevents XSS attacks)
4. Every subsequent request: `auth` middleware decodes JWT → sets `req.user`
5. `tenant` middleware: if `req.user.tenantId` exists, fetches tenant info → sets `req.tenant`
6. `rbac(permission)` middleware: checks if user's role has the required permission for the resource

### Super Admin Routes

Super Admin has **no tenant**. They operate at global scope:

```
/api/admin/tenants       # CRUD schools
/api/admin/users         # Global user management
/api/admin/analytics     # Cross-school stats
```

### Tenant Isolation Enforcement

- Every service function receives `tenant_id` from `req.tenant.id`
- Knex queries always include `.where({ tenant_id })`
- No exceptions in application code
- Migrations include indexes on `tenant_id` for every table

### API Route Design

```
/api/auth           → Login, logout, me, refresh
/api/admin/*        → Super Admin only

# Scoped to tenant (all require tenant context)
/api/students       → CRUD students
/api/teachers       → CRUD teachers + subject/class assignment
/api/parents        → CRUD parents + link to students
/api/classes        → CRUD classes
/api/subjects       → CRUD subjects
/api/attendance     → Mark & view attendance
/api/grades         → Enter & view grades
/api/exams          → CRUD exams
/api/timetable      → Manage timetable
/api/fees           → Fee structures & payments
/api/chat           → Conversations & messages
/api/notifications  → User notifications
/api/reports        → Generate reports
/api/settings       → Tenant settings
```

### Response Format

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

Error response:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [...]
  }
}
```

---

## 5. Frontend Architecture

### App Shell

```jsx
<App>
  <AuthProvider>
    <Router>
      <Routes>
        <Route path="/auth/*" element={<AuthPages />} />

        <Route element={<ProtectedRoute />}>
          {/* Super Admin Layout — no sidebar tenant scope */}
          <Route path="/admin/*" element={<SuperAdminLayout />}>
            <Route path="tenants" element={<TenantList />} />
            <Route path="analytics" element={<GlobalAnalytics />} />
          </Route>

          {/* Tenant-scoped layout — sidebar + navbar */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students/*" element={<StudentsPages />} />
            <Route path="/teachers/*" element={<TeachersPages />} />
            <Route path="/parents/*" element={<ParentsPages />} />
            <Route path="/classes/*" element={<ClassesPages />} />
            <Route path="/subjects/*" element={<SubjectsPages />} />
            <Route path="/attendance/*" element={<AttendancePages />} />
            <Route path="/grades/*" element={<GradesPages />} />
            <Route path="/timetable/*" element={<TimetablePages />} />
            <Route path="/fees/*" element={<FeesPages />} />
            <Route path="/chat/*" element={<ChatPages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reports/*" element={<ReportsPages />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  </AuthProvider>
</App>
```

### Sidebar Adapts by Role

| Role | Sidebar Sections |
|---|---|
| **Super Admin** | Schools (Tenants), Global Analytics, Audit Logs |
| **School Owner / Principal** | Dashboard, Students, Teachers, Classes, Attendance, Grades, Timetable, Fees, Reports, Settings |
| **School Admin** | Dashboard, Students, Teachers, Parents, Classes, Subjects, Attendance, Settings |
| **Teacher** | Dashboard, My Classes, Attendance, Grades, Timetable, Chat |
| **Student** | Dashboard, My Timetable, My Grades, My Attendance, Assignments |
| **Parent** | Dashboard, My Children (grades, attendance, fees), Chat, Payments |
| **Finance** | Dashboard, Fee Structures, Payments, Expenses, Payroll, Reports |
| **HR** | Dashboard, Staff, Leave, Payroll |

### shadcn/ui Components Used

All from shadcn/ui (Radix UI primitives + Tailwind):

- Button, Input, Label, Card, Badge, Avatar
- Dialog, AlertDialog, DropdownMenu, Popover
- Table, DataTable (with search/sort/pagination)
- Form (React Hook Form integration)
- Select, Checkbox, RadioGroup, Switch
- Tabs, Separator, ScrollArea
- Toast, Sheet (mobile sidebar)
- Calendar, DatePicker
- Progress, Skeleton (loading states)

### API Layer

```jsx
// lib/api.js — Axios instance
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,  // sends httpOnly cookies
  headers: { 'Content-Type': 'application/json' }
});

// Response interceptor — unwrap data, handle 401
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      // redirect to login
      window.location.href = '/auth/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;
```

### Data Fetching with TanStack Query

```jsx
// hooks/useStudents.js
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useStudents(classId, page = 1) {
  return useQuery({
    queryKey: ['students', classId, page],
    queryFn: () => api.get('/students', { params: { classId, page } })
  });
}
```

### Client State with Zustand

```jsx
// store/auth.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setTenant: (tenant) => set({ tenant }),
  logout: () => set({ user: null, tenant: null, isAuthenticated: false })
}));
```

---

## 6. Parent-Teacher Chat (Real-time)

### Flow

1. **Parent** opens Chat → sees list of their child's teachers (fetched from student's class → teacher_subjects)
2. **Parent clicks a teacher** → conversation is fetched or created (if first time)
3. Both join Socket.io room for that conversation
4. **Messages** sent via Socket.io `emit` → persisted to DB → broadcast to room
5. **Teacher** gets real-time message + in-app badge + unread count
6. **Teacher replies** → parent gets real-time notification
7. **Offline handling**: Message stored in DB. On next login, unread count fetched via REST endpoint.

### Socket.io Setup

```
Server:
  io.on('connection', socket) {
    // Authenticate via JWT handshake
    // Join user's personal room: `user:${userId}`
    // On 'join:conversation': join `conversation:${convId}`
    // On 'message:send': persist + emit to conversation room
    // On 'typing': emit to conversation room
  }

Client:
  socket = io('/', { auth: { token: jwtToken } })
  socket.emit('join:conversation', conversationId)
  socket.emit('message:send', { conversationId, content })
  socket.on('message:new', (message) => appendToChat)
  socket.on('typing', (userId) => showTypingIndicator)
```

### Chat API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/chat/conversations | List user's conversations |
| POST | /api/chat/conversations | Create new conversation |
| GET | /api/chat/conversations/:id/messages | Get messages (paginated) |
| POST | /api/chat/conversations/:id/read | Mark as read |
| GET | /api/chat/teachers | Get list of child's teachers (for parent) |

### Notification Fallback

When a user is offline:
1. Message saved to DB
2. Unread count incremented
3. On next login: REST call fetches unread count
4. Also: email notification for important messages (configurable)

---

## 7. Phased Development Roadmap

### Phase 1 — Foundation (MVP) — ✅ Complete

#### Backend
- [x] Docker Compose setup (Postgres + Redis + app)
- [x] Knex initialization + first migrations (tenants, users)
- [x] Auth module: register, login, logout, JWT, httpOnly cookie
- [x] Auth middleware (verify JWT)
- [x] Tenant middleware (extract tenant context)
- [x] RBAC middleware (role check + permission check)
- [x] Tenants module: CRUD (Super Admin only)
- [x] Users module: CRUD within tenant (School Admin)
- [x] Classes module: CRUD
- [x] Subjects module: CRUD
- [x] Teacher-Subject-Class assignment module
- [ ] Students module: dedicated CRUD (generic via Users for now)
- [ ] Parents module: dedicated CRUD + link to students
- [x] Invitation flow (users created via invite link)

#### Frontend
- [x] Vite + React + Tailwind + shadcn setup
- [x] Auth pages (login page, logout)
- [x] App layout (responsive sidebar + navbar)
- [x] Super Admin pages: tenant list, create tenant
- [x] School Admin pages: user management (DataTable + forms)
- [x] Class management pages
- [x] Subject management pages
- [x] Teacher assignment pages
- [ ] Student management pages (dedicated — not yet built)
- [ ] Parent management pages (dedicated — not yet built)
- [x] Role-based sidebar rendering

### Phase 2 — Academics — ✅ Complete

#### Backend
- [x] Attendance module: mark present/absent/late/excused
- [x] Attendance reports (daily, monthly, per student via reports module)
- [x] Exams module: CRUD
- [x] Grades module: enter marks, calculate grade letters
- [x] Grade locking (prevent edits after deadline)
- [ ] Report card generation (PDF via PDFKit)
- [x] Timetable module: weekly schedule
- [ ] Academic year rollover + student promotion

#### Frontend
- [x] Attendance marking screen (class list → mark all)
- [x] Attendance view (per class/date)
- [x] Exam management screens
- [x] Grade entry screen (students table with input fields)
- [ ] Grade view (student report card view)
- [x] Timetable view (weekly grid)
- [ ] Timetable editor (drag-and-drop if feasible)

### Phase 3 — Communication — ✅ Mostly Complete

#### Backend
- [x] Socket.io setup + authentication
- [x] Chat module: conversations, messages, participants
- [x] Notification module: create, list, mark read
- [ ] Email notification service (via Nodemailer)
- [ ] Announcement module (broadcast to class/school)

#### Frontend
- [x] Chat UI: conversation list, message bubbles, send bar
- [x] Real-time message delivery (Socket.io client)
- [ ] Typing indicators (backend support done, frontend not wired)
- [x] Unread badge on conversation list
- [x] Notification dropdown (bell icon in navbar)
- [ ] Announcement creation + viewing

### Phase 4 — Finance — ✅ Complete

#### Backend
- [x] Fee structure management
- [x] Payment recording
- [ ] Invoice/receipt generation (PDF)
- [x] Outstanding balance tracking (report)
- [x] Expense tracking
- [x] Payroll (salary + deductions + payslip entries)
- [ ] Late fee auto-calculation (scheduled job)

#### Frontend
- [x] Fee structure admin screens
- [x] Payment form + payment history table
- [x] Student fee summary (total collected, outstanding)
- [x] Expense entry + reports
- [x] Payroll dashboard
- [ ] Receipt PDF view/download

### Phase 5 — Extended & Polish — ⏳ In Progress

#### Backend
- [x] Data import (CSV bulk operations for students/teachers/payments)
- [x] Custom report builder (15 report endpoints across all roles)
- [x] Audit log viewer with filters (migration + endpoint)
- [ ] Library module — SKIPPED (per user request)
- [ ] Transport module — SKIPPED (per user request)
- [ ] Hostel module — SKIPPED (per user request)
- [ ] API rate limiting per tenant
- [ ] Database indexing review + query optimization
- [ ] Caching strategy (Redis for hot data)
- [ ] Data archiving for old academic years

#### Frontend
- [x] Bulk import UI (paste CSV → preview → import)
- [x] Custom report builder UI (role-aware tabs: admin/teacher/finance/hr/student)
- [x] Audit log viewer (filterable table)
- [ ] Performance optimization (lazy loading, pagination)
- [ ] PWA support (offline capability for basic tasks)

---

## 8. Free & Open-Source Tools Summary

| Tool | Purpose | License |
|---|---|---|
| **PostgreSQL** | Primary database | Open Source (PostgreSQL license) |
| **Redis** | Cache + job queue backend | BSD-3-Clause |
| **Knex.js** | DB migrations + query builder | MIT |
| **Zod** | Schema validation | MIT |
| **Socket.io** | Real-time bidirectional communication | MIT |
| **Bull + Bull Board** | Job queue + admin UI | MIT |
| **MinIO** | S3-compatible file storage | AGPL v3 |
| **Nodemailer** | Email sending | MIT |
| **Mailpit** | Dev email catching | MIT |
| **React + Vite** | Frontend framework + bundler | MIT |
| **Tailwind CSS** | Utility-first CSS framework | MIT |
| **shadcn/ui** | UI component collection | MIT |
| **TanStack Query** | Server state management | MIT |
| **Zustand** | Client state management | MIT |
| **React Hook Form** | Performant forms | MIT |
| **PDFKit** | PDF generation | MIT |
| **Passport.js** | Authentication strategies | MIT |
| **bcrypt** | Password hashing | MIT |
| **jsonwebtoken** | JWT signing & verification | MIT |
| **cookie-parser** | Cookie parsing middleware | MIT |
| **Multer** | File upload middleware | MIT |
| **express-rate-limit** | Rate limiting | MIT |
| **Docker + Compose** | Containerization | Apache 2.0 |
| **Nginx** | Reverse proxy + static serving | BSD-2-Clause |
| **Winston** | Logging | MIT |
| **Jest + Supertest** | Testing | MIT |

---

## 9. Week 1 Start Plan

### Day 1-2: Project Scaffolding

```
- Create sms/ folder
- Create docker-compose.yml (Postgres 16 + Redis 7)
- Create .env.example
- Initialize backend/ with package.json
  - Install: express, knex, pg, bcrypt, jsonwebtoken, cookie-parser, zod, cors, winston
  - Dev: nodemon, jest, supertest
- Create backend/src/config/ (env loading, database config)
- Create backend/src/database/knexfile.js
- Run first migration: tenants table
- Run second migration: users table
- Seed super admin user
- Create Express app skeleton (server.js + app.js with middleware chain)
- Create auth module (login route + JWT sign + cookie set)
- Create auth middleware (JWT verify → req.user)
- Create tenant middleware (extract tenant context)
- Verify: can login as super admin, get JWT cookie
```

### Day 3-4: Tenant & User CRUD

```
- Create tenants module (routes, controller, service, validation)
  - Super Admin only: create, list, view, update, suspend tenant
- Create users module
  - CRUD users scoped to tenant
  - Invitation flow (create user → send invite → set password)
- Create RBAC middleware (role check)
- Verify: super admin creates school → school admin logs in → creates teachers/students/parents
```

### Day 5-7: Frontend Foundation

```
- npx create-vite frontend --template react
- Install: tailwindcss, shadcn/ui (npx shadcn@latest init)
- Install: react-router-dom, @tanstack/react-query, zustand, axios, react-hook-form, zod
- Create auth store (zustand)
- Create api lib (axios instance with cookie support)
- Create auth pages (login page)
- Create ProtectedRoute component
- Create AppLayout (sidebar + navbar) — responsive, role-based
- Create Super Admin pages: tenant list, create tenant
- Create School Admin pages: user list, create user
- Connect frontend to backend — verify full login → user list flow
```

---

## Roles & Responsibilities Summary

| Role | Scope | Key Responsibilities |
|---|---|---|
| **Super Admin** (You) | Global (All Tenants) | Create/manage schools (tenants), global billing & subscriptions, system-wide analytics, add/remove School Owners, manage global settings, audit logs |
| **School Owner / Principal** | Tenant (School) | Overall school oversight, approve major actions, view all dashboards, assign School Admins, set school policies |
| **Vice Principal** | Tenant | Assist Principal, handle academics/discipline, approve teacher assignments, manage timetables |
| **School Admin** | Tenant | User management, academic setup (classes, subjects, calendar), permissions, data imports |
| **HR Manager** | Tenant | Recruitment, employee records, leave approvals, payroll input, contracts, performance reviews |
| **Finance / Accountant** | Tenant | Fee management, invoicing, payments, expenses, salary processing, financial reports |
| **Teacher** | Tenant | Mark attendance, teach classes/subjects, assignments & grades, lesson plans, communicate with parents/students |
| **Student** | Tenant | View timetable, grades, attendance, assignments, events; limited profile editing |
| **Parent/Guardian** | Tenant | View linked student(s) data, receive notifications, message teachers/admins, pay fees |
| **Support Staff** | Tenant | Module-specific tasks (library, health records, etc.) |

## Edge Cases Log

| Edge Case | System Handling |
|---|---|
| **Student Transfer** (to another school or branch) | Admin initiates transfer → approval → record marked "Transferred", data exported or moved if internal branch. History preserved. |
| **Student Dropout / Withdrawal** | Formal request → approval → status "Dropped", access limited, fees settled, record archived but retained for legal/reporting. |
| **Teacher teaches 3-4 classes/subjects** | Fully supported via many-to-many assignment. Workload dashboard shows total periods. |
| **Teacher leaves mid-year** | Re-assignment workflow: Principal re-assigns classes → students get new teacher with continuity of records. |
| **Multiple Parents per Student** | Support primary + secondary guardians with different permission levels. |
| **Student repeats a grade** | Manual override during promotion process; old grades preserved. |
| **School has Branches** | Tenant = Main School, Branches = child entities. Data can be rolled up or isolated. |
| **Large Class Sizes** | Pagination, bulk grading, search/filter. |
| **Internet Outage (Mobile)** | Offline mode for attendance & basic entry (sync when online). |
| **Data Import Errors** | Validation rules + preview before commit + error logs. |
| **Grade Disputes** | Teacher can lock grades after deadline; Principal override with audit trail. |
| **Fee Payment Issues** | Partial payments, installments, penalties, scholarships applied automatically. |

---

*This document serves as the single source of truth for the SMS architecture, design decisions, and development roadmap. As we build, update this document to reflect changes in decisions.*
