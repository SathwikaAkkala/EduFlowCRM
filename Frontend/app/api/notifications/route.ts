import { requireAuth } from "@/lib/serverAuth";
import { backendProxyRequest } from "@/lib/backendProxy";
import { jsonWithHeaders } from "@/lib/apiResponse";
import { captureException, createRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

type NotificationItem = {
  id: string;
  userId?: string;
  type?: string;
  title?: string;
  message?: string;
  metadata?: { prospectIds?: string[]; prospectCount?: number };
  read?: boolean;
  createdAt?: string;
};

type Prospect = {
  id: string;
  name: string;
  school: string;
  stage: string;
  nextFollowUpDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function isBeforeToday(value: string | Date | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function flattenProspects(groups: any[]): Prospect[] {
  return groups.flatMap((group) =>
    (group?.prospects || []).map((prospect: Prospect) => ({
      ...prospect,
      stage: prospect.stage || group?._id,
    }))
  );
}

export async function GET() {
  const requestId = createRequestId();
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const notificationsPromise = backendProxyRequest("/api/notifications", { method: "GET" });
    const cardsPromise = (async () => {
      const groupedCards: any[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const { response, body } = await backendProxyRequest(`/api/cards?page=${page}&limit=100`, {
          method: "GET",
        });

        if (!response.ok) {
          return { response, body: null, data: [] as any[] };
        }

        groupedCards.push(...(Array.isArray(body?.data) ? body.data : []));
        totalPages = Number(body?.pagination?.totalPages || totalPages);
        page += 1;
      }

      return { response: { ok: true }, body: null, data: groupedCards };
    })();

    const [notificationsResult, cardsResult] = await Promise.all([notificationsPromise, cardsPromise]);

    let existingNotifications: NotificationItem[] = [];
    if (notificationsResult.response.ok) {
      const data = Array.isArray(notificationsResult.body?.data)
        ? notificationsResult.body.data
        : [];
      existingNotifications = data;
    }

    const groupedCards = Array.isArray(cardsResult.data) ? cardsResult.data : [];
    const prospects = flattenProspects(groupedCards);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const overdueProspects = prospects.filter((p) => p.stage !== "Pilot Closed" && isBeforeToday(p.nextFollowUpDate));
    const dueTodayProspects = prospects.filter(
      (p) =>
        p.stage !== "Pilot Closed" &&
        !!p.nextFollowUpDate &&
        new Date(p.nextFollowUpDate) >= todayStart &&
        new Date(p.nextFollowUpDate) < tomorrowStart
    );

    const syntheticNotifications: NotificationItem[] = [];

    if (overdueProspects.length > 0 && !existingNotifications.some((n) => n.type === "overdue_prospects")) {
      syntheticNotifications.push({
        id: `synthetic-overdue-${todayStart.toISOString()}`,
        type: "overdue_prospects",
        title: `${overdueProspects.length} Overdue Follow-ups`,
        message: `You have ${overdueProspects.length} prospect(s) with overdue follow-up dates.`,
        metadata: { prospectCount: overdueProspects.length, prospectIds: overdueProspects.map((p) => p.id) },
        read: false,
        createdAt: now.toISOString(),
      });
    }

    if (dueTodayProspects.length > 0 && !existingNotifications.some((n) => n.type === "due_today")) {
      syntheticNotifications.push({
        id: `synthetic-due-today-${todayStart.toISOString()}`,
        type: "due_today",
        title: `${dueTodayProspects.length} Due Today Follow-ups`,
        message: `You have ${dueTodayProspects.length} prospect(s) due for follow-up today.`,
        metadata: { prospectCount: dueTodayProspects.length, prospectIds: dueTodayProspects.map((p) => p.id) },
        read: false,
        createdAt: now.toISOString(),
      });
    }

    const combined = [...syntheticNotifications, ...existingNotifications].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return jsonWithHeaders({
      success: true,
      data: combined,
      unreadCount: combined.filter((item) => !item.read).length,
    });
  } catch (err) {
    captureException(err, { route: "GET /api/notifications", requestId, userId: auth.user.id });
    return jsonWithHeaders({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
