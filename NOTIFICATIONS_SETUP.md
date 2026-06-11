# 📬 Overdue Prospect Notifications System

## Overview

A complete email and notification system that automatically alerts users about prospects with overdue follow-up dates. The system includes:

- **Automated Scheduling**: Daily check for overdue prospects (configurable via cron)
- **Email Notifications**: HTML-formatted emails sent to all users
- **In-App Notifications**: Dashboard toast notifications and notification center
- **Database Logging**: All notifications are logged for audit and history
- **Frontend Integration**: Notification bell in topbar + dedicated notifications page

---

## Architecture

### Backend Components

#### 1. **Email Service** (`Backend/src/service/email.service.js`)
Handles all email sending logic with support for:
- SMTP configuration (production)
- Gmail authentication (alternative)
- Development mode (console logging)
- HTML email templates with `nodemailer`

**Key Functions:**
- `sendEmail(to, subject, html)` - Generic email sender
- `sendOverdueNotificationEmail(userEmail, overdueProspects)` - Overdue alert emails

#### 2. **Notification Service** (`Backend/src/service/notification.service.js`)
Core business logic for notifications:
- Detects overdue prospects (where `nextFollowUpDate < today` AND `stage != "Pilot Closed"`)
- Sends emails to all users
- Logs notifications in database
- Provides API for retrieving/managing notifications

**Key Functions:**
- `checkAndNotifyOverdueProspects()` - Main check + notify logic
- `getUserNotifications(userId)` - Fetch user's notifications
- `markNotificationAsRead(notificationId)` - Mark as read
- `getUnreadCount(userId)` - Get unread count

#### 3. **Scheduler** (`Backend/src/utils/scheduler.js`)
Uses `node-cron` to run periodic checks:
- Default schedule: **every 15 minutes** (`*/15 * * * *`)
- Configurable via `NOTIFICATION_SCHEDULE` env var
- Graceful shutdown on server termination

**Key Functions:**
- `initializeScheduler()` - Start the scheduler
- `triggerOverdueCheck()` - Manual trigger (for testing)
- `stopScheduler()` - Stop on server shutdown

#### 4. **Database Model** (`Backend/prisma/schema.prisma`)
```prisma
model NotificationLog {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  type      String   @default("notification")
  title     String
  message   String
  metadata  Json?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, read, createdAt])
  @@index([type, createdAt])
}
```

#### 5. **API Endpoints** (`Backend/src/routers/notification.routes.js`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/notifications` | Get all notifications for user | ✅ |
| GET | `/api/notifications/unread-count` | Get unread count | ✅ |
| PATCH | `/api/notifications/:id/read` | Mark as read | ✅ |
| POST | `/api/notifications/trigger-check` | Manually trigger check (admin) | ✅ |

---

### Frontend Components

#### 1. **Notification Hook** (`Frontend/hooks/useNotifications.ts`)
React hook for notification management:
- Fetches notifications on mount
- Polls for new unread count every 30s
- Provides `markAsRead` action
- Handles loading/error states

```typescript
const { notifications, unreadCount, markAsRead, fetchNotifications } = useNotifications();
```

#### 2. **Notification Bell** (`Frontend/components/layout/NotificationBell.tsx`)
Dropdown component in topbar:
- Shows unread count badge
- Lists latest notifications
- Quick mark-as-read action
- Link to full notifications page

#### 3. **Notifications Page** (`Frontend/app/(dashboard)/notifications/page.tsx`)
Full notifications center:
- List all notifications with timestamps
- Color-coded by type
- Mark individual notifications as read
- Links to related prospects

---

## Configuration

### Environment Variables

#### Email Configuration
```env
# Email settings
EMAIL_FROM=noreply@crm.com
FRONTEND_URL=http://localhost:3000

# SMTP (Production - Gmail, AWS SES, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Gmail Alternative (Simpler setup)
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
```

#### Notification Settings
```env
# Enable/disable notifications
ENABLE_NOTIFICATIONS=true

# Cron schedule (minute hour dayOfMonth month dayOfWeek)
# Default: */15 * * * * (every 15 minutes)
NOTIFICATION_SCHEDULE=*/15 * * * *

# Common schedules:
# Every hour: 0 * * * *
# Every 6 hours: 0 */6 * * *
# Weekdays at 8 AM: 0 8 * * 1-5
# Every 30 minutes: */30 * * * *
```

### Setting Up Gmail App Password

1. Enable 2-Factor Authentication on your Google Account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Select "Mail" and "Windows Computer" (or your device)
4. Google generates a 16-character app password
5. Use this password in `GMAIL_PASS` (remove spaces)

---

## How It Works

### Automatic Workflow

```
Server starts -> immediate overdue check
  ↓
Scheduler calls checkAndNotifyOverdueProspects()
  ↓
Query database for prospects where:
  - deletedAt IS NULL
  - stage != 'Pilot Closed'
  - nextFollowUpDate < TODAY
  ↓
For each user:
  - Send HTML email with overdue prospect list
  - Create NotificationLog entry in database
  ↓
Frontend polls every 30s (or on page load):
  - Displays notification bell badge with unread count
  - Users can view all notifications in dropdown or dedicated page
```

### Manual Trigger (Testing)

Admins can manually trigger a check via API:

```bash
curl -X POST http://localhost:6060/api/notifications/trigger-check \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "success": true,
  "overdueProspectsFound": 3,
  "emailsSent": 5,
  "emailsFailed": 0,
  "usersNotified": 5
}
```

---

## Testing

### Test Email Sending (Development Mode)

With `NODE_ENV=development`, emails are logged to console instead of sent:

```bash
cd Backend && npm run dev
# Check console for "[EMAIL]" logs
```

### Manual Test - Check for Overdue Prospects

```bash
curl -X GET http://localhost:6060/api/prospects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq '.data[] | select(.nextFollowUpDate < now)'
```

### Create a Test Prospect with Overdue Date

```bash
curl -X POST http://localhost:6060/api/prospects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test School",
    "school": "Test",
    "stage": "COLD",
    "nextFollowUpDate": "2025-06-01"
  }'
```

---

## Email Template

The system sends beautifully formatted HTML emails with:

- **Header**: "🔔 Overdue Follow-ups Alert"
- **Table**: Lists each overdue prospect with:
  - School name
  - Contact name
  - Current stage
  - Overdue follow-up date (highlighted in red)
- **CTA Button**: "View in CRM" link to dashboard
- **Footer**: Automated system notice

---

## Troubleshooting

### Emails Not Sending

1. **Check logs** for `[Email Service]` messages
2. **Verify `.env`** has `SMTP_HOST` or `GMAIL_USER` + `GMAIL_PASS`
3. **Test SMTP** connection:
   ```bash
   node -e "
   const nodemailer = require('nodemailer');
   const t = nodemailer.createTransport({
     service: 'gmail',
     auth: { user: 'YOUR_EMAIL', pass: 'YOUR_PASS' }
   });
   t.verify((err) => console.log(err || 'OK'));
   "
   ```
4. **Gmail**: Ensure app password is used (not regular password)
5. **Dev mode**: Emails go to console, not sent

### Scheduler Not Running

1. Check server logs for `[Scheduler]` initialization
2. Verify `ENABLE_NOTIFICATIONS != false`
3. Test manual trigger:
   ```bash
   curl -X POST http://localhost:6060/api/notifications/trigger-check \
     -H "Authorization: Bearer YOUR_JWT"
   ```

### Notifications Not Appearing in Frontend

1. Check browser console for API errors
2. Verify user is authenticated (JWT token valid)
3. Check `/api/notifications` endpoint returns data
4. Verify database has `NotificationLog` table (run migration)

---

## Performance Considerations

- **Database**: Indexes on `userId`, `read`, `createdAt` for fast queries
- **Email Rate**: Batches emails to all users asynchronously
- **Frontend Polling**: Every 30 seconds (configurable in hook)
- **Notification Retention**: No auto-delete (consider archiving old notifications)

---

## Future Enhancements

- [ ] WebSocket/SSE for real-time notifications (instead of polling)
- [ ] SMS alerts for critical overdue prospects
- [ ] Notification preferences (user-configurable schedules/channels)
- [ ] Slack integration for team notifications
- [ ] Escalation rules (notify managers after X days overdue)
- [ ] Batch digest emails (weekly summary instead of daily)
- [ ] In-app toast notifications (temporary UI alerts)

---

## File Structure

```
Backend/
├── src/
│   ├── service/
│   │   ├── email.service.js         # Email sending
│   │   └── notification.service.js  # Notification logic
│   ├── controllers/
│   │   └── notification.controller.js # API handlers
│   ├── routers/
│   │   └── notification.routes.js   # API routes
│   └── utils/
│       └── scheduler.js             # Cron scheduler
├── prisma/
│   ├── schema.prisma                # NotificationLog model added
│   └── migrations/
│       └── [timestamp]_add_notification_log/ # Migration

Frontend/
├── hooks/
│   └── useNotifications.ts          # React hook
├── components/
│   └── layout/
│       ├── NotificationBell.tsx     # Topbar dropdown
│       └── Topbar.tsx               # Updated with bell
├── app/
│   └── (dashboard)/
│       └── notifications/
│           └── page.tsx             # Full notifications page
└── types/
    └── index.ts                     # Notification types added
```

---

## API Documentation

### GET `/api/notifications`
Fetch all notifications for authenticated user

**Response:**
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
        "prospectIds": ["clx...", "clx...", "clx..."]
      },
      "read": false,
      "createdAt": "2026-06-06T09:00:00Z"
    }
  ],
  "unreadCount": 1
}
```

### PATCH `/api/notifications/:id/read`
Mark a notification as read

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "read": true,
    "updatedAt": "2026-06-06T14:30:00Z"
  }
}
```

---

## Support

For issues or questions:
1. Check the **Troubleshooting** section
2. Review backend logs for `[Notification Service]` or `[Email Service]`
3. Check database migrations ran successfully
4. Verify `.env` configuration
5. Test with manual trigger endpoint
