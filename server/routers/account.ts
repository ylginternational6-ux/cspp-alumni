import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const accountRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => ({ user: ctx.user, ...(await db.getAccountOverview(ctx.user.id)) })),
  myVerification: protectedProcedure.query(({ ctx }) => db.getMyVerification(ctx.user.id)),

  updateProfile: protectedProcedure
    .input(
      z.object({
        headline: z.string().max(180).optional(),
        organization: z.string().max(180).optional(),
        jobTitle: z.string().max(180).optional(),
        location: z.string().max(120).optional(),
        bio: z.string().max(3000).optional(),
        promotionId: z.number().int().positive().optional(),
        directoryVisibility: z.enum(["network", "promotion_only", "private"]).optional(),
        mentorAvailable: z.boolean().optional(),
        mentorTopics: z.array(z.string().max(60)).max(10).optional(),
        avatarStorageKey: z.string().max(512).optional(),
        coverStorageKey: z.string().max(512).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await db.updateProfile(ctx.user.id, input);
      return { success: true } as const;
    }),

  submitVerification: protectedProcedure
    .input(z.object({ documents: z.array(z.object({ storageKey: z.string().min(1).max(512), originalName: z.string().min(1).max(255), mimeType: z.string().min(1).max(100) })).min(1).max(5) }))
    .mutation(async ({ ctx, input }) => ({ requestId: await db.submitVerification(ctx.user.id, input.documents) })),

  // Annuaire : lecture ouverte à tout compte connecté, y compris en attente de vérification.
  directory: protectedProcedure
    .input(z.object({ search: z.string().max(120).optional(), promotionId: z.number().int().positive().optional(), mentorOnly: z.boolean().optional(), cursor: z.number().int().optional(), limit: z.number().int().max(50).optional() }))
    .query(({ ctx, input }) => db.listDirectory(ctx.user.id, input)),

  publicProfile: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).query(({ ctx, input }) => db.getPublicProfile(ctx.user.id, input.userId)),

  promotions: protectedProcedure.query(() => db.listPromotions()),
});
