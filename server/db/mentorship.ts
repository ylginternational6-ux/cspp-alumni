import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { alumniProfiles, mentorshipRequests, users } from "../../drizzle/schema";
import { getDb } from "./client";
import { createNotification } from "./notifications";

export class MentorshipError extends Error {}

export async function listMentors() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ userId: alumniProfiles.userId, name: users.name, headline: alumniProfiles.headline, organization: alumniProfiles.organization, mentorTopics: alumniProfiles.mentorTopics, avatarStorageKey: alumniProfiles.avatarStorageKey })
    .from(alumniProfiles)
    .innerJoin(users, eq(users.id, alumniProfiles.userId))
    .where(and(eq(alumniProfiles.mentorAvailable, true), eq(users.accountStatus, "verified")));
}

export async function requestMentorship(menteeId: number, mentorId: number, input: { topic: string; message?: string }) {
  if (menteeId === mentorId) throw new MentorshipError("Impossible de solliciter un mentorat auprès de vous-même.");
  const db = await getDb();
  if (!db) throw new MentorshipError("Base de données indisponible");
  const [mentorProfile] = await db.select().from(alumniProfiles).where(eq(alumniProfiles.userId, mentorId)).limit(1);
  if (!mentorProfile?.mentorAvailable) throw new MentorshipError("Cet alumni n'est pas disponible comme mentor.");
  const [{ id }] = await db.insert(mentorshipRequests).values({ menteeId, mentorId, topic: input.topic, message: input.message ?? null }).$returningId();
  await createNotification(mentorId, "mentorship_request", "Nouvelle demande de mentorat", input.topic, "/mentorship");
  return id;
}

export async function respondToMentorship(mentorId: number, requestId: number, decision: "accepted" | "declined") {
  const db = await getDb();
  if (!db) throw new MentorshipError("Base de données indisponible");
  const [request] = await db.select().from(mentorshipRequests).where(eq(mentorshipRequests.id, requestId)).limit(1);
  if (!request || request.mentorId !== mentorId) throw new MentorshipError("Cette demande ne vous est pas assignée.");
  await db.update(mentorshipRequests).set({ status: decision, respondedAt: new Date() }).where(eq(mentorshipRequests.id, requestId));
  await createNotification(request.menteeId, "mentorship_response", decision === "accepted" ? "Demande de mentorat acceptée" : "Demande de mentorat refusée", undefined, "/mentorship");
}

export async function cancelMentorshipRequest(userId: number, requestId: number) {
  const db = await getDb();
  if (!db) throw new MentorshipError("Base de données indisponible");
  const [request] = await db.select().from(mentorshipRequests).where(eq(mentorshipRequests.id, requestId)).limit(1);
  if (!request || request.menteeId !== userId) throw new MentorshipError("Vous ne pouvez annuler que vos propres demandes.");
  await db.update(mentorshipRequests).set({ status: "cancelled" }).where(eq(mentorshipRequests.id, requestId));
}

export async function listMyMentorshipAsMentee(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: mentorshipRequests.id, topic: mentorshipRequests.topic, status: mentorshipRequests.status, createdAt: mentorshipRequests.createdAt, mentorName: users.name })
    .from(mentorshipRequests)
    .innerJoin(users, eq(users.id, mentorshipRequests.mentorId))
    .where(eq(mentorshipRequests.menteeId, userId))
    .orderBy(desc(mentorshipRequests.createdAt));
}

export async function listMyMentorshipAsMentor(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: mentorshipRequests.id, topic: mentorshipRequests.topic, message: mentorshipRequests.message, status: mentorshipRequests.status, createdAt: mentorshipRequests.createdAt, menteeName: users.name })
    .from(mentorshipRequests)
    .innerJoin(users, eq(users.id, mentorshipRequests.menteeId))
    .where(eq(mentorshipRequests.mentorId, userId))
    .orderBy(desc(mentorshipRequests.createdAt));
}

/** Vue admin : toutes les demandes de mentorat, tous statuts (référentiel : "G programme, appariements, résolution de litiges"). */
export async function listAllMentorshipForAdmin() {
  const db = await getDb();
  if (!db) return [];
  const mentee = alias(users, "mentee");
  const mentor = alias(users, "mentor");
  return db
    .select({ id: mentorshipRequests.id, topic: mentorshipRequests.topic, status: mentorshipRequests.status, createdAt: mentorshipRequests.createdAt, menteeName: mentee.name, mentorName: mentor.name })
    .from(mentorshipRequests)
    .innerJoin(mentee, eq(mentee.id, mentorshipRequests.menteeId))
    .innerJoin(mentor, eq(mentor.id, mentorshipRequests.mentorId))
    .orderBy(desc(mentorshipRequests.createdAt));
}
