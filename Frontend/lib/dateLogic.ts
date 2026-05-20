import { isBefore, startOfDay } from "date-fns";

export function isOverdueDate(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  return isBefore(new Date(value), startOfDay(new Date()));
}

