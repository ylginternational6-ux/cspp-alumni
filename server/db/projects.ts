import { and, eq, or } from "drizzle-orm";
import { projectMembers, projects, users } from "../../drizzle/schema";
import { getDb } from "./client";
import { logAction } from "./audit";

export class ProjectError extends Error {}

export async function createProject(ownerId: number, input: { name: string; description?: string; visibility?: "network" | "promotion_only" | "private" }) {
  const db = await getDb();
  if (!db) throw new ProjectError("Base de données indisponible");
  const [{ id }] = await db.insert(projects).values({ ownerId, ...input }).$returningId();
  await db.insert(projectMembers).values({ projectId: id, userId: ownerId, role: "owner" });
  return id;
}

export async function listProjects(viewerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: projects.id, name: projects.name, description: projects.description, visibility: projects.visibility, status: projects.status, ownerId: projects.ownerId, ownerName: users.name })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.ownerId))
    .where(and(eq(projects.status, "active"), or(eq(projects.visibility, "network"), eq(projects.ownerId, viewerId))));
}

async function assertOwner(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number, projectId: number) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.ownerId !== userId) throw new ProjectError("Seul le créateur peut gérer cet espace.");
  return project;
}

export async function updateProject(userId: number, projectId: number, input: Partial<{ name: string; description: string; visibility: "network" | "promotion_only" | "private" }>) {
  const db = await getDb();
  if (!db) throw new ProjectError("Base de données indisponible");
  await assertOwner(db, userId, projectId);
  await db.update(projects).set(input).where(eq(projects.id, projectId));
}

export async function addProjectMember(userId: number, projectId: number, memberUserId: number) {
  const db = await getDb();
  if (!db) throw new ProjectError("Base de données indisponible");
  await assertOwner(db, userId, projectId);
  await db.insert(projectMembers).values({ projectId, userId: memberUserId, role: "member" }).onDuplicateKeyUpdate({ set: { role: "member" } });
}

export async function removeProjectMember(userId: number, projectId: number, memberUserId: number) {
  const db = await getDb();
  if (!db) throw new ProjectError("Base de données indisponible");
  await assertOwner(db, userId, projectId);
  await db.delete(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, memberUserId)));
}

/** Retrait d'un espace non conforme par un administrateur. */
export async function archiveProjectByAdmin(actorId: number, projectId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new ProjectError("Base de données indisponible");
  await db.update(projects).set({ status: "archived" }).where(eq(projects.id, projectId));
  await logAction({ actorId, action: "project.archive", entityType: "project", entityId: projectId, reason });
}

/** Vue admin complète (tous les espaces, quelle que soit leur visibilité ou leur statut). */
export async function listAllProjectsForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: projects.id, name: projects.name, visibility: projects.visibility, status: projects.status, createdAt: projects.createdAt, ownerName: users.name })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.ownerId));
}
