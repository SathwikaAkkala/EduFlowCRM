import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure email transporter based on environment
const createTransporter = () => {
  // Prefer explicit SMTP config in any environment.
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Development: use test account or console output
  if (process.env.NODE_ENV === "development") {
    console.log("[Email Service] Running in development mode - emails will be logged to console");
    return {
      sendMail: async (options) => {
        console.log(`[EMAIL] To: ${options.to}`);
        console.log(`[EMAIL] Subject: ${options.subject}`);
        console.log(`[EMAIL] HTML:\n${options.html}`);
        return { response: "Development mode - email logged" };
      },
    };
  }

  // Fallback to Gmail if SMTP not configured but credentials available
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });
  }

  return null;
};

const transporter = createTransporter();

/**
 * Send email with HTML template
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body
 * @returns {Promise<object>} Email result
 */
export const sendEmail = async (to, subject, html) => {
  if (!transporter) {
    console.warn("[Email Service] No email transporter configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.GMAIL_USER || "noreply@crm.com",
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ""), // Strip HTML for plain text version
    });

    console.log(`[Email Service] Email sent to ${to}: ${result.response || "Success"}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`[Email Service] Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send overdue prospect notification email
 * @param {string} userEmail - User email to notify
 * @param {Array} overdueProspects - Array of overdue prospect objects
 * @returns {Promise<object>} Email result
 */
export const sendOverdueNotificationEmail = async (userEmail, overdueProspects) => {
  const prospectRows = overdueProspects
    .map(
      (p) =>
        `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.school}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.stage}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #d32f2f; font-weight: bold;">
            ${new Date(p.nextFollowUpDate).toLocaleDateString()}
          </td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1976d2; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background-color: #1976d2; color: white; padding: 12px; text-align: left; }
          .action-button { 
            display: inline-block; 
            background-color: #1976d2; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 20px;
          }
          .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔔 Overdue Follow-ups Alert</h2>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>You have <strong>${overdueProspects.length}</strong> prospect(s) with overdue follow-up dates that need your attention:</p>
            
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>School</th>
                  <th>Stage</th>
                  <th>Follow-up Date</th>
                </tr>
              </thead>
              <tbody>
                ${prospectRows}
              </tbody>
            </table>

            <p>Please log in to the CRM to update these follow-ups or reschedule them.</p>
            
            <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard" class="action-button">
              View in CRM
            </a>

            <div class="footer">
              <p>This is an automated notification from your CRM system.</p>
              <p>&copy; ${new Date().getFullYear()} CRM. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(userEmail, `⚠️ ${overdueProspects.length} Overdue Follow-ups Need Your Attention`, html);
};

/**
 * Send a prospect-facing overdue follow-up reminder email
 * @param {string} prospectEmail - Prospect email to notify
 * @param {object} prospect - Overdue prospect record
 * @returns {Promise<object>} Email result
 */
export const sendProspectOverdueReminderEmail = async (prospectEmail, prospect) => {
  const contactName = prospect?.name?.trim() || "there";
  const schoolName = prospect?.school?.trim() || "your prospect record";
  const followUpDate = prospect?.nextFollowUpDate
    ? new Date(prospect.nextFollowUpDate).toLocaleDateString()
    : "a previous date";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1976d2; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px; }
          .summary { margin: 16px 0; padding: 14px; background: white; border-left: 4px solid #1976d2; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Follow-up reminder</h2>
          </div>
          <div class="content">
            <p>Hi ${contactName},</p>
            <p>This is a friendly reminder that the follow-up for <strong>${schoolName}</strong> is overdue.</p>
            <div class="summary">
              <p style="margin: 0;"><strong>Original follow-up date:</strong> ${followUpDate}</p>
            </div>
            <p>Please reply to this email if you would like to continue the conversation or reschedule the follow-up.</p>
            <div class="footer">
              <p>This is an automated reminder from the CRM system.</p>
              <p>&copy; ${new Date().getFullYear()} CRM. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(
    prospectEmail,
    `Reminder: follow-up for ${schoolName} is overdue`,
    html
  );
};

export default { sendEmail, sendOverdueNotificationEmail, sendProspectOverdueReminderEmail };
