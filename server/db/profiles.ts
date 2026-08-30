import { and, eq, like, ne, or } from "drizzle-orm";
import { alumniProfiles, connections, promotions, users } from "../../drizzle/schema";
import { getDb } from "./client";
import { assignRole } from "./roles";
import { verificationRequests } from "../../drizzle/schema";

export async function getAccountOverview(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [profile] = await db.select().from(alumniProfiles).where(eq(alumniProfiles.userId, userId)).limit(1);
  const [request] = await db.select().from(verificationRequests).where(eq(verificationRequests.userId, userId)).limit(1);
  return { profile: profile ?? null, verification: request ?? null };
}

export type UpdateProfileInput = {
  headline?: string;
  organization?: string;
  jobTitle?: string;
  location?: string;
  bio?: string;
  promotionId?: number;
  directoryVisibility?: "network" | "promotion_only" | "private";
  mentorAvailable?: boolean;
  mentorTopics?: string[];
  avatarStorageKey?: string;
};

/**
 * Met à jour le profil. Si l'alumni déclare sa disponibilité mentor, le rôle
 * Mentor est activé immédiatement — mais uniquement pour un compte vérifié
 * (référentiel section 8 : "Activation Mentor" — aucune validation
 * administrative préalable n'est requise, en revanche la vérification
 * d'identité reste un prérequis pour toute interaction).
 */
export async function updateProfile(userId: number, input: UpdateProfileInput) {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  await db.update(alumniProfiles).set(input).where(eq(alumniProfiles.userId, userId));

  if (input.mentorAvailable) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user?.accountStatus === "verified") {
      await assignRole(userId, userId, "mentor", "Disponibilité mentor déclarée par l'alumni lui-même");
    }
  }
}

export type DirectoryFilters = {
  search?: string;
  promotionId?: number;
  mentorOnly?: boolean;
  cursor?: number;
  limit?: number;
};

/**
 * Annuaire : la visibilité ne dépend pas de la validation du compte (tous
 * les alumni, même en attente, peuvent consulter). "network" = visible de
 * tout le réseau ; "promotion_only" = visible seulement de la même
 * promotion ; "private" = jamais listé dans l'annuaire.
 */
export async function listDirectory(viewerId: number, filters: DirectoryFilters) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null as number | null };

  const [viewerProfile] = await db.select({ promotionId: alumniProfiles.promotionId }).from(alumniProfiles).where(eq(alumniProfiles.userId, viewerId)).limit(1);

  const visibilityCondition = or(
    eq(alumniProfiles.directoryVisibility, "network"),
    viewerProfile?.promotionId ? and(eq(alumniProfiles.directoryVisibility, "promotion_only"), eq(alumniProfiles.promotionId, viewerProfile.promotionId)) : undefined,
  );

  const conditions = [visibilityCondition, ne(alumniProfiles.userId, viewerId)];
  if (filters.promotionId) conditions.push(eq(alumniProfiles.promotionId, filters.promotionId));
  if (filters.mentorOnly) conditions.push(eq(alumniProfiles.mentorAvailable, true));
  if (filters.search) conditions.push(or(like(users.name, `%${filters.search}%`), like(alumniProfiles.organization, `%${filters.search}%`), like(alumniProfiles.jobTitle, `%${filters.search}%`)));

  const limit = Math.min(filters.limit ?? 24, 50);
  const rows = await db
    .select({
      userId: alumniProfiles.userId,
      name: users.name,
      accountStatus: users.accountStatus,
      headline: alumniProfiles.headline,
      organization: alumniProfiles.organization,
      jobTitle: alumniProfiles.jobTitle,
      location: alumniProfiles.location,
      avatarStorageKey: alumniProfiles.avatarStorageKey,
      mentorAvailable: alumniProfiles.mentorAvailable,
      promotionYear: promotions.year,
    })
    .from(alumniProfiles)
    .innerJoin(users, eq(alumniProfiles.userId, users.id))
    .leftJoin(promotions, eq(alumniProfiles.promotionId, promotions.id))
    .where(and(...conditions))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? limit : null };
}

/** Profil public d'un alumni, avec le statut de la relation vue par le visiteur. */
export async function getPublicProfile(viewerId: number, targetUserId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({
      userId: alumniProfiles.userId,
      name: users.name,
      accountStatus: users.accountStatus,
      headline: alumniProfiles.headline,
      organization: alumniProfiles.organization,
      jobTitle: alumniProfiles.jobTitle,
      bio: alumniProfiles.bio,
      location: alumniProfiles.location,
      avatarStorageKey: alumniProfiles.avatarStorageKey,
      mentorAvailable: alumniProfiles.mentorAvailable,
      mentorTopics: alumniProfiles.mentorTopics,
      promotionYear: promotions.year,
    })
    .from(alumniProfiles)
    .innerJoin(users, eq(alumniProfiles.userId, users.id))
    .leftJoin(promotions, eq(alumniProfiles.promotionId, promotions.id))
    .where(eq(alumniProfiles.userId, targetUserId))
    .limit(1);
  if (!row) return null;

  const [connection] = await db
    .select()
    .from(connections)
    .where(or(and(eq(connections.userAId, viewerId), eq(connections.userBId, targetUserId)), and(eq(connections.userAId, targetUserId), eq(connections.userBId, viewerId))))
    .limit(1);

  return { ...row, connectionStatus: connection?.status ?? null, isSelf: viewerId === targetUserId };
}
