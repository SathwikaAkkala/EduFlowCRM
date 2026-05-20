# KALNET CRM

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
- View **real-time analytics** — stage breakdowns, conversion rates, overdue follow-ups, and monthly trends
- Control team access through a **role-based permission model** (Admin / Manager / Agent)

The system follows a **decoupled architecture**: a Node.js/Express REST API backend stores all data in MongoDB, while a Next.js 14 frontend communicates with that API both server-side (via Next.js API route proxies) and client-side.

---

## 2. Tech Stack

### Backend - Version 1 (Legacy)

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js (ES Modules) | ≥ 18.x |
| Framework | Express | 5.x |
| Database | MongoDB via Mongoose | 9.x |
| Authentication | JSON Web Tokens (JWT) | 9.x |
| Password Hashing | bcrypt | 6.x |
| Input Validation | Zod | 4.x |
| Rate Limiting | express-rate-limit | 8.x |
| Cookie Parsing | cookie-parser | 1.x |
| CORS | cors | 2.x |
| Dev Server | nodemon | 3.x |
| Environment | dotenv | 17.x |

### Backend - Version 2 (Current)

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js (ES Modules) | ≥ 18.x |
| Framework | Express | 5.x |
| Database | MySQL / MariaDB | 3.5.x |
| ORM | Prisma | 7.8.x |
| Authentication | JSON Web Tokens (JWT) | 9.x |
| Password Hashing | bcrypt | 6.x |
| Input Validation | Zod | 4.x |
| Rate Limiting | express-rate-limit | 8.x |
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

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Browser / Client                       │
│                                                          │
│   Next.js 14 App (Port 3000)                            │
│   ├── /login          ← Public page                     │
│   ├── /register       ← Public page                     │
│   ├── / (dashboard)   ← Kanban Board (protected)        │
│   ├── /admin/crm/analytics ← Analytics (protected)      │
│   └── /settings       ← Settings (protected)            │
│                                                          │
│   Next.js API Routes (/app/api/*)                        │
│   └── Proxy layer → forwards requests to Express API    │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP (cookie-based JWT)
                       ▼
┌──────────────────────────────────────────────────────────┐
│               Express API Server (Port 6060)              │
│                                                          │
│   POST /api/auth/register                                │
│   POST /api/auth/login                                   │
│   GET  /api/auth/me                                      │
│   POST /api/auth/logout                                  │
│   GET  /api/auth/users          ← Admin only             │
│   PATCH /api/auth/users/:id/role ← Admin only            │
│                                                          │
│   GET/POST /api/cards           ← Prospects CRUD         │
│   GET/PATCH/DELETE /api/cards/:id                        │
│   GET/POST /api/cards/:id/notes                          │
│   GET      /api/cards/:id/checklist                      │
│   PATCH    /api/checklist/:id                            │
│   GET      /api/analytics                                │
└──────────────────────┬───────────────────────────────────┘
                       │ Mongoose ODM
                       ▼
┌──────────────────────────────────────────────────────────┐
│             Database (Version 1 vs Version 2)             │
│   V1: MongoDB (Collections: users, cards, etc.)           │
│   V2: MySQL / MariaDB via Prisma ORM                      │
└──────────────────────────────────────────────────────────┘
```

The Next.js frontend **never exposes the backend URL to the browser directly** for protected routes — all API calls from server components and API routes go through Next.js API route proxies, keeping the Express server's internal address hidden.

---

## 4. Repository Structure

```
project-root/
├── Backend/
│   ├── index.js                  ← Express app factory (middleware + routes)
│   ├── server.js                 ← Entry point (starts server)
│   ├── package.json
│   ├── prisma/                   ← Version 2 Database ORM
│   │   └── schema.prisma         ← Prisma models (User, Prospect, etc.)
│   └── src/
│       ├── .env                  ← Runtime secrets (never commit this)
│       ├── .env.example          ← Template for environment variables
│       ├── config/
│       │   └── mondodb.config.js ← Version 1 Mongoose connection setup
│       ├── db/
│       │   └── prismaClient.js   ← Version 2 Prisma client instantiation
│       ├── controllers/
│       │   ├── auth.controller.js    ← register, login, me, logout, user mgmt
│       │   ├── main.controller.js    ← cards, notes, checklist CRUD
│       │   └── analytics.controller.js ← aggregated stats endpoint
│       ├── middleware/
│       │   ├── auth.middleware.js    ← requireAuth + authorizeRoles guards
│       │   └── validate.middleware.js ← Zod request validation wrapper
│       ├── models/                 ← Version 1 Mongoose schemas
│       │   ├── user.schema.js        
│       │   ├── card.schema.js        
│       │   ├── notes.schema.js       
│       │   └── checklist.schema.js   
│       ├── repo/
│       │   ├── cards.repo.js         ← Data access layer (Prisma in V2)
│       │   └── analytics.repo.js     ← Aggregations (Prisma raw SQL in V2)
│       ├── routers/
│       │   ├── auth.routes.js        ← Auth route definitions
│       │   └── main.routs.js         ← Cards / notes / checklist / analytics routes
│       ├── service/
│       │   ├── auth.service.js       ← registerUser, loginUser, createAuthToken
│       │   └── card.service.js       ← Business logic for card operations
│       ├── utils/
│       │   └── onbord.chicklist.js   ← Auto-generates 10 checklist steps on card create
│       └── validation/
│           ├── auth.validation.js    ← Zod schemas for auth request bodies
│           └── main.validation.js    ← Zod schemas for card / note / checklist bodies
│
└── Frontend/
    ├── next.config.js
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── .env.local                ← Frontend environment (NEXT_PUBLIC_BACKEND_URL)
    ├── package.json
    ├── app/
    │   ├── layout.tsx            ← Root layout (fonts, global CSS)
    │   ├── globals.css           ← Tailwind base styles
    │   ├── login/page.tsx        ← Login page
    │   ├── register/page.tsx     ← Registration page
    │   ├── (dashboard)/
    │   │   ├── layout.tsx        ← Dashboard shell (Sidebar + Topbar)
    │   │   ├── page.tsx          ← Kanban Board page
    │   │   ├── settings/page.tsx ← Settings page
    │   │   └── admin/crm/analytics/page.tsx ← Analytics page
    │   └── api/                  ← Next.js proxy routes → Express backend
    │       ├── auth/login/route.ts
    │       ├── auth/logout/route.ts
    │       ├── auth/me/route.ts
    │       ├── auth/register/route.ts
    │       ├── analytics/route.ts
    │       ├── prospects/route.ts
    │       ├── prospects/[id]/route.ts
    │       ├── prospects/[id]/notes/route.ts
    │       └── prospects/[id]/checklist/[checklistId]/route.ts
    └── components/
        ├── analytics/
        │   └── AnalyticsDashboard.tsx  ← Stats cards + stage breakdown table
        ├── drawers/
        │   ├── ProspectDrawer.tsx       ← Side panel: prospect detail, notes, checklist
        │   └── OnboardingChecklist.tsx  ← 10-step checklist UI
        ├── kanban/
        │   ├── KanbanBoard.tsx          ← DnD context, stage grouping, overdue logic
        │   ├── KanbanColumn.tsx         ← Single pipeline column
        │   ├── KanbanHeader.tsx         ← Board toolbar (search, add prospect)
        │   └── ProspectCard.tsx         ← Draggable card tile
        ├── layout/
        │   ├── Sidebar.tsx              ← Navigation sidebar
        │   └── Topbar.tsx               ← Top bar (user info, logout)
        ├── modals/
        │   └── AddProspectModal.tsx     ← Create/edit prospect form modal
        ├── providers/
        │   └── AuthProvider.tsx         ← React context for auth state
        └── ui/
            ├── Avatar.tsx
            ├── Badge.tsx
            ├── Button.tsx
            └── Input.tsx
```

---

## 5. Features

### Prospect Management
- Create, view, update, and delete school prospects (cards)
- Each prospect stores: name, school, role, email, phone, source, pipeline stage, last contact date, and next follow-up date
- Paginated listing with stage-based filtering

### Kanban Pipeline Board
- Drag-and-drop prospects between pipeline stages (admin and manager only)
- Overdue follow-up highlighting — prospects past their `nextFollowUpDate` are flagged
- "Due today" indicator for prospects needing contact on the current day
- Agents have read-only access; they can view but cannot move or edit cards

### Prospect Detail Drawer
- Click any card to open a slide-in drawer showing full prospect details
- Edit all fields inline (admin/manager only)
- View and add time-stamped notes
- View and update the onboarding checklist

### Notes System
- Paginated, append-only log of notes per prospect
- Notes display with timestamp and are ordered newest-first

### Onboarding Checklist
- A 10-step checklist is automatically created for every new prospect
- Steps are assigned with rolling due dates (1 day apart, starting from creation)
- Admin and manager can mark steps as `todo` or `done`
- Steps cover the full school onboarding lifecycle (KYC → Go-live)

### Analytics Dashboard
- Total prospects count
- Overall pipeline conversion rate (Cold → Pilot Closed)
- Overdue follow-ups count
- Closed this month count
- Per-stage breakdown: count + average days spent in stage
- 6-month monthly trend of prospects added

### Authentication & Session Management
- HTTP-only cookie-based JWT sessions (7-day expiry)
- Middleware supports both `Bearer` token (Authorization header) and cookie-based auth
- Secure cookies in production (`secure: true`)
- Auth token issued on both register and login

### Role-Based Access Control
- Three roles enforced at both API and UI level: `admin`, `manager`, `agent`
- Admin can manage all users and change roles
- Fine-grained route-level authorization via `authorizeRoles()` middleware

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
| Node.js | 18.x | `node --version` |
| npm | 9.x | `npm --version` |
| MongoDB | 6.x (local) or Atlas — optional if using Prisma/MySQL | — |`r`n| MySQL / MariaDB | 10.x / 10.5+ (for Prisma) — optional | — |
| Git | Any | `git --version` |

> **Database Setup**: 
> - For **Version 1**, Mongoose handles collection creation automatically. 
> - For **Version 2**, run `npx prisma db push` or `npx prisma migrate dev` to generate the MySQL tables.

---

## 9. Environment Variables

### Backend — `Backend/.env`

Create this file by copying the example shipped at the repository root of the backend:

```bash
cp Backend/.env.example Backend/.env
```

Then fill in each value. The project supports both the original MongoDB connection string and a Prisma `DATABASE_URL` for MySQL/MariaDB.

```env
# Use for Prisma / MySQL (example):
DATABASE_URL="mysql://root:password@127.0.0.1:3306/kalnet_crm"

# Original MongoDB variable (kept for backward compatibility):
MONGODB_CONNECTION_STRING=mongodb://localhost:27017/kalnet-crm

# Server
PORT=6060

# Authentication
JWT_SECRET=your-very-long-random-secret-at-least-64-characters
JWT_EXPIRES_IN=7d

# Environment (set to "production" in prod)
NODE_ENV=development

# Frontend origin (for CORS)
FRONTEND_URL=http://localhost:3000
```

**Variable Reference:**

| Variable | Required | Description |
|---|:---:|---|
| `PORT` | Yes | Port the Express server listens on |
| `MONGODB_CONNECTION_STRING` | Yes | Full MongoDB connection URI |
| `JWT_SECRET` | Yes | Secret key for signing JWTs — use a long random string |
| `JWT_EXPIRES_IN` | Yes | JWT expiry duration (e.g. `7d`, `24h`) |
| `NODE_ENV` | Yes | `development` or `production` |
| `FRONTEND_URL` | Yes | Allowed CORS origin — your Next.js URL |

> **Security**: Never commit `Backend/src/.env` to version control. It is already listed in `.gitignore`.

---

### Frontend — `Frontend/.env.local`

```env
# URL of the Express backend — used by Next.js API proxy routes
NEXT_PUBLIC_BACKEND_URL=http://localhost:6060
```

| Variable | Required | Description |
|---|:---:|---|
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Full base URL of the Express backend API |

---

## 10. Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/kalnet-crm.git
cd kalnet-crm
```

### 2. Install Backend dependencies

```bash
cd Backend
npm install
```

### 3. Configure Backend environment

```bash
cp Backend/.env.example Backend/.env
# Edit Backend/.env and fill in all required values
```

### 4. Install Frontend dependencies

```bash
cd ../Frontend
npm install
```

### 5. Configure Frontend environment

```bash
# Create .env.local (already present in the repo for local dev)
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:6060" > .env.local
```

---

## 11. Running the Application

Both servers must run simultaneously. Open two terminal windows.

### Terminal 1 — Backend

```bash
cd Backend
npm run dev
```

Expected output:
```
[nodemon] starting `node server.js`
Database connected
Server running on port 6060
```

You can verify the backend is working by visiting:
```
http://localhost:6060/
```
Response: `{ "success": true, "message": "KALNET CRM API is running", "version": "1.0.0" }`

---

### Terminal 2 — Frontend

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

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

### First-Time Setup — Create the First Admin User

The registration endpoint defaults all new users to the `agent` role. To create the first admin, register normally and then manually update the role in MongoDB:

```bash
# Open MongoDB shell (replace with your connection string if using Atlas)
mongosh "mongodb://localhost:27017/kalnet-crm"

# Promote a user to admin
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

Once you have an admin, you can manage all other user roles from within the application at `GET /api/auth/users` and `PATCH /api/auth/users/:id/role`.

---

### Build for Production

**Frontend:**
```bash
cd Frontend
npm run build
npm start          # Serves the production build on port 3000
```

**Backend** (no build step required — runs directly with Node.js):
```bash
cd Backend
NODE_ENV=production node server.js
```

---

## 12. API Reference

All API endpoints return JSON in the shape:
```json
{ "success": true, "data": { ... } }
// or on error:
{ "success": false, "message": "Error description" }
```

### Authentication Endpoints

**Base path:** `/api/auth`

---

#### `POST /api/auth/register`

Register a new user. New users default to the `agent` role.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

**Responses:**

| Status | Meaning |
|---|---|
| `201` | Created — returns user object and sets JWT cookie |
| `400` | Validation error (missing fields, weak password) |
| `409` | Email already registered |

**Success Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "agent" },
    "token": "<jwt>"
  }
}
```

---

#### `POST /api/auth/login`

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

**Responses:**

| Status | Meaning |
|---|---|
| `200` | OK — returns user object and sets JWT cookie |
| `401` | Invalid credentials |

---

#### `GET /api/auth/me` 🔒

Returns the currently authenticated user.

**Headers:** JWT must be in `Authorization: Bearer <token>` header or `token` cookie.

**Response:**
```json
{
  "success": true,
  "data": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "agent" }
}
```

---

#### `POST /api/auth/logout` 🔒

Clears the JWT cookie and logs out the user.

**Response:** `{ "success": true, "message": "Logged out" }`

---

#### `GET /api/auth/users` 🔒 Admin only

Returns a list of all registered users.

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "...", "name": "Jane", "email": "jane@example.com", "role": "agent", "createdAt": "..." }
  ]
}
```

---

#### `PATCH /api/auth/users/:id/role` 🔒 Admin only

Updates a user's role.

**Request Body:**
```json
{ "role": "manager" }
```
Valid roles: `admin`, `manager`, `agent`

---

### Cards (Prospects) Endpoints

**Base path:** `/api` — all routes require authentication 🔒

---

#### `GET /api/cards`

Returns all prospects with optional pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "cards": [ { ...prospect } ],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

---

#### `GET /api/cards/:id`

Returns a single prospect by ID.

---

#### `POST /api/cards` — Admin, Manager only

Creates a new prospect. Automatically triggers creation of the 10-step onboarding checklist.

**Request Body:**
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

| Field | Required | Type | Description |
|---|:---:|---|---|
| `name` | Yes | string | Contact person's name |
| `school` | Yes | string | School / institution name |
| `role` | No | string | Contact's role at the school |
| `email` | No | string | Contact email |
| `phone` | No | string | Contact phone number |
| `source` | No | string | Lead source (e.g., Referral, Event) |
| `stage` | No | string | Pipeline stage (defaults to `Cold`) |
| `lastContactDate` | No | ISO date | Date of last contact |
| `nextFollowUpDate` | No | ISO date | Scheduled follow-up date |

---

#### `PATCH /api/cards/:id` — Admin, Manager only

Partially updates a prospect. Accepts any subset of the fields listed above.

---

#### `DELETE /api/cards/:id` — Admin, Manager only

Deletes a prospect by ID.

---

### Notes Endpoints

---

#### `POST /api/cards/:cardId/notes` — All roles

Adds a note to a prospect.

**Request Body:**
```json
{ "text": "Called the principal — interested in a demo next week." }
```

---

#### `GET /api/cards/:cardId/notes`

Returns paginated notes for a prospect (newest first).

**Query Parameters:** `page`, `limit`

---

### Checklist Endpoints

---

#### `GET /api/cards/:cardId/checklist`

Returns the 10-step onboarding checklist for a prospect.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "stepNumber": 1,
      "title": "School KYC completed",
      "status": "done",
      "assignee": "KALNET Ops",
      "dueDate": "2026-05-12T00:00:00.000Z"
    }
  ]
}
```

---

#### `PATCH /api/checklist/:id` — Admin, Manager only

Updates a checklist step's status.

**Request Body:**
```json
{ "status": "done" }
```

Valid values: `todo`, `done`

---

### Analytics Endpoint

---

#### `GET /api/analytics` — All roles

Returns a full analytics summary computed in real time from MongoDB aggregations.

**Response:**
```json
{
  "success": true,
  "data": {
    "stageBreakdown": [
      { "stage": "Cold", "count": 12, "avgDays": 5.2 },
      { "stage": "Contacted", "count": 8, "avgDays": 12.0 }
    ],
    "totalProspects": 42,
    "conversionRate": 9.5,
    "overdueCount": 3,
    "closedCount": 4,
    "closedThisMonth": 2,
    "monthlyTrend": [
      { "year": 2026, "month": 1, "count": 5 },
      { "year": 2026, "month": 2, "count": 9 }
    ]
  }
}
```

---

### Rate Limits

| Route Group | Window | Max Requests |
|---|---|---|
| `/api/auth/*` | 15 minutes | 1,000 (development) |
| `/api/*` | 15 minutes | 5,000 (development) |

> **Important**: Reduce these limits significantly before deploying to production. Recommended production values: 20 for auth endpoints, 200 for general API.

---

## 13. Database Models

### User

| Field | Type | Constraints |
|---|---|---|
| `name` | String | Required, trimmed |
| `email` | String | Required, unique, lowercase |
| `password` | String | Required, hashed with bcrypt, hidden from queries by default |
| `role` | String enum | `admin` / `manager` / `agent`, defaults to `agent` |
| `createdAt` / `updatedAt` | Date | Auto-managed by Mongoose |

**Indexes:** `{ email: 1 }` (unique)

---

### Card (Prospect)

| Field | Type | Constraints |
|---|---|---|
| `name` | String | Required |
| `school` | String | Required |
| `role` | String | Optional |
| `email` | String | Optional |
| `phone` | String | Optional |
| `source` | String | Optional |
| `stage` | String enum | Cold / Contacted / Demo Booked / Demo Done / Proposal Sent / Pilot Closed — defaults to `Cold` |
| `lastContactDate` | Date | Optional |
| `nextFollowUpDate` | Date | Optional |
| `createdAt` / `updatedAt` | Date | Auto-managed |

**Indexes:**
- `{ stage: 1, createdAt: -1 }` — supports Kanban grouping + timeline views
- `{ createdAt: -1 }` — recent-first listing
- `{ nextFollowUpDate: 1 }` — overdue query performance

---

### Notes

| Field | Type | Constraints |
|---|---|---|
| `prospectId` | ObjectId | References `Card`, required |
| `text` | String | Required |
| `createdAt` / `updatedAt` | Date | Auto-managed |

---

### OnboardingChecklist

| Field | Type | Constraints |
|---|---|---|
| `prospectId` | ObjectId | References `Card`, required |
| `stepNumber` | Number | 1–10, required |
| `title` | String | Required |
| `description` | String | Optional |
| `assignee` | String | Optional (defaults to "KALNET Ops") |
| `status` | String enum | `todo` / `done`, defaults to `todo` |
| `dueDate` | Date | Optional |

**Indexes:**
- `{ prospectId: 1, stepNumber: 1 }` (unique) — one step per number per prospect
- `{ prospectId: 1, status: 1 }` — filter by completion status

---

## 14. Security

### Authentication
- JWTs are signed with a secret key and stored in **HTTP-only cookies**, making them inaccessible to JavaScript and protected against XSS
- The middleware also accepts a `Bearer` token in the `Authorization` header for programmatic API consumers
- Tokens expire after 7 days; logout clears the cookie immediately
- Passwords are hashed with **bcrypt** (cost factor 10+) and the `password` field is excluded from all queries by default (`select: false`)

### HTTP Security Headers
All responses include:

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking in iframes |
| `X-XSS-Protection` | `1; mode=block` | Enables browser XSS filter |
| `X-Powered-By` | (removed) | Hides Express server identity |

### CORS
CORS is restricted to the origin defined in `FRONTEND_URL`. Credentials (cookies) are allowed only for that origin.

### Input Validation
All request bodies and parameters are validated with **Zod schemas** before reaching any controller. Invalid inputs return a structured `400` error.

### Error Handling
- Mongoose `ValidationError` → `400`
- Mongoose `CastError` (bad ObjectId) → `400`
- Duplicate key error (code `11000`) → `409`
- Stack traces are only included in error responses when `NODE_ENV !== "production"`

---

## 15. Frontend Pages & Components

### Pages

| Route | Access | Description |
|---|---|---|
| `/login` | Public | Email/password login form |
| `/register` | Public | New user registration form |
| `/` | Protected | Kanban pipeline board |
| `/admin/crm/analytics` | Protected | Analytics dashboard |
| `/settings` | Protected | User settings |

### Key Components

**`KanbanBoard`** — The core page component. Wraps all columns in a `DragDropContext`, groups prospects by stage, identifies overdue and due-today cards, and passes edit permissions based on the user's role.

**`KanbanColumn`** — Renders a single pipeline stage column as a `Droppable` zone with the count badge and the list of `ProspectCard` tiles.

**`ProspectCard`** — A `Draggable` card tile showing the school name, contact, stage badge, and overdue/due-today indicators. Clicking opens the `ProspectDrawer`.

**`ProspectDrawer`** — A slide-in side panel showing all prospect fields, an editable form for admin/manager, a notes log with an add-note input, and the onboarding checklist.

**`OnboardingChecklist`** — Renders the 10-step checklist with checkbox controls. Steps are read-only for agents.

**`AnalyticsDashboard`** — Four summary stat cards (total, conversion rate, overdue, closed) plus a table of per-stage breakdowns showing count and average days in stage.

**`AuthProvider`** — React context that fetches `/api/auth/me` on mount, stores the current user, and provides `login`, `logout`, and `user` to the entire component tree.

**`AddProspectModal`** — A modal form for creating or editing a prospect, with all fields and a stage selector.

---

## 16. Onboarding Checklist

When a new prospect (card) is created, the backend automatically generates a 10-step onboarding checklist via `createOnboardingChecklist()`. If a checklist already exists for a prospect, it is not duplicated (idempotent).

**Default Steps:**

| Step | Title |
|:---:|---|
| 1 | School KYC completed |
| 2 | Admin account created |
| 3 | Teachers onboarded |
| 4 | Student data uploaded |
| 5 | Class structure setup |
| 6 | Fee module configured |
| 7 | Attendance module enabled |
| 8 | Timetable created |
| 9 | Training session completed |
| 10 | Go-live confirmation |

Each step is assigned to `"KALNET Ops"` by default and has a due date rolling 1 day apart from the prospect's creation date.

---

## 17. Analytics

The analytics endpoint (`GET /api/analytics`) computes all stats in a single round-trip using `Promise.all()` to run all MongoDB queries concurrently:

| Metric | How It's Calculated |
|---|---|
| `totalProspects` | `Card.countDocuments()` |
| `conversionRate` | `(closedTotal / totalProspects) * 100` |
| `overdueCount` | Cards where `nextFollowUpDate < now` AND stage ≠ `Pilot Closed` |
| `closedCount` | Cards where `stage = Pilot Closed` |
| `closedThisMonth` | Pilot Closed cards with `updatedAt ≥ first day of current month` |
| `stageBreakdown` | MongoDB `$group` aggregation per stage: count + average days since creation |
| `monthlyTrend` | Cards created per month for the last 6 months |

---

## Migration to MySQL + Prisma

This repository now supports an optional migration path from the original MongoDB/Mongoose backend to a MySQL database managed with Prisma. The migration was implemented to preserve the existing API shapes so the frontend remains compatible.

Key changes
- Backend: Prisma client added with the MariaDB adapter (`@prisma/adapter-mariadb`) and `mariadb` driver.
- New Prisma schema: `prisma/schema.prisma` (models: `Prospect`, `ProspectNote`, `OnboardingChecklist`, `User`).
- Seed script: `Backend/prisma/seed.js` to populate demo data and create idempotent onboarding checklists.
- Repo/service layer: `Backend/src/repo/*` and `Backend/src/service/*` updated to use Prisma while keeping API response shapes unchanged.
- Frontend: some Next.js API routes may call the Prisma client directly (via a lightweight bridge) so the app can run without an external MongoDB if desired.
- MongoDB/Mongoose artifacts remain in the repo for rollback and verification.

Environment
- Backend accepts the original `MONGODB_CONNECTION_STRING` (to keep using MongoDB) or a `DATABASE_URL` for Prisma/MySQL.
- Example `Backend/src/.env` additions:

```env
# Use this for Prisma / MySQL (example):
DATABASE_URL=mysql://user:password@localhost:3306/kalnet_crm

# Existing Mongo variable (kept for backward compatibility):
MONGODB_CONNECTION_STRING=mongodb://localhost:27017/kalnet-crm
```

Scripts & common commands (run from `Backend/`)

```bash
# Install deps
npm install

# Generate Prisma client
npx prisma generate

# Create migrations (requires DATABASE_URL pointing at MySQL/MariaDB)
npx prisma migrate dev --name init

# Run seed script (idempotent)
npm run db:seed
```

Notes
- Prisma v7 requires a runtime adapter for MySQL/MariaDB; this project uses `@prisma/adapter-mariadb` + `mariadb` driver. The Prisma client is exported from `Backend/src/db/prismaClient.js`.
- To test locally: set `DATABASE_URL` to a reachable MySQL instance, run `npx prisma generate`, `npx prisma migrate dev --name init`, then `npm run db:seed`.
- API response shapes were preserved to avoid frontend changes. Mongo artifacts were intentionally kept for rollback; remove them only after full verification.

### Troubleshooting — Prisma migrations & common issues

If you run into problems while switching to the Prisma/MySQL path, the following checklist covers the most common errors and how to resolve them.

- `P1001` / "Can't reach database": Ensure MySQL/MariaDB is running and `DATABASE_URL` is correct. Verify connectivity:

```bash
# macOS / Linux
mysql --host=localhost --user=<user> -p

# Windows PowerShell
Test-NetConnection -ComputerName localhost -Port 3306
```

- `P1012` / schema `url` is no longer supported: Prisma v7 moved the `url` out of `schema.prisma`. Remove `url` from the schema and configure the connection via `DATABASE_URL` + adapter as shown in the project.

- Adapter not found or runtime errors: Install the runtime adapter and driver used here:

```bash
cd Backend
npm install @prisma/adapter-mariadb mariadb
```

- `npx prisma generate` fails: confirm `prisma` is installed in `node_modules` and `DATABASE_URL` (if required) is set. Run `npx prisma validate` then `npx prisma generate`.

- `npx prisma migrate dev` errors: Check that the DB user has permission to create schemas/tables, and that the target database exists or use `--create-database` where supported. Review the full error for SQL-level hints.

- Seed script issues (ts-node/esm loader errors): Use the provided plain ESM seed runner `Backend/prisma/seed.js` (avoids ts-node/esm loader problems on newer Node versions):

```bash
cd Backend
npm run db:seed
```

- Next.js build or server bundling errors importing Prisma: Avoid importing Prisma client from modules that are bundled for both client and server. The project uses a lightweight bridge and a singleton pattern (`Backend/src/db/prismaClient.js` and `Frontend/lib/prisma.ts`) to prevent multiple instances and bundling problems.

- Duplicate checklist items after repeated seeds: The code uses idempotent inserts (`createMany` with `skipDuplicates`) to avoid duplicate checklist items — if you still see duplicates, confirm the unique constraint on `(prospectId, stepNumber)` exists in the database.

- Firewall / bind-address issues: If the DB is running but unreachable, check MySQL's `bind-address` (set to `0.0.0.0` to allow external connections) and any OS-level firewall rules.

If you hit an error not covered above, paste the exact error message and I will provide targeted troubleshooting steps.

## 18. Production Deployment

### Backend (e.g., Railway, Render, EC2)

1. Set all environment variables on your hosting platform (do not commit `.env`)
2. Set `NODE_ENV=production`
3. Set `FRONTEND_URL` to your production frontend URL
4. Tighten rate limits in `index.js` — recommended: 20 req/15min for auth, 200 req/15min for API
5. Use a process manager like `pm2`:
   ```bash
   npm install -g pm2
   pm2 start server.js --name kalnet-api
   pm2 save
   ```
6. Use a reverse proxy (Nginx / Caddy) with HTTPS termination in front of Express

### Frontend (e.g., Vercel, Netlify)

Vercel is the simplest option for Next.js:

```bash
cd Frontend
npx vercel
```

Set the following environment variable in your Vercel project dashboard:
```
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

### MongoDB Atlas (Recommended for Production)

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with read/write permissions
3. Whitelist your backend server's IP address (or use `0.0.0.0/0` cautiously)
4. Copy the connection string and set it as `MONGODB_CONNECTION_STRING`

### Production Checklist

- [ ] `NODE_ENV=production` is set on the backend
- [ ] JWT secret is a cryptographically random string of at least 64 characters
- [ ] Rate limits are tightened
- [ ] HTTPS is enabled on both frontend and backend
- [ ] `FRONTEND_URL` matches the exact production URL (no trailing slash)
- [ ] MongoDB Atlas IP whitelist is configured
- [ ] `Backend/src/.env` is excluded from version control (check `.gitignore`)
- [ ] Error stack traces are not leaked (they are hidden when `NODE_ENV=production`)

---

## 19. Common Issues & Troubleshooting

### `MongoDB connection failed` on backend start

- Check that MongoDB is running locally: `sudo systemctl status mongod` (Linux) or the MongoDB Compass status indicator
- Verify `MONGODB_CONNECTION_STRING` in `Backend/src/.env` has no typos
- For Atlas, confirm your IP is whitelisted and credentials are correct

### `CORS error` in browser console

- Check that `FRONTEND_URL` in the backend `.env` exactly matches the origin the browser reports (including protocol and port, e.g. `http://localhost:3000`)
- Ensure both servers are running

### `JWT_SECRET is not configured` error

- The `JWT_SECRET` variable is missing or empty in `Backend/src/.env`
- Restart the backend server after editing `.env`

### Drag and drop not working

- Only `admin` and `manager` roles can drag cards. If you are logged in as `agent`, drag is intentionally disabled
- Confirm the `user.role` in the browser's auth context

### Checklist not appearing for a prospect

- The checklist is auto-created when a prospect is first saved via `POST /api/cards`
- If a prospect was created before this feature was added, call `POST /api/cards/:id` (patch it) and trigger a manual checklist seed, or insert checklist documents directly in MongoDB

### `Too many requests` error (429)

- You have hit the rate limit. Wait 15 minutes or temporarily increase the `max` values in `index.js` during development

### Next.js build errors (`npm run build`)

- Run `npm run lint` to catch type or ESLint issues
- Ensure all environment variables prefixed with `NEXT_PUBLIC_` are defined before building

---

## 20. Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Make your changes following the existing code style
4. Commit with a descriptive message: `git commit -m "feat: add email notification on stage change"`
5. Push to your fork: `git push origin feat/your-feature-name`
6. Open a Pull Request against `main`

**Code Style Guidelines:**
- Backend uses ES Modules (`import`/`export`) — do not use `require()`
- All request inputs must have a corresponding Zod schema in `/src/validation/`
- Business logic belongs in `/src/service/`, data access in `/src/repo/`, HTTP handling in `/src/controllers/`
- Frontend components use TypeScript — all props must be typed
- Tailwind classes should use the project's design tokens where possible
