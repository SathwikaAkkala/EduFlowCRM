// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays, format, isBefore, startOfDay } from "date-fns";
import { isOverdueDate } from "@/lib/dateLogic";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isOverdue(nextFollowUpDate: string | null | undefined): boolean {
  return isOverdueDate(nextFollowUpDate);
}

export function isDueToday(nextFollowUpDate: string | null | undefined): boolean {
  if (!nextFollowUpDate) return false;
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = new Date(nextFollowUpDate);
  return !isBefore(date, today) && isBefore(date, tomorrow);
}

export function daysSince(date: string | null | undefined): number | null {
  if (!date) return null;
  return differenceInDays(new Date(), new Date(date));
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatRelative(date: string | null | undefined): string {
  if (!date) return "Never";
  const days = differenceInDays(new Date(), new Date(date));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 0) return `In ${Math.abs(days)}d`;
  return `${days}d ago`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
