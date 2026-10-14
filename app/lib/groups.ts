import { supabase } from "./supabase";

/* ------------------------------------------------------------------ */
/* Tipos e constantes                                                 */
/* ------------------------------------------------------------------ */

export type GroupRole = "owner" | "admin" | "member";

export const ROLE_LABELS: Record<GroupRole, string> = {
  owner: "Dono",
  admin: "Administrador",
  member: "Membro",
};

export const ROLE_BADGE_CLASSES: Record<GroupRole, string> = {
  owner: "bg-amber-400/10 text-amber-300",
  admin: "bg-sky-400/10 text-sky-300",
  member: "bg-zinc-800 text-zinc-300",
};

export type Group = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
};

export type GroupSummary = Group & {
  myRole: GroupRole;
  memberCount: number;
};

export type GroupMember = {
  userId: string;
  username: string;
  displayName: string;
  role: GroupRole;
  canInvite: boolean;
  joinedAt: string;
};

export type GroupDetails = {
  group: Group;
  members: GroupMember[];
  me: GroupMember;
};

export type ReceivedGroupInvite = {
  id: string;
  groupId: string;
  groupName: string;
  invitedByName: string;
  createdAt: string;
};

export type SentGroupInvite = {
  id: string;
  username: string;
  displayName: string;
  invitedByName: string;
  createdAt: string;
};

export type UserSuggestion = {
  id: string;
  username: string;
  displayName: string;
};

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
};

type MyGroupRow = {
  role: GroupRole;
  groups: GroupRow | GroupRow[] | null;
};

type MemberRow = {
  user_id: string;
  role: GroupRole;
  can_invite: boolean;
  joined_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROLE_ORDER: Record<GroupRole, number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

/* ------------------------------------------------------------------ */
/* Utilitários internos                                               */
/* ------------------------------------------------------------------ */

// Os erros do Supabase nem sempre são instâncias de Error; padronizamos
// para que as páginas possam mostrar error.message.
function fail(error: { message: string }): never {
  throw new Error(error.message);
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

function mapGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

/* ------------------------------------------------------------------ */
/* Consultas                                                          */
/* ------------------------------------------------------------------ */

/** Grupos de que o usuário participa, com o papel dele e o nº de membros. */
export async function getMyGroups(): Promise<GroupSummary[]> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("group_members")
    .select("role, groups(id, name, description, owner_id, created_at)")
    .eq("user_id", userId);

  if (error) fail(error);

  const entries: { group: Group; role: GroupRole }[] = [];

  for (const row of (data ?? []) as unknown as MyGroupRow[]) {
    const groupRow = Array.isArray(row.groups) ? row.groups[0] : row.groups;

    if (groupRow) {
      entries.push({ group: mapGroup(groupRow), role: row.role });
    }
  }

  const counts: Record<string, number> = {};

  if (entries.length > 0) {
    const { data: memberRows, error: countError } = await supabase
      .from("group_members")
      .select("group_id")
      .in(
        "group_id",
        entries.map((entry) => entry.group.id),
      );

    if (countError) fail(countError);

    for (const member of (memberRows ?? []) as { group_id: string }[]) {
      counts[member.group_id] = (counts[member.group_id] ?? 0) + 1;
    }
  }

  return entries
    .map((entry) => ({
      ...entry.group,
      myRole: entry.role,
      memberCount: counts[entry.group.id] ?? 1,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Grupo, membros e papel do usuário; null se não existir ou sem acesso. */
export async function getGroupDetails(
  groupId: string,
): Promise<GroupDetails | null> {
  if (!UUID_PATTERN.test(groupId)) return null;

  const userId = await getCurrentUserId();

  const { data: groupRow, error: groupError } = await supabase
    .from("groups")
    .select("id, name, description, owner_id, created_at")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError) fail(groupError);
  if (!groupRow) return null;

  const { data: memberRows, error: memberError } = await supabase
    .from("group_members")
    .select("user_id, role, can_invite, joined_at")
    .eq("group_id", groupId);

  if (memberError) fail(memberError);

  const rows = (memberRows ?? []) as MemberRow[];

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in(
      "id",
      rows.map((row) => row.user_id),
    );

  if (profileError) fail(profileError);

  const profiles = new Map<string, ProfileRow>();

  for (const profile of (profileRows ?? []) as ProfileRow[]) {
    profiles.set(profile.id, profile);
  }

  const members: GroupMember[] = rows
    .map((row) => {
      const profile = profiles.get(row.user_id);

      return {
        userId: row.user_id,
        username: profile?.username ?? "",
        displayName: profile?.display_name ?? "",
        role: row.role,
        canInvite: row.can_invite,
        joinedAt: row.joined_at,
      };
    })
    .sort((a, b) => {
      const byRole = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];

      if (byRole !== 0) return byRole;

      return (a.displayName || a.username).localeCompare(
        b.displayName || b.username,
        "pt-BR",
      );
    });

  const me = members.find((member) => member.userId === userId);

  if (!me) return null;

  return { group: mapGroup(groupRow as GroupRow), members, me };
}

/* ------------------------------------------------------------------ */
/* Grupos                                                             */
/* ------------------------------------------------------------------ */

export async function createGroup(
  name: string,
  description: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("create_group", {
    p_name: name,
    p_description: description.trim() || null,
  });

  if (error) fail(error);

  return data as string;
}

export async function updateGroup(
  groupId: string,
  values: { name: string; description: string },
): Promise<void> {
  const { data, error } = await supabase
    .from("groups")
    .update({
      name: values.name.trim(),
      description: values.description.trim() || null,
    })
    .eq("id", groupId)
    .select("id");

  if (error) fail(error);

  if (!data || data.length === 0) {
    throw new Error(
      "Não foi possível editar o grupo. Verifique suas permissões.",
    );
  }
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { data, error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .select("id");

  if (error) fail(error);

  if (!data || data.length === 0) {
    throw new Error(
      "Não foi possível excluir o grupo. Só o dono pode fazer isso.",
    );
  }
}

/* ------------------------------------------------------------------ */
/* Membros e permissões                                               */
/* ------------------------------------------------------------------ */

export async function setMemberRole(
  groupId: string,
  userId: string,
  role: "admin" | "member",
): Promise<void> {
  const { data, error } = await supabase
    .from("group_members")
    .update({ role })
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .select("user_id");

  if (error) fail(error);

  if (!data || data.length === 0) {
    throw new Error(
      "Não foi possível alterar o papel. Só o dono pode fazer isso.",
    );
  }
}

export async function setMemberCanInvite(
  groupId: string,
  userId: string,
  canInvite: boolean,
): Promise<void> {
  const { data, error } = await supabase
    .from("group_members")
    .update({ can_invite: canInvite })
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .select("user_id");

  if (error) fail(error);

  if (!data || data.length === 0) {
    throw new Error(
      "Não foi possível alterar a permissão. Só o dono pode fazer isso.",
    );
  }
}

/** O dono remove um membro; qualquer membro (menos o dono) sai sozinho. */
export async function removeMember(
  groupId: string,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .select("user_id");

  if (error) fail(error);

  if (!data || data.length === 0) {
    throw new Error("Não foi possível remover essa pessoa do grupo.");
  }
}

/* ------------------------------------------------------------------ */
/* Convites                                                           */
/* ------------------------------------------------------------------ */

export async function inviteToGroup(
  groupId: string,
  username: string,
): Promise<void> {
  const { error } = await supabase.rpc("invite_to_group", {
    p_group_id: groupId,
    p_username: username,
  });

  if (error) fail(error);
}

/** Convites enviados e ainda pendentes (só para quem pode convidar). */
export async function getGroupPendingInvites(
  groupId: string,
): Promise<SentGroupInvite[]> {
  const { data, error } = await supabase.rpc("get_group_pending_invites", {
    p_group_id: groupId,
  });

  if (error) fail(error);

  return (
    (data ?? []) as {
      invite_id: string;
      invited_username: string | null;
      invited_name: string | null;
      invited_by_name: string;
      created_at: string;
    }[]
  ).map((row) => ({
    id: row.invite_id,
    username: row.invited_username ?? "",
    displayName: row.invited_name ?? "",
    invitedByName: row.invited_by_name,
    createdAt: row.created_at,
  }));
}

export async function cancelGroupInvite(inviteId: string): Promise<void> {
  const { data, error } = await supabase
    .from("group_invites")
    .delete()
    .eq("id", inviteId)
    .select("id");

  if (error) fail(error);

  if (!data || data.length === 0) {
    throw new Error("Não foi possível cancelar o convite.");
  }
}

/** Convites de grupo que o usuário logado recebeu e ainda não respondeu. */
export async function getMyGroupInvites(): Promise<ReceivedGroupInvite[]> {
  const { data, error } = await supabase.rpc("get_my_group_invites");

  if (error) fail(error);

  return (
    (data ?? []) as {
      invite_id: string;
      group_id: string;
      group_name: string;
      invited_by_name: string;
      created_at: string;
    }[]
  ).map((row) => ({
    id: row.invite_id,
    groupId: row.group_id,
    groupName: row.group_name,
    invitedByName: row.invited_by_name,
    createdAt: row.created_at,
  }));
}

export async function respondGroupInvite(
  inviteId: string,
  accept: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("respond_group_invite", {
    p_invite_id: inviteId,
    p_accept: accept,
  });

  if (error) fail(error);
}

/**
 * Sugestões de pessoas para convidar enquanto se digita (mínimo de 3
 * caracteres). Só devolve quem permite convites e ser encontrado, e nunca
 * quem já é membro ou já foi convidado.
 */
export async function searchUsersForGroup(
  groupId: string,
  query: string,
): Promise<UserSuggestion[]> {
  const { data, error } = await supabase.rpc("search_users_for_group", {
    p_group_id: groupId,
    p_query: query,
  });

  if (error) fail(error);

  return (
    (data ?? []) as {
      result_id: string;
      result_username: string;
      result_name: string | null;
    }[]
  ).map((row) => ({
    id: row.result_id,
    username: row.result_username,
    displayName: row.result_name ?? "",
  }));
}
