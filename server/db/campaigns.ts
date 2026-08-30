import { desc, eq } from "drizzle-orm";
import { alumniProfiles, campaigns, users } from "../../drizzle/schema";
import { getDb } from "./client";
import { logAction } from "./audit";
import { createNotification } from "./notifications";

export async function listCampaigns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
}

export async function createCampaign(authorId: number, input: { title: string; body: string; segment: "all" | "verified" | "mentors" | "promotion"; promotionId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  const [{ id }] = await db.insert(campaigns).values({ authorId, ...input }).$returningId();
  return id;
}

/** Diffuse la campagne au segment ciblé sous forme de notifications. Action journalisée. */
export async function sendCampaign(actorId: number, campaignId: number) {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign) throw new Error("Campagne introuvable.");
  if (campaign.status === "sent") throw new Error("Cette campagne a déjà été envoyée.");

  let recipients: { id: number }[];
  if (campaign.segment === "all") {
    recipients = await db.select({ id: users.id }).from(users);
  } else if (campaign.segment === "verified") {
    recipients = await db.select({ id: users.id }).from(users).where(eq(users.accountStatus, "verified"));
  } else if (campaign.segment === "mentors") {
    const rows = await db.select({ id: alumniProfiles.userId }).from(alumniProfiles).where(eq(alumniProfiles.mentorAvailable, true));
    recipients = rows.map((r) => ({ id: r.id }));
  } else if (campaign.promotionId) {
    const rows = await db.select({ id: alumniProfiles.userId }).from(alumniProfiles).where(eq(alumniProfiles.promotionId, campaign.promotionId));
    recipients = rows.map((r) => ({ id: r.id }));
  } else {
    recipients = [];
  }

  await Promise.all(recipients.map((recipient) => createNotification(recipient.id, "campaign", campaign.title, campaign.body, "/notifications")));
  await db.update(campaigns).set({ status: "sent", sentAt: new Date() }).where(eq(campaigns.id, campaignId));
  await logAction({ actorId, action: "campaign.send", entityType: "campaign", entityId: campaignId, after: { recipientCount: recipients.length } });
  return { recipientCount: recipients.length };
}
