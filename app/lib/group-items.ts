import { supabase } from "./supabase";
import type { Priority } from "./tasks";

/* ------------------------------------------------------------------ */
/* Tipos                                                              */
/* ------------------------------------------------------------------ */

export type ItemKind = "activity" | "task";

/** Um compromisso ou tarefa de grupo que alguém pediu para você aceitar. */
export type ItemRequest = {
  itemId: string;
  groupId: string;
  groupName: string;
  kind: ItemKind;
  title: string;
  description: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  priority: Priority;
  hasTime: boolean;
  createdByName: string;
  createdAt: string;
};

/** Resultado da checagem de agenda: só "ocupado ou livre", nunca o motivo. */
export type AvailabilityResult = {
  memberId: string;
  name: string;
  busy: boolean;
};

export type NewGroupItem = {
  groupId: string;
  kind: ItemKind;
  title: string;
  description: string;
  category: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  priority: Priority;
  hasTime: boolean;
  participantIds: string[];
};

export const INBOX_CHANGED_EVENT = "flow:inbox-changed";

/* ------------------------------------------------------------------ */
/* Utilitários                                                        */
/* ------------------------------------------------------------------ */

function fail(error: { message: string }): never {
  throw new Error(error.message);
}

/** "08:00:00" -> "08:00" (o Postgres devolve os segundos). */
function toHourMinute(time: string | null) {
  return time ? time.slice(0, 5) : "";
}

/** Avisa a navegação (contador) que a caixa de entrada mudou. */
export function notifyInboxChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INBOX_CHANGED_EVENT));
  }
}

/* ------------------------------------------------------------------ */
/* Criação de itens do grupo                                          */
/* ------------------------------------------------------------------ */

/**
 * Pergunta ao banco quais participantes estão ocupados no horário.
 * Só administradores do grupo podem chamar, e a resposta nunca revela
 * qual compromisso a pessoa tem.
 */
export async function checkAvailability(params: {
  groupId: string;
  userIds: string[];
  date: string;
  start: string;
  durationMinutes: number;
}): Promise<AvailabilityResult[]> {
  const { data, error } = await supabase.rpc("check_availability", {
    p_group_id: params.groupId,
    p_user_ids: params.userIds,
    p_date: params.date,
    p_start: params.start,
    p_duration_minutes: params.durationMinutes,
  });

  if (error) fail(error);

  return (
    (data ?? []) as {
      member_id: string;
      member_name: string;
      busy: boolean;
    }[]
  ).map((row) => ({
    memberId: row.member_id,
    name: row.member_name,
    busy: row.busy,
  }));
}

/** Cria o item e envia o pedido para a caixa de entrada de cada participante. */
export async function createGroupItem(item: NewGroupItem): Promise<string> {
  const { data, error } = await supabase.rpc("create_group_item", {
    p_group_id: item.groupId,
    p_kind: item.kind,
    p_title: item.title,
    p_description: item.description.trim() || null,
    p_category: item.category,
    p_date: item.date,
    p_start_time: item.startTime,
    p_end_time: item.endTime,
    p_duration_minutes: item.durationMinutes,
    p_priority: item.priority,
    p_has_time: item.hasTime,
    p_participant_ids: item.participantIds,
  });

  if (error) fail(error);

  return data as string;
}

/* ------------------------------------------------------------------ */
/* Caixa de entrada                                                   */
/* ------------------------------------------------------------------ */

export async function getMyItemRequests(): Promise<ItemRequest[]> {
  const { data, error } = await supabase.rpc("get_my_item_requests");

  if (error) fail(error);

  return (
    (data ?? []) as {
      item_id: string;
      group_id: string;
      group_name: string;
      kind: ItemKind;
      title: string;
      description: string | null;
      category: string;
      item_date: string;
      start_time: string | null;
      end_time: string | null;
      duration_minutes: number | null;
      priority: Priority;
      has_time: boolean;
      created_by_name: string;
      created_at: string;
    }[]
  ).map((row) => ({
    itemId: row.item_id,
    groupId: row.group_id,
    groupName: row.group_name,
    kind: row.kind,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    date: row.item_date,
    startTime: toHourMinute(row.start_time),
    endTime: toHourMinute(row.end_time),
    durationMinutes: row.duration_minutes,
    priority: row.priority,
    hasTime: row.has_time,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
  }));
}

/**
 * Aceita ou recusa. Aceitar cria o compromisso na agenda (ou a tarefa nas
 * tarefas) da conta de quem aceitou, mesmo que haja outra coisa no horário.
 */
export async function respondGroupItem(
  itemId: string,
  accept: boolean,
  color: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("respond_group_item", {
    p_item_id: itemId,
    p_accept: accept,
    p_color: color,
  });

  if (error) fail(error);
}

/** Quantidade de convites e pedidos pendentes (contador da navegação). */
export async function getInboxCount(): Promise<number> {
  const [invites, requests] = await Promise.all([
    supabase.rpc("get_my_group_invites"),
    supabase.rpc("get_my_item_requests"),
  ]);

  if (invites.error) fail(invites.error);
  if (requests.error) fail(requests.error);

  return (
    ((invites.data ?? []) as unknown[]).length +
    ((requests.data ?? []) as unknown[]).length
  );
}
