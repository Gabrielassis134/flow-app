import { supabase } from "./supabase";

export type Priority = "Alta" | "Média" | "Baixa";

export type Task = {
  id: string;
  title: string;
  description: string;
  date: string;
  durationMinutes: number;
  duration?: string;
  hasTime: boolean;
  startTime: string | null;
  priority: Priority;
  category: string;
  completed: boolean;
};

type SupabaseTask = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  duration_minutes: number | null;
  has_time: boolean;
  start_time: string | null;
  priority: Priority;
  category: string;
  completed: boolean;
};

function mapTask(row: SupabaseTask): Task {
  const durationMinutes = row.duration_minutes ?? 60;

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    date: row.deadline ?? "",
    durationMinutes,
    duration: `${Math.floor(durationMinutes / 60)}h ${String(
      durationMinutes % 60,
    ).padStart(2, "0")}min`,
    hasTime: row.has_time,
    startTime: row.start_time?.slice(0, 5) ?? null,
    priority: row.priority,
    category: row.category,
    completed: row.completed,
  };
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  if (!user) {
    throw new Error("Você precisa entrar na sua conta.");
  }

  return user.id;
}

export async function getTasks(): Promise<Task[]> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, user_id, title, description, deadline, duration_minutes, priority, category, completed, has_time, start_time",
    )
    .eq("user_id", userId)
    .order("deadline", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => mapTask(row as SupabaseTask));
}

export async function createTask(task: Omit<Task, "id">): Promise<Task> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: task.title.trim(),
      description: task.description.trim() || null,
      deadline: task.date || null,
      duration_minutes: task.durationMinutes,
      priority: task.priority,
      category: task.category,
      completed: task.completed,
      has_time: task.hasTime,
      start_time: task.hasTime ? task.startTime : null,
    })
    .select(
      "id, user_id, title, description, deadline, duration_minutes, priority, category, completed, has_time, start_time",
    )
    .single();

  if (error) throw error;

  return mapTask(data as SupabaseTask);
}

export async function setTaskCompleted(
  id: string,
  completed: boolean,
): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("tasks")
    .update({ completed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteTaskFromDatabase(id: string): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}
