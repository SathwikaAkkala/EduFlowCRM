# EduFlow CRM

> **A full-stack, role-based CRM system for managing school prospects through a structured sales pipeline — from first contact to pilot close.**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Repository Structure](#4-repository-structure)
5. [Features](#5-features)
6. [Roles & Permissions](#6-roles--permissions)
7. [Sales Pipeline Stages](#7-sales-pipeline-stages)
8. [Prerequisites](#8-prerequisites)
9. [Environment Variables](#9-environment-variables)
10. [Installation & Setup](#10-installation--setup)
11. [Running the Application](#11-running-the-application)
12. [API Reference](#12-api-reference)
13. [Database Models](#13-database-models)
14. [Security](#14-security)
15. [Frontend Pages & Components](#15-frontend-pages--components)
16. [Onboarding Checklist](#16-onboarding-checklist)
17. [Analytics](#17-analytics)
18. [Production Deployment](#18-production-deployment)
19. [Common Issues & Troubleshooting](#19-common-issues--troubleshooting)
20. [Contributing](#20-contributing)

---

## 1. Project Overview

KALNET CRM is a purpose-built Customer Relationship Management system designed for EdTech sales teams selling to schools. It gives sales agents, managers, and administrators a unified workspace to:

- Track school prospects through a **6-stage Kanban pipeline**
- Log time-stamped **notes** on each prospect
- Manage a **10-step onboarding checklist** per school (automatically generated on prospect creation)
- Track **Auto-Completion Status** dynamically when all checklist steps are completed
- Receive **Automated Daily Notifications** (via Email and In-App notification bell) for overdue prospects
- View **real-time analytics** — stage breakdowns, conversion rates, overdue follow-ups, and monthly trends
- Control team access through a **role-based permission model** (Admin / Manager / Agent)
- Monitor application integrity via integrated **Sentry Error Tracking**

The system follows a **decoupled architecture**: a Node.js/Express REST API backend stores all data in MySQL/MariaDB through Prisma, while a Next.js 14 frontend communicates with that API both server-side (via Next.js API route proxies) and client-side.

---

## 2. Tech Stack

### Backend

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js (ES Modules) | ≥ 18.x |
| Framework | Express | 5.2.x |
| Database | MySQL / MariaDB | 10.x / 10.5+ |
| DB Driver / Adapter | mariadb + @prisma/adapter-mariadb | 3.5.x / 7.8.x |
| ORM | Prisma | 7.8.x |
| Authentication | JSON Web Tokens (JWT) | 9.x |
| Password Hashing | bcrypt | 6.x |
| Input Validation | Zod | 4.x |
| Rate Limiting | express-rate-limit | 8.x |
| Email Service | nodemailer | 8.0.x |
| Automation Scheduler | node-cron | 4.2.x |
| Error Monitoring | @sentry/node | 8.15.x |
| Cookie Parsing | cookie-parser | 1.x |
| CORS | cors | 2.x |
| Dev Server | nodemon | 3.x |
| Environment | dotenv | 17.x |

### Frontend

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Drag & Drop | @hello-pangea/dnd | 16.x |
| Icons | lucide-react | 0.376.x |
| Date Utilities | date-fns | 3.x |
| Class Utilities | clsx + tailwind-merge | latest |
| Database Client (Direct SSR routes) | Prisma Client | 7.8.x |
| Input Validation | Zod | 4.x |
| Testing | Vitest | 3.2.x |

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Browser / Client                       │
│                                                          │
│   Next.js 14 App (Port 3000)                            │
│   ├── /login                 ← Public page              │
│   ├── /register              ← Public page              │
│   ├── / (dashboard)          ← Kanban Board (protected) │
│   ├── /notifications         ← Notifications Center     │
│   ├── /admin/crm/analytics   ← Analytics (protected)    │
│   └── /settings              ← Settings (protected)     │
│                                                          │
│   Next.js API Routes (/app/api/*)                        │
│   └── Proxy layer → forwards requests to Express API    │
│       (Also accesses database directly via Prisma Client)│
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP (cookie-based JWT / Bearer)
                       ▼
┌──────────────────────────────────────────────────────────┐
│               Express API Server (Port 6060)              │
│   ├── Auth routes (/api/auth)                            │
│   ├── Cards / Notes / Checklist CRUD (/api)              │
│   ├── Notifications Management (/api/notifications)       │
│   ├── Debug and Test Endpoints (/api/debug)              │
│   └── Node-Cron Scheduler (Runs automatic checks every 15 minutes) │
└──────────────────────┬───────────────────────────────────┘
                       │ Prisma Client (MariaDB Adapter)
                       ▼
┌──────────────────────────────────────────────────────────┐
│                Database (Active Project)                 │
│         MySQL / MariaDB via Prisma ORM                    │
│   (User, Prospect, AuditLog, Note, Checklist, NotifLog)  │
└──────────────────────────────────────────────────────────┘
```

The Next.js frontend **never exposes the backend URL to the browser directly** for protected routes — all API calls from server components and API routes go through Next.js API route proxies, keeping the Express server's internal address hidden.

---

## 4. Repository Structure

```
project-root/
├── Backend/
│   ├── index.js                     ← Express app factory (middleware + routes + Sentry init)
│   ├── server.js                    ← Entry point (starts server, registers global crash listeners)
│   ├── package.json
│   ├── prisma/                      ← Database Migrations & Seeds
│   │   ├── schema.prisma            ← Prisma schema models (User, Prospect, AuditLog, etc.)
│   │   └── seed.ts                  ← Idempotent DB seeder
│   ├── .env                         ← Runtime secrets (never commit this)
│   └── src/
│       ├── db/
│       │   └── prismaClient.js      ← Connection client singleton (allowPublicKeyRetrieval guard)
│       ├── controllers/
│       │   ├── auth.controller.js       ← register, login, me, logout, user management
│       │   ├── main.controller.js       ← cards, notes, checklist CRUD
│       │   ├── notification.controller.js ← fetch/read notifications, manual triggers
│       │   └── debug.controller.js      ← test email, debug status dashboard
│       ├── middleware/
│       │   ├── auth.middleware.js       ← requireAuth + authorizeRoles guards
│       │   └── validate.middleware.js   ← Zod request validation wrapper
│       ├── repo/
│       │   ├── cards.repo.js            ← Data access layer (Prisma)
│       │   └── analytics.repo.js        ← Aggregations (Prisma raw SQL)
│       ├── routers/
│       │   ├── auth.routes.js           ← Auth route definitions
│       │   ├── main.routs.js            ← Cards / notes / checklist routes
│       │   ├── notification.routes.js    ← Notification endpoints
│       │   └── debug.routes.js          ← System status & testing routes
│       ├── service/
│       │   ├── auth.service.js          ← registerUser, loginUser, createAuthToken
│       │   ├── card.service.js          ← Card business logic (triggers checklist transaction)
│       │   ├── completion.service.js    ← Auto-completion status verifier
│       │   ├── email.service.js         ← Nodemailer SMTP configuration and HTML templates
│       │   └── notification.service.js  ← Overdue query logic, user notification loop
│       └── utils/
│           ├── onbord.chicklist.js      ← Auto-generates 10 checklist steps on card create
│           └── scheduler.js             ← node-cron background task initializer
│
└── Frontend/
    ├── next.config.js
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── .env.local                   ← Frontend environment (NEXT_PUBLIC_BACKEND_URL=6060)
    ├── package.json
    ├── app/
    │   ├── layout.tsx               ← Root layout (fonts, global CSS)
    │   ├── globals.css              ← Tailwind base styles
    │   ├── login/page.tsx           ← Login page
    │   ├── register/page.tsx        ← Registration page
    │   ├── (dashboard)/
    │   │   ├── layout.tsx           ← Dashboard shell (Sidebar + Topbar)
    │   │   ├── page.tsx             ← Kanban Board page
    │   │   ├── settings/page.tsx    ← Settings page
    │   │   ├── notifications/page.tsx ← In-App Notifications Center
    │   │   └── admin/crm/analytics/page.tsx ← Analytics page
    │   └── api/                     ← Next.js API route proxies
    │       ├── auth/login/route.ts
    │       ├── auth/logout/route.ts
    │       ├── auth/me/route.ts
    │       ├── auth/register/route.ts
    │       ├── analytics/route.ts
    │       ├── prospects/route.ts
    │       ├── prospects/[id]/route.ts
    │       ├── prospects/[id]/notes/route.ts
    │       └── prospects/[id]/checklist/[checklistId]/route.ts
    ├── components/
    │   ├── analytics/
    │   │   └── AnalyticsDashboard.tsx    ← Stats cards + stage breakdown table
    │   ├── drawers/
    │   │   ├── ProspectDrawer.tsx        ← Side panel: prospect detail, notes, checklist
    │   │   └── OnboardingChecklist.tsx    ← 10-step checklist UI
    │   ├── kanban/
    │   │   ├── KanbanBoard.tsx           ← DnD context, stage grouping, overdue logic
    │   │   ├── KanbanColumn.tsx          ← Single pipeline column
    │   │   ├── KanbanHeader.tsx          ← Board toolbar (search, add prospect)
    │   │   └── ProspectCard.tsx          ← Draggable card tile (complete status badge)
    │   ├── layout/
    │   │   ├── Sidebar.tsx               ← Navigation sidebar
    │   │   ├── Topbar.tsx                ← Top bar (integrated Notification Bell dropdown)
    │   │   └── NotificationBell.tsx      ← Red badge unread counter dropdown
    │   └── modals/
    │       └── AddProspectModal.tsx      ← Create/edit prospect form modal
    ├── hooks/
    │   └── useNotifications.ts           ← React hook for notifications fetching & read toggles
    ├── lib/
    │   ├── prisma.ts                     ← Next.js Server-only Prisma client instance
    │   └── api.ts                        ← Frontend API models mapper
    └── types/
        └── index.ts                      ← Frontend Typescript interfaces
```

---

## 5. Features

### Prospect Management
- Create, view, update, and delete school prospects (cards).
- Each prospect stores: name, school, role, email, phone, source, pipeline stage, last contact date, next follow-up date, and completion status.
- Paginated listing with stage-based filtering.

### Kanban Pipeline Board
- Drag-and-drop prospects between pipeline stages (admin and manager only).
- Overdue follow-up highlighting — prospects past their `nextFollowUpDate` are flagged.
- "Due today" indicator for prospects needing contact on the current day.
- Agents have read-only access; they can view but cannot move or edit cards.

### Prospect Detail Drawer
- Click any card to open a slide-in drawer showing full prospect details.
- Edit all fields inline (admin/manager only).
- View and add time-stamped progress notes.
- View and update the onboarding checklist.

### Notes System
- Paginated, append-only log of notes per prospect.
- Notes display with timestamp and are ordered newest-first.

### Onboarding Checklist
- A 10-step checklist is automatically created for every new prospect.
- Steps are assigned with rolling due dates (1 day apart, starting from creation).
- Admin and manager can mark steps as `todo` or `done`.
- Steps cover the full school onboarding lifecycle (KYC → Go-live).

### Dynamic Auto-Completion Tracking ⭐ (New)
- **Automatic Status Toggle**: When the 10th (last) onboarding checklist item is marked completed, the backend transaction automatically sets `completed = true` and logs the `completedAt` timestamp.
- **Auto-Revert**: Unchecking any checklist item automatically resets `completed = false` and `completedAt = null`.
- **Visual Indicators**:
  - **Kanban Board**: A green "✓ Complete" status badge appears on the card.
  - **Detail Drawer**: Completion status is displayed next to the stage dropdown.
  - **Checklist**: An onboarding congrats banner is shown when all steps are completed.

### Automated Notifications System ⭐ (New)
- **Automatic Cron Engine**: Automates a cron scheduler (node-cron running every 15 minutes by default) that scans the database for active prospects where `nextFollowUpDate` is in the past and stage is not `Pilot Closed`.
- **Stylized Email Alerts**: Sends structured HTML emails to all active team members listing overdue prospects with direct navigation links.
- **In-App Notification Center**:
  - **Bell Icon Dropdown**: Located in the Topbar with a dynamic unread counter badge.
  - **Notifications Page**: Lists all past alert logs with read/unread toggle actions.
- **Database Logs**: Records notification history (`NotificationLog`) for auditing.

### Analytics Dashboard
- Total prospects count.
- Overall pipeline conversion rate (Cold → Pilot Closed).
- Overdue follow-ups count.
- Closed this month count.
- Per-stage breakdown: count + average days spent in stage (calculated via database-level timestamp diffs).
- 6-month monthly trend of prospects added.

### Authentication & Session Management
- HTTP-only cookie-based JWT sessions (7-day expiry).
- Middleware supports both `Bearer` token (Authorization header) and cookie-based auth.
- Secure cookies in production (`secure: true`).
- Auth token issued on both register and login.

### System Monitoring
- **Sentry SDK**: Tracks backend API route requests and captures exceptions.
- **Global Error Wrappers**: Catch unhandled rejections and uncaught exceptions to prevent silent process crashes.

---

## 6. Roles & Permissions

| Action | Admin | Manager | Agent |
|---|:---:|:---:|:---:|
| View all prospects | ✅ | ✅ | ✅ |
| Create prospect | ✅ | ✅ | ❌ |
| Edit prospect | ✅ | ✅ | ❌ |
| Delete prospect | ✅ | ✅ | ❌ |
| Move card on Kanban | ✅ | ✅ | ❌ |
| Add notes | ✅ | ✅ | ✅ |
| View notes | ✅ | ✅ | ✅ |
| Update checklist step | ✅ | ✅ | ❌ |
| View checklist | ✅ | ✅ | ✅ |
| View analytics | ✅ | ✅ | ✅ |
| List all users | ✅ | ❌ | ❌ |
| Change user role | ✅ | ❌ | ❌ |
| View in-app notifications | ✅ | ✅ | ✅ |
| Mark notifications as read | ✅ | ✅ | ✅ |
| Trigger manual notification check | ✅ | ❌ | ❌ |

---

## 7. Sales Pipeline Stages

Prospects move through six ordered stages:

```
Cold  →  Contacted  →  Demo Booked  →  Demo Done  →  Proposal Sent  →  Pilot Closed
```

| Stage | Meaning |
|---|---|
| **Cold** | Lead identified, no contact made yet |
| **Contacted** | Initial outreach done |
| **Demo Booked** | Product demo scheduled |
| **Demo Done** | Demo completed, evaluating |
| **Proposal Sent** | Formal proposal / pricing sent |
| **Pilot Closed** | Deal closed — school is live |

---

## 8. Prerequisites

Before running this project, ensure you have the following installed:

| Tool | Minimum Version | Check Command |
|---|---|---|
| Node.js | 20.x | `node --version` |
| npm | 10.x | `npm --version` |
| MySQL / MariaDB | 10.5+ | `mysql --version` |
| Git | Any | `git --version` |

---

## 9. Environment Variables

### Backend — `Backend/.env`

Create this file at the backend directory root:

```bash
# Create Backend/.env and add the backend variables from the environment section below
```

Define the variables as follows:

```env
# Database URL (MariaDB/MySQL)
DATABASE_URL="mysql://root:password@127.0.0.1:3306/kalnet_crm"

# Database Connection Fixes for Windows Local Setup
MARIADB_ALLOW_PUBLIC_KEY_RETRIEVAL=true

# Server Configuration
PORT=6060
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Authentication
JWT_SECRET=your-very-long-random-secret-at-least-64-characters
JWT_EXPIRES_IN=7d

# Email / SMTP Configuration
EMAIL_FROM=noreply@crm.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Alternative Simple Gmail credentials (if SMTP not configured)
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password

# Notifications Engine
ENABLE_NOTIFICATIONS=true
NOTIFICATION_SCHEDULE="*/15 * * * *" # Cron syntax: every 15 minutes (override as needed)

# Monitoring
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Frontend — `Frontend/.env.local`

Create this file in the Frontend root:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:6060
```

---

## 10. Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/kalnet-crm.git
cd kalnet-crm
```

### 2. Configure Database & Environment
1. Ensure your local MySQL/MariaDB server is running.
2. Create an empty database named `kalnet_crm`.
3. Set up the `.env` file at the root of `Backend/` (as described in the Environment Variables section).

### 3. Install Backend Dependencies & Apply Database Schema

```bash
cd Backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Install Frontend Dependencies

```bash
cd ../Frontend
npm install
```

### 5. Configure Frontend Environment

```bash
# Create Frontend/.env.local and configure backend port to match (6060)
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:6060" > .env.local
```

---

## 11. Running the Application

Both servers must run simultaneously. Open two terminal windows.

### Terminal 1 — Backend API

```bash
cd Backend
npm run dev
```

Expected logs:
```
[nodemon] starting `node server.js`
Server is Up and Running at PORT 6060
[Scheduler] Initializing notification scheduler...
[Scheduler] Scheduled job: */15 * * * *
```

You can verify the backend is running by visiting:
[http://localhost:6060/](http://localhost:6060/)
Response: `{ "success": true, "message": "EnrollOps CRM API is running", "version": "1.0.0" }`

---

### Terminal 2 — Frontend Client

```bash
cd Frontend
npm run dev
```

Expected output:
```
▲ Next.js 14.2.3
- Local: http://localhost:3000
- Ready in 2.1s
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### First-Time Admin Setup

The registration page sets all new accounts to the `agent` role by default. To create the first administrator:
1. Register an account on the registration page.
2. Connect to your database using a CLI client or database management tool (e.g., DBeaver, TablePlus, or Prisma Studio).
3. Find your user record and update `role` to `"admin"`.
4. Log out and log back in. You can now manage other users and their roles at the User settings panel.

---

## 12. API Reference

All API endpoints return JSON in the format:
```json
{ "success": true, "data": { ... } }
```
On error:
```json
{ "success": false, "message": "Error description" }
```

### Authentication Endpoints

**Base path:** `/api/auth`

#### `POST /api/auth/register`
Register a new user. Defaults to the `agent` role.
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Response Statuses:**
  - `201`: User created, sets JWT cookie.
  - `400`: Validation error.
  - `409`: Email already registered.

#### `POST /api/auth/login`
Authenticate a user.
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```

#### `GET /api/auth/me` 🔒
Returns details of the currently authenticated user.

#### `POST /api/auth/logout` 🔒
Clears the session cookie.

#### `GET /api/auth/users` 🔒 Admin only
Returns a list of all registered users.

#### `PATCH /api/auth/users/:id/role` 🔒 Admin only
Updates a user's role. Acceptable roles: `admin`, `manager`, `agent`.
- **Request Body:**
  ```json
  { "role": "manager" }
  ```

---

### Cards (Prospects) Endpoints

**Base path:** `/api` (Requires authentication 🔒)

#### `GET /api/cards`
Returns all prospects (paginated).
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 20)

#### `GET /api/cards/:id`
Returns a single prospect by ID.

#### `POST /api/cards` 🔒 Admin, Manager only
Creates a new prospect and triggers checklist creation.
- **Request Body:**
  ```json
  {
    "name": "Dr. Priya Sharma",
    "school": "Delhi Public School",
    "role": "Principal",
    "email": "priya@dps.edu",
    "phone": "+91-9876543210",
    "source": "Referral",
    "stage": "Cold",
    "lastContactDate": "2026-05-01T00:00:00.000Z",
    "nextFollowUpDate": "2026-05-15T00:00:00.000Z"
  }
  ```

#### `PATCH /api/cards/:id` 🔒 Admin, Manager only
Partially updates a prospect. Accepts any subset of parameters.

#### `DELETE /api/cards/:id` 🔒 Admin, Manager only
Deletes a prospect.

---

### Notes Endpoints

#### `POST /api/cards/:cardId/notes` 🔒 All roles
Appends a note to a prospect.
- **Request Body:**
  ```json
  { "text": "Scheduled follow-up call." }
  ```

#### `GET /api/cards/:cardId/notes` 🔒 All roles
Returns notes for a prospect (newest first, paginated).

---

### Checklist Endpoints

#### `GET /api/cards/:cardId/checklist` 🔒 All roles
Returns the 10-step onboarding checklist.

#### `PATCH /api/checklist/:id` 🔒 Admin, Manager only
Updates a checklist step status. Toggling the last step to `"done"` triggers auto-completion of the prospect.
- **Request Body:**
  ```json
  { "status": "done" }
  ```

---

### Notifications Endpoints ⭐ (New)

#### `GET /api/notifications` 🔒 All roles
Fetches all notifications logged for the authenticated user.
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "clx...",
        "userId": "clx...",
        "type": "overdue_prospects",
        "title": "3 Overdue Follow-ups",
        "message": "You have 3 prospect(s) with overdue follow-up dates.",
        "metadata": {
          "prospectCount": 3,
          "prospectIds": ["clx...", "clx..."]
        },
        "read": false,
        "createdAt": "2026-06-06T09:00:00Z"
      }
    ],
    "unreadCount": 1
  }
  ```

#### `GET /api/notifications/unread-count` 🔒 All roles
Fetches the count of unread notifications.

#### `PATCH /api/notifications/:id/read` 🔒 All roles
Marks a specific notification log as read.

#### `POST /api/notifications/trigger-check` 🔒 Admin only
Manually runs the overdue prospect engine, sending emails and creating in-app alerts immediately.

#### `GET /api/debug/notification-status` 🔒 Admin only
Debug dashboard retrieving details on overdue prospects, system users, and notifications sent.

#### `POST /api/debug/test-email` 🔒 Admin only
Sends a test HTML email containing overdue prospect data to the admin's email.

---

### Analytics Endpoint

#### `GET /api/analytics` 🔒 All roles
Returns real-time aggregated metrics computed concurrently from the database.

---

## 13. Database Models

The schema is managed in `Backend/prisma/schema.prisma` with MySQL/MariaDB database configuration.

### `User`
| Field | Type | Attributes / Constraints | Description |
|---|---|---|---|
| `id` | String | `@id`, `@default(cuid())` | Unique user identifier |
| `name` | String | | User's full name |
| `email` | String | `@unique` | Unique login email |
| `password` | String | | Hashed password (bcrypt) |
| `role` | String | `@default("agent")` | Access control role: `admin`, `manager`, `agent` |
| `createdAt` | DateTime | `@default(now())` | User registration timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last profile update timestamp |
| `notificationLogs` | `NotificationLog[]` | | Relation to logs sent to user |
| `ownedProspects` | `Prospect[]` | | Relation to prospects managed by user |

### `Prospect`
| Field | Type | Attributes / Constraints | Description |
|---|---|---|---|
| `id` | String | `@id`, `@default(cuid())` | Unique prospect identifier |
| `name` | String | | Contact person's name |
| `school` | String | | School/institution name |
| `role` | String? | Nullable | Contact's role (e.g. Principal) |
| `email` | String? | Nullable | Contact's email address |
| `phone` | String? | Nullable | Contact's phone number |
| `source` | String | `@default("Direct")` | Source of lead |
| `stage` | String | `@default("Cold")` | Sales stage: `Cold`, `Contacted`, `Demo Booked`, `Demo Done`, `Proposal Sent`, `Pilot Closed` |
| `lastContactDate` | DateTime? | Nullable | Date of last interaction |
| `nextFollowUpDate`| DateTime? | Nullable | Target date for next outreach |
| `completed` | Boolean | `@default(false)` | Automatically set to `true` when all checklist items are done |
| `completedAt` | DateTime? | Nullable | Timestamp when completion occurred |
| `deletedAt` | DateTime? | Nullable | Timestamp for soft deletes |
| `createdAt` | DateTime | `@default(now())` | Creation date |
| `updatedAt` | DateTime | `@updatedAt` | Last update date |
| `ownerId` | String? | Relation | Foreign key to `User(id)` |
| `lastNotifiedAt` | DateTime? | Nullable | Timestamp of last overdue email notification |
| `notes` | `ProspectNote[]` | | Relation to logs of notes |
| `checklistItems` | `OnboardingChecklist[]` | | Relation to 10-step checklist items |
| `auditLogs` | `AuditLog[]` | | Relation to history logs |

### `AuditLog`
| Field | Type | Attributes / Constraints | Description |
|---|---|---|---|
| `id` | String | `@id`, `@default(cuid())` | Log identifier |
| `prospectId` | String | Relation to `Prospect`, `onDelete: Cascade` | Prospect reference |
| `action` | String | | Actions like `PROSPECT_CREATED`, `STAGE_CHANGED`, etc. |
| `actorId` | String | | ID of the user performing the action |
| `actorRole` | String | | Role of the actor |
| `metadata` | Json? | Nullable | Arbitrary payload containing change details |
| `createdAt` | DateTime | `@default(now())` | Log timestamp |

### `ProspectNote`
| Field | Type | Attributes / Constraints | Description |
|---|---|---|---|
| `id` | String | `@id`, `@default(cuid())` | Note identifier |
| `prospectId` | String | Relation to `Prospect`, `onDelete: Cascade` | Prospect reference |
| `content` | String | | Rich content of the note |
| `createdAt` | DateTime | `@default(now())` | Note timestamp |

### `OnboardingChecklist`
| Field | Type | Attributes / Constraints | Description |
|---|---|---|---|
| `id` | String | `@id`, `@default(cuid())` | Step identifier |
| `prospectId` | String | Relation to `Prospect`, `onDelete: Cascade` | Prospect reference |
| `stepNumber` | Int | | Index from 1–10 |
| `title` | String | | Step name (e.g. KYC Completed) |
| `description` | String? | Nullable | Details of what the step requires |
| `assignee` | String? | Nullable | Assigned operator or department |
| `status` | String | `@default("todo")` | Step state: `todo`, `done` |
| `dueDate` | DateTime? | Nullable | Step due date |
| `createdAt` | DateTime | `@default(now())` | Step creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last modification timestamp |

### `NotificationLog`
| Field | Type | Attributes / Constraints | Description |
|---|---|---|---|
| `id` | String | `@id`, `@default(cuid())` | Log identifier |
| `userId` | String | Relation to `User`, `onDelete: Cascade` | User reference |
| `type` | String | `@default("notification")` | Notification category (e.g. `overdue_prospects`) |
| `title` | String | | Brief notification title |
| `message` | String | | Detailed notification body message |
| `metadata` | Json? | Nullable | Payload detailing prospect ids, counts, etc. |
| `read` | Boolean | `@default(false)` | Viewed status |
| `createdAt` | DateTime | `@default(now())` | Log timestamp |

---

## 14. Security

### Authentication
- JWTs are signed with a secret key and stored in **HTTP-only cookies**, protecting them against XSS.
- Middleware supports standard header tokens (`Authorization: Bearer <token>`) for API clients.
- Passwords are encrypted with **bcrypt** (10+ salt rounds).

### Security Headers
All responses include:
- `X-Content-Type-Options: nosniff` (Prevents MIME-sniffing)
- `X-Frame-Options: DENY` (Clickjacking protection)
- `X-XSS-Protection: 1; mode=block` (Browser filter)
- Hides backend identification (`X-Powered-By` header removed).

### CORS & Inputs
- CORS allows connections only from the origin defined in `FRONTEND_URL`.
- Inputs are validated strictly against **Zod Schemas**; invalid requests return `400 Bad Request`.

---

## 15. Frontend Pages & Components

### Pages
- `/login`: Form to sign in.
- `/register`: Form to sign up.
- `/`: Kanban board.
- `/notifications`: Detailed notification panel.
- `/admin/crm/analytics`: KPI graphs and stage summaries.
- `/settings`: Change roles, configurations, and manage user listings.

### Custom Components
- `KanbanBoard`: Parent wrapper containing columns, handling DragDropContext and status filters.
- `KanbanColumn`: Column mapped to each of the six pipeline stages.
- `ProspectCard`: Card representation displaying metadata, overdue alerts, and green "✓ Complete" status badges.
- `ProspectDrawer`: Sidebar opening on card click, showing history notes, update forms, and onboarding steps.
- `NotificationBell`: Red-colored notification count badge in top-right topbar, toggling a dropdown of latest items.
- `OnboardingChecklist`: Interactive checklists for prospects (marks items todo/done). Shows congrats message on completion.

---

## 16. Onboarding Checklist

Creating a prospect automatically registers a 10-step checklist:

| Step | Title | Assigned To | Due Date |
|:---:|---|---|---|
| 1 | School KYC completed | KALNET Ops | Created Date + 1 Day |
| 2 | Admin account created | KALNET Ops | Created Date + 2 Days |
| 3 | Teachers onboarded | KALNET Ops | Created Date + 3 Days |
| 4 | Student data uploaded | KALNET Ops | Created Date + 4 Days |
| 5 | Class structure setup | KALNET Ops | Created Date + 5 Days |
| 6 | Fee module configured | KALNET Ops | Created Date + 6 Days |
| 7 | Attendance module enabled | KALNET Ops | Created Date + 7 Days |
| 8 | Timetable created | KALNET Ops | Created Date + 8 Days |
| 9 | Training session completed | KALNET Ops | Created Date + 9 Days |
| 10 | Go-live confirmation | KALNET Ops | Created Date + 10 Days |

---

## 17. Analytics

The `GET /api/analytics` endpoint runs queries in parallel (`Promise.all`) to output:
- `totalProspects`: Total prospects count in database.
- `conversionRate`: Percentage converting from Cold → Pilot Closed.
- `overdueCount`: Prospects past follow-up date and not closed.
- `closedThisMonth`: Closed prospects with updates during current calendar month.
- `stageBreakdown`: Count + average days spent in each stage (calculated at database query level using timestamp diffs).

---

## 18. Production Deployment

### Backend (Railway, Render, AWS, Heroku)
1. Configure all environment variables on your provider (e.g. `NODE_ENV=production`, `FRONTEND_URL`, `DATABASE_URL`).
2. Run Prisma migrations on the database before startup:
   ```bash
   npx prisma migrate deploy
   ```
3. Use a process runner (e.g. `pm2`):
   ```bash
   npm install -g pm2
   pm2 start server.js --name kalnet-crm-api
   ```

### Frontend (Vercel, Netlify)
Deploy directly on Vercel:
1. Connect repository.
2. In environment variables, set:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
   ```
3. Run build: `npm run build`.

---

## 19. Common Issues & Troubleshooting

### Database Auth Handshake Error (`allowPublicKeyRetrieval`)
If local MariaDB/MySQL setups fail with handshake/public key errors, make sure you configure:
```env
MARIADB_ALLOW_PUBLIC_KEY_RETRIEVAL=true
```
in `Backend/.env` and restart your Node process.

### Prisma Client Import Errors in Frontend
If Next.js API route SSR logs compilation errors about imports from `Backend/src/db/prismaClient.js`, make sure that:
1. You have run `npx prisma generate` in the `Backend/` folder.
2. If compiling in separate build containers, make sure the Frontend includes client type definitions generated by Prisma.

### Duplicate Checklist Constraint Failures
If you attempt to seed the database multiple times, the script handles deletes in a cascade sequence. If you encounter unique key failures, ensure the tables are cleaned in this exact sequence:
1. `onboardingChecklist`
2. `prospectNote`
3. `auditLog`
4. `prospect`

### Email Delivery Failures (Gmail)
If using Gmail for notifications, standard passwords will fail. You must:
1. Turn on 2-Factor Authentication on your Google account.
2. Create an App Password at `myaccount.google.com/apppasswords`.
3. Use this 16-character generated string in `GMAIL_PASS` or `SMTP_PASS` (without spaces).

---

## 20. Contributing

1. Fork the repository.
2. Create your branch: `git checkout -b feat/your-feature`.
3. Commit changes: `git commit -m "feat: descriptive message"`.
4. Push: `git push origin feat/your-feature`.
5. Create a Pull Request against `main`.

**Code Style Guidelines:**
- Backend uses ES Modules (`import`/`export`).
- Validate incoming routes with Zod schemas in `/src/validation/`.
- Frontend code requires strict TypeScript formatting.
