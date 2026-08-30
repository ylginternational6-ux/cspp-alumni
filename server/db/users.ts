import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { alumniProfiles, promotions, roles, userRoles, users, type InsertUser, type User } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "./client";

const PASSWORD_SALT_ROUNDS = 12;

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return user;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user;
}

/**
 * Crée les objets de base attendus pour tout nouvel alumni : rôles connus,
 * profil vide, attribution du rôle "alumni", et rôle "administrator" si le
 * compte correspond à OWNER_OPEN_ID (amorçage du tout premier administrateur).
 */
export async function ensureCSPPIdentity(user: User) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(roles)
    .values([
      { code: "alumni", label: "Alumni" },
      { code: "mentor", label: "Mentor" },
      { code: "moderator", label: "Modérateur" },
      { code: "administrator", label: "Administrateur" },
    ])
    .onDuplicateKeyUpdate({ set: { label: sql`values(${roles.label})` } });

  await db
    .insert(alumniProfiles)
    .values({ userId: user.id, firstName: user.name?.split(" ")[0] ?? null, lastName: user.name?.split(" ").slice(1).join(" ") ?? null })
    .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

  const [alumniRole] = await db.select().from(roles).where(eq(roles.code, "alumni")).limit(1);
  if (alumniRole) await db.insert(userRoles).values({ userId: user.id, roleId: alumniRole.id }).onDuplicateKeyUpdate({ set: { revokedAt: null } });

  if (user.role === "admin") {
    const [adminRole] = await db.select().from(roles).where(eq(roles.code, "administrator")).limit(1);
    if (adminRole) await db.insert(userRoles).values({ userId: user.id, roleId: adminRole.id, assignedBy: user.id, reason: "Administrateur habilité" }).onDuplicateKeyUpdate({ set: { revokedAt: null } });
  }
}

/** Conserve la compatibilité avec l'ancien flux OAuth Manus (openId externe). */
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    for (const field of textFields) {
      const value = user[field];
      if (value === undefined) continue;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
    const [persistedUser] = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    if (persistedUser) await ensureCSPPIdentity(persistedUser);
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export type PublicUser = Omit<User, "passwordHash">;

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export class AuthError extends Error {}

/**
 * Crée un compte local avec mot de passe (module 3.1 user_accounts). Le
 * statut initial est "pending_verification" : lecture complète du réseau
 * dès la création, interactions ouvertes après vérification administrative
 * (référentiel des rôles, section 2).
 */
export async function registerLocalAccount(input: { email: string; password: string; name: string }): Promise<User> {
  const db = await getDb();
  if (!db) throw new AuthError("Base de données indisponible");

  const email = input.email.toLowerCase().trim();
  const existing = await getUserByEmail(email);
  if (existing) throw new AuthError("Un compte existe déjà avec cet e-mail.");

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
  const openId = `local:${email}`;
  const role = openId === ENV.ownerOpenId ? "admin" : "user";

  await db.insert(users).values({
    openId,
    email,
    name: input.name,
    loginMethod: "password",
    passwordHash,
    role,
    lastSignedIn: new Date(),
  });

  const user = await getUserByOpenId(openId);
  if (!user) throw new AuthError("Impossible de créer le compte.");
  await ensureCSPPIdentity(user);
  return user;
}

/**
 * Vérifie l'e-mail et le mot de passe fournis. Ne révèle jamais si c'est
 * l'e-mail ou le mot de passe qui est invalide (limite l'énumération de
 * comptes), et rejette les comptes suspendus ou désactivés.
 */
export async function loginWithPassword(input: { email: string; password: string }): Promise<User> {
  const user = await getUserByEmail(input.email);
  if (!user || !user.passwordHash) throw new AuthError("Identifiants invalides.");

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new AuthError("Identifiants invalides.");

  if (user.accountStatus === "suspended" || user.accountStatus === "deactivated") {
    throw new AuthError("Ce compte n'est plus autorisé à se connecter. Contactez un administrateur.");
  }

  const db = await getDb();
  if (db) await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

  return user;
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new AuthError("Base de données indisponible");
  const user = await getUserById(userId);
  if (!user?.passwordHash) throw new AuthError("Ce compte n'utilise pas l'authentification par mot de passe.");
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AuthError("Mot de passe actuel incorrect.");
  const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function getActiveRoleCodes(userId: number) {
  const db = await getDb();
  if (!db) return [] as string[];
  const { and, isNull } = await import("drizzle-orm");
  const rows = await db
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), isNull(userRoles.revokedAt)));
  return rows.map((row) => row.code);
}

export type MemberFilters = { search?: string; status?: "verified" | "pending_verification" | "rejected" | "suspended" | "deactivated"; promotionId?: number; limit?: number };

/** Registre complet des membres pour l'administration (au-delà de la seule file de vérification). */
export async function listAllMembers(filters: MemberFilters) {
  const db = await getDb();
  if (!db) return [];
  const { and, like, or } = await import("drizzle-orm");
  const conditions = [];
  if (filters.status) conditions.push(eq(users.accountStatus, filters.status));
  if (filters.promotionId) conditions.push(eq(alumniProfiles.promotionId, filters.promotionId));
  if (filters.search) conditions.push(or(like(users.name, `%${filters.search}%`), like(users.email, `%${filters.search}%`)));

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      accountStatus: users.accountStatus,
      role: users.role,
      createdAt: users.createdAt,
      jobTitle: alumniProfiles.jobTitle,
      organization: alumniProfiles.organization,
      promotionYear: promotions.year,
      avatarStorageKey: alumniProfiles.avatarStorageKey,
    })
    .from(users)
    .leftJoin(alumniProfiles, eq(alumniProfiles.userId, users.id))
    .leftJoin(promotions, eq(alumniProfiles.promotionId, promotions.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(filters.limit ?? 200);
  return rows;
}

/**
 * Suspension réversible (référentiel section 5 : "suspension réversible en premier niveau").
 * Un compte suspendu ne peut plus rien faire, y compris consulter en lecture (bloqué par requireActiveAccount côté serveur).
 */
export async function suspendMember(actorId: number, targetUserId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  await db.update(users).set({ accountStatus: "suspended" }).where(eq(users.id, targetUserId));
  const { logAction } = await import("./audit");
  await logAction({ actorId, action: "member.suspend", entityType: "user", entityId: targetUserId, reason });
  const [member] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, targetUserId)).limit(1);
  if (member?.email) {
    const { sendEmail, emailTemplates } = await import("../email");
    await sendEmail({ to: member.email, ...emailTemplates.memberSuspended(member.name ?? "", reason) });
  }
}

export async function reactivateMember(actorId: number, targetUserId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  await db.update(users).set({ accountStatus: "verified" }).where(eq(users.id, targetUserId));
  const { logAction } = await import("./audit");
  await logAction({ actorId, action: "member.reactivate", entityType: "user", entityId: targetUserId, reason });
}
