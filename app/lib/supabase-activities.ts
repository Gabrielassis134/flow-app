import { supabase } from "./supabase";
import type { Activity } from "./activities";

type SupabaseActivity = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  category: string;
  color: string | null;
  recurrence: "none" | "weekly" | "weekdays" | "custom";
  recurrence_days: number[] | null;
  recurrence_end: "never" | "date";
  recurrence_end_date: string | null;
};

async function getCurrentUserId(actionMessage: string): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  if (!user) {
    throw new Error(`Você precisa entrar na sua conta para ${actionMessage}.`);
  }

  return user.id;
}

export async function getSupabaseActivities(): Promise<Activity[]> {
  const userId = await getCurrentUserId("carregar os compromissos");

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as SupabaseActivity[]).map((item) => ({
    id: item.id,
    title: item.title,
    date: item.date,
    // O Postgres devolve "HH:mm:ss"; o app trabalha com "HH:mm".
    start: item.start_time?.slice(0, 5) ?? "",
    end: item.end_time?.slice(0, 5) ?? "",
    category: item.category,
    color: item.color ?? "",
    recurrence: item.recurrence,
    recurrenceDays: item.recurrence_days ?? [],
    recurrenceEnd: item.recurrence_end,
    recurrenceEndDate: item.recurrence_end_date,
  }));
}

export async function createSupabaseActivity(
  activity: Omit<Activity, "id">,
): Promise<string> {
  const userId = await getCurrentUserId("salvar compromissos");

  const { data, error } = await supabase
    .from("activities")
    .insert({
      user_id: userId,
      title: activity.title,
      date: activity.date,
      start_time: activity.start || null,
      end_time: activity.end || null,
      category: activity.category,
      color: activity.color,
      recurrence: activity.recurrence ?? "none",
      recurrence_days: activity.recurrenceDays ?? [],
      recurrence_end: activity.recurrenceEnd ?? "never",
      recurrence_end_date: activity.recurrenceEndDate || null,
    })
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

export async function deleteSupabaseActivity(id: string): Promise<void> {
  const userId = await getCurrentUserId("excluir compromissos");

  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}
