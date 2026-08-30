import { and, desc, eq, isNull } from "drizzle-orm";
import { notifications } from "../../drizzle/schema";
import { getDb } from "./client";

export async function createNotification(userId: number, type: string, title: string, body?: string, link?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ userId, type, title, body: body ?? null, link: link ?? null });
}

export async function listNotifications(userId: number, onlyUnread = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = onlyUnread ? and(eq(notifications.userId, userId), isNull(notifications.readAt)) : eq(notifications.userId, userId);
  return db.select().from(notifications).where(conditions).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function countUnread(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
