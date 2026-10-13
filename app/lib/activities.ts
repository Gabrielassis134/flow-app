export type Activity = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  category: string;
  color: string;
  recurrence?: "none" | "weekly" | "weekdays" | "custom";
  recurrenceDays?: number[];
  recurrenceEnd?: "never" | "date";
  recurrenceEndDate?: string | null;
};

export function getCategoryColor(category: string) {
  if (category === "Escola") {
    return "border-l-sky-400";
  }

  if (category === "Estudos") {
    return "border-l-violet-400";
  }

  if (category === "Igreja") {
    return "border-l-amber-400";
  }

  if (category === "Música") {
    return "border-l-pink-400";
  }

  return "border-l-emerald-400";
}
