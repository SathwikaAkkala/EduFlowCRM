export const ONBOARDING_STEPS = [
  { stepNumber: 1,  title: "Contract Signed",          description: "Confirm signed agreement received and filed in Google Drive shared folder.",           assignee: "Rishav Raj" },
  { stepNumber: 2,  title: "Welcome Email Sent",        description: "Send onboarding welcome email with portal credentials and onboarding timeline.",      assignee: "BD Team" },
  { stepNumber: 3,  title: "Kickoff Call Scheduled",    description: "Book 60-minute kickoff call with school principal and IT administrator.",              assignee: "BD Team" },
  { stepNumber: 4,  title: "School Data Collected",     description: "Collect student roster, teacher list, and class schedule in standard CSV template.",   assignee: "KALNET Ops" },
  { stepNumber: 5,  title: "Admin Account Created",     description: "Create super-admin account on KALNET platform with school email domain configured.",  assignee: "Tech Team" },
  { stepNumber: 6,  title: "Data Migrated",             description: "Import roster CSV, verify row count matches, and resolve any duplicate entries.",      assignee: "Tech Team" },
  { stepNumber: 7,  title: "Platform Demo Completed",   description: "Run 90-minute live demo for teachers covering all core KALNET features.",             assignee: "Product Team" },
  { stepNumber: 8,  title: "Teacher Training Done",     description: "Complete 2-hour training session and distribute quick-reference guide to all staff.",  assignee: "Product Team" },
  { stepNumber: 9,  title: "Go-Live Date Confirmed",    description: "Confirm official go-live date with school leadership and announce via school email.",  assignee: "BD Team" },
  { stepNumber: 10, title: "30-Day Check-in Booked",    description: "Schedule 30-day adoption review call with principal to assess platform usage.",        assignee: "BD Team" },
];

export function buildOnboardingChecklistData(prospectId: string) {
  return ONBOARDING_STEPS.map((step, index) => ({
    prospectId,
    stepNumber: step.stepNumber,
    title: step.title,
    description: step.description,
    assignee: step.assignee,
    status: "todo",
    dueDate: new Date(Date.now() + (index + 1) * 86400000),
  }));
}
