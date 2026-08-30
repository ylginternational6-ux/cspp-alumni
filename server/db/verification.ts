import { eq, isNull } from "drizzle-orm";
import { users, verificationDocuments, verificationRequests } from "../../drizzle/schema";
import { getDb } from "./client";
import { logAction } from "./audit";
import { createNotification } from "./notifications";
import { sendEmail, emailTemplates } from "../email";

export async function submitVerification(userId: number, documents: Array<{ storageKey: string; originalName: string; mimeType: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  const [existing] = await db.select().from(verificationRequests).where(eq(verificationRequests.userId, userId)).limit(1);
  const requestId = existing?.id ?? (await db.insert(verificationRequests).values({ userId, status: "submitted" }).$returningId())[0]?.id;
  if (!requestId) throw new Error("Impossible de créer la demande de vérification");
  if (existing) await db.update(verificationRequests).set({ status: "submitted", decisionReason: null, submittedAt: new Date(), reviewedAt: null, reviewedBy: null }).where(eq(verificationRequests.id, requestId));
  if (documents.length) await db.insert(verificationDocuments).values(documents.map((document) => ({ verificationRequestId: requestId, ...document })));
  return requestId;
}

export async function listVerificationQueue() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: verificationRequests.id, userId: users.id, name: users.name, email: users.email, status: verificationRequests.status, submittedAt: verificationRequests.submittedAt })
    .from(verificationRequests)
    .innerJoin(users, eq(verificationRequests.userId, users.id))
    .where(isNull(verificationRequests.reviewedAt));
}

export async function getMyVerification(userId: number) {
  const db = await getDb();
  if (!db) return { request: null, documents: [] };
  const [request] = await db.select().from(verificationRequests).where(eq(verificationRequests.userId, userId)).limit(1);
  if (!request) return { request: null, documents: [] };
  const documents = await db
    .select({ id: verificationDocuments.id, originalName: verificationDocuments.originalName, mimeType: verificationDocuments.mimeType, uploadedAt: verificationDocuments.uploadedAt })
    .from(verificationDocuments)
    .where(eq(verificationDocuments.verificationRequestId, request.id));
  return { request, documents };
}

export async function getVerificationDetail(requestId: number) {
  const db = await getDb();
  if (!db) return null;
  const [request] = await db
    .select({ id: verificationRequests.id, userId: verificationRequests.userId, status: verificationRequests.status, submittedAt: verificationRequests.submittedAt, decisionReason: verificationRequests.decisionReason, name: users.name, email: users.email })
    .from(verificationRequests)
    .innerJoin(users, eq(verificationRequests.userId, users.id))
    .where(eq(verificationRequests.id, requestId))
    .limit(1);
  if (!request) return null;
  const documents = await db.select().from(verificationDocuments).where(eq(verificationDocuments.verificationRequestId, requestId));
  return { request, documents };
}

/**
 * Décision administrative (référentiel section 5) : passage automatique au
 * statut vérifié dès l'approbation, aucune action supplémentaire requise de
 * l'alumni. Toute décision est journalisée et notifiée.
 */
export async function decideVerification(userId: number, reviewerId: number, decision: "approved" | "rejected" | "needs_information", reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  const accountStatus = decision === "approved" ? "verified" : decision === "rejected" ? "rejected" : "pending_verification";

  await db.update(verificationRequests).set({ status: decision, decisionReason: reason ?? null, reviewedBy: reviewerId, reviewedAt: new Date() }).where(eq(verificationRequests.userId, userId));
  await db.update(users).set({ accountStatus, verifiedAt: decision === "approved" ? new Date() : null }).where(eq(users.id, userId));

  await logAction({ actorId: reviewerId, action: "verification.decide", entityType: "user", entityId: userId, reason, after: { decision, accountStatus } });

  const messages: Record<typeof decision, { title: string; body: string }> = {
    approved: { title: "Votre compte est vérifié", body: "Votre badge bleu de certification est actif. Vous pouvez désormais publier, échanger et vous inscrire." },
    rejected: { title: "Votre vérification a été refusée", body: reason ?? "Contactez l'administration pour plus de détails." },
    needs_information: { title: "Complément requis pour votre vérification", body: reason ?? "Merci de compléter vos justificatifs." },
  };
  const notice = messages[decision];
  await createNotification(userId, "verification_decision", notice.title, notice.body, "/settings");

  const [user] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (user?.email) {
    const template =
      decision === "approved"
        ? emailTemplates.verificationApproved(user.name ?? "")
        : decision === "rejected"
          ? emailTemplates.verificationRejected(user.name ?? "", reason)
          : emailTemplates.verificationNeedsInfo(user.name ?? "", reason);
    await sendEmail({ to: user.email, ...template });
  }
}
