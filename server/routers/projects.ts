import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, verifiedProcedure } from "../_core/trpc";
import * as db from "../db";
import { ProjectError } from "../db/projects";

function toTrpcError(error: unknown): never {
  if (error instanceof ProjectError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  throw error;
}

export const projectsRouter = router({
  list: protectedProcedure.query(({ ctx }) => db.listProjects(ctx.user.id)),

  create: verifiedProcedure
    .input(z.object({ name: z.string().min(2).max(160), description: z.string().max(2000).optional(), visibility: z.enum(["network", "promotion_only", "private"]).optional() }))
    .mutation(async ({ ctx, input }) => ({ projectId: await db.createProject(ctx.user.id, input) })),

  update: verifiedProcedure
    .input(z.object({ projectId: z.number().int().positive(), name: z.string().min(2).max(160).optional(), description: z.string().max(2000).optional(), visibility: z.enum(["network", "promotion_only", "private"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { projectId, ...rest } = input;
      try {
        await db.updateProject(ctx.user.id, projectId, rest);
        return { success: true } as const;
      } catch (error) {
        toTrpcError(error);
      }
    }),

  addMember: verifiedProcedure.input(z.object({ projectId: z.number().int().positive(), userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try {
      await db.addProjectMember(ctx.user.id, input.projectId, input.userId);
      return { success: true } as const;
    } catch (error) {
      toTrpcError(error);
    }
  }),

  removeMember: verifiedProcedure.input(z.object({ projectId: z.number().int().positive(), userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try {
      await db.removeProjectMember(ctx.user.id, input.projectId, input.userId);
      return { success: true } as const;
    } catch (error) {
      toTrpcError(error);
    }
  }),
});
