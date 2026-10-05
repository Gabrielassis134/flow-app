export type Activity = {
  id: number;
  title: string;
  date: string;
  start: string;
  end: string;
  category: string;
  color: string;
};

export const ACTIVITIES_STORAGE_KEY = "flow-activities";

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

export function getSavedActivities(): Activity[] {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = localStorage.getItem(
    ACTIVITIES_STORAGE_KEY
  );

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

export function saveActivities(activities: Activity[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    ACTIVITIES_STORAGE_KEY,
    JSON.stringify(activities)
  );
}