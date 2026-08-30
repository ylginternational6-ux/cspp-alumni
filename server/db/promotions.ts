import { count, eq } from "drizzle-orm";
import { alumniProfiles, promotions } from "../../drizzle/schema";
import { getDb } from "./client";
import { logAction } from "./audit";

export async function listPromotions() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: promotions.id, year: promotions.year, label: promotions.label, isActive: promotions.isActive, memberCount: count(alumniProfiles.userId) })
    .from(promotions)
    .leftJoin(alumniProfiles, eq(alumniProfiles.promotionId, promotions.id))
    .groupBy(promotions.id);
}

export async function createPromotion(actorId: number, input: { year: number; label?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  const [result] = await db.insert(promotions).values({ year: input.year, label: input.label ?? `Promotion ${input.year}` }).$returningId();
  await logAction({ actorId, action: "promotion.create", entityType: "promotion", entityId: result.id, after: input });
  return result.id;
}

export async function setPromotionActive(actorId: number, promotionId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  await db.update(promotions).set({ isActive }).where(eq(promotions.id, promotionId));
  await logAction({ actorId, action: isActive ? "promotion.activate" : "promotion.deactivate", entityType: "promotion", entityId: promotionId });
}
