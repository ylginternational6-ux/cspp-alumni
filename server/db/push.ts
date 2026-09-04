/**
 * Abonnements aux notifications push (Web Push / VAPID).
 * Un même utilisateur peut être abonné depuis plusieurs appareils/navigateurs ;
 * chaque abonnement est identifié par son `endpoint` (unique).
 */
import { and, eq } from "drizzle-orm";
import { pushSubscriptions } from "../../drizzle/schema";
import { getDb } from "./client";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Enregistre (ou met à jour) l'abonnement push d'un appareil pour cet utilisateur. */
export async function savePushSubscription(userId: number, subscription: PushSubscriptionInput, userAgent?: string) {
  const db = await getDb();
  if (!db) return;
  const { endpoint, keys } = subscription;
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent?.slice(0, 300) })
    .onDuplicateKeyUpdate({ set: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent?.slice(0, 300), lastSeenAt: new Date() } });
}

/** Supprime l'abonnement d'un appareil précis (ex: l'utilisateur désactive les notifications sur ce navigateur). */
export async function removePushSubscription(userId: number, endpoint: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

/** Un abonnement expiré ou révoqué (404/410 côté navigateur) doit être nettoyé, quel que soit son propriétaire. */
export async function removePushSubscriptionByEndpoint(endpoint: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function listPushSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

/** Est-ce que cet utilisateur a au moins un appareil abonné ? Utile pour l'état du bouton dans les réglages. */
export async function hasPushSubscription(userId: number) {
  const rows = await listPushSubscriptions(userId);
  return rows.length > 0;
}
