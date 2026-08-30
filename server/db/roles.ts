import { and, eq, isNull } from "drizzle-orm";
import { roles, userRoles, users } from "../../drizzle/schema";
import { getDb } from "./client";
import { logAction } from "./audit";

export type AssignableRoleCode = "mentor" | "moderator" | "administrator";

/**
 * Attribution ou retrait d'un rôle (référentiel section 6 : "Attribuer
 * Modérateur ou Administrateur" — autorisation minimale Administrateur
 * habilité, confirmation renforcée et journalisation obligatoire). Le rôle
 * "alumni" n'est jamais géré ici : il est attribué automatiquement à la
 * création du compte.
 */
export async function assignRole(actorId: number, targetUserId: number, roleCode: AssignableRoleCode, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  const [role] = await db.select().from(roles).where(eq(roles.code, roleCode)).limit(1);
  if (!role) throw new Error("Rôle inconnu.");

  await db
    .insert(userRoles)
    .values({ userId: targetUserId, roleId: role.id, assignedBy: actorId, reason })
    .onDuplicateKeyUpdate({ set: { revokedAt: null, assignedBy: actorId, reason } });

  if (roleCode === "administrator") {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, targetUserId));
  }

  await logAction({ actorId, action: "role.assign", entityType: "user", entityId: targetUserId, reason, after: { roleCode } });
}

export async function revokeRole(actorId: number, targetUserId: number, roleCode: AssignableRoleCode, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  const [role] = await db.select().from(roles).where(eq(roles.code, roleCode)).limit(1);
  if (!role) throw new Error("Rôle inconnu.");

  await db.update(userRoles).set({ revokedAt: new Date(), reason }).where(and(eq(userRoles.userId, targetUserId), eq(userRoles.roleId, role.id)));

  if (roleCode === "administrator") {
    await db.update(users).set({ role: "user" }).where(eq(users.id, targetUserId));
  }

  await logAction({ actorId, action: "role.revoke", entityType: "user", entityId: targetUserId, reason, before: { roleCode } });
}

export async function listRoleAssignments() {  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      accountStatus: users.accountStatus,
      roleCode: roles.code,
      roleLabel: roles.label,
      assignedAt: userRoles.assignedAt,
    })
    .from(userRoles)
    .innerJoin(users, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(isNull(userRoles.revokedAt));
}
