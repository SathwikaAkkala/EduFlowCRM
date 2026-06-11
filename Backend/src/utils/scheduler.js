import cron from "node-cron";
import { checkAndNotifyOverdueProspects } from "../service/notification.service.js";

let scheduledJob = null;
let isOverdueCheckRunning = false;

const runOverdueCheck = async (triggerSource) => {
  if (isOverdueCheckRunning) {
    console.log(`[Scheduler] Skipping ${triggerSource} overdue prospect check because another run is already in progress`);
    return { success: false, skipped: true, reason: "already_running" };
  }

  isOverdueCheckRunning = true;
  try {
    if (triggerSource === "manual") {
      console.log("[Scheduler] Manual trigger of overdue prospect check");
    } else {
      console.log(`[Scheduler] Executing overdue prospect check at ${new Date().toISOString()}`);
    }

    const result = await checkAndNotifyOverdueProspects();
    console.log(`[Scheduler] ${triggerSource} check result:`, result);
    return result;
  } finally {
    isOverdueCheckRunning = false;
  }
};

/**
 * Initialize the scheduler for overdue notifications
 * Runs every 15 minutes by default (configurable via NOTIFICATION_SCHEDULE env var)
 */
export const initializeScheduler = () => {
  try {
    // Default: every 15 minutes
    // Format: "*/15 * * * *" (minute, hour, day of month, month, day of week)
    const schedule = process.env.NOTIFICATION_SCHEDULE || "*/15 * * * *";

    console.log(`[Scheduler] Initializing notification scheduler with cron: "${schedule}"`);

    scheduledJob = cron.schedule(schedule, async () => {
      await runOverdueCheck("scheduled");
    });

    console.log("[Scheduler] Notification scheduler initialized successfully");
    return { success: true, message: "Scheduler initialized" };
  } catch (error) {
    console.error("[Scheduler] Error initializing scheduler:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Manually trigger overdue prospect check (for testing or immediate execution)
 */
export const triggerOverdueCheck = async () => {
  return await runOverdueCheck("manual");
};

/**
 * Stop the scheduler
 */
export const stopScheduler = () => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob.destroy();
    console.log("[Scheduler] Notification scheduler stopped");
    return { success: true, message: "Scheduler stopped" };
  }
  return { success: false, message: "No scheduler running" };
};

export default {
  initializeScheduler,
  triggerOverdueCheck,
  stopScheduler,
};
