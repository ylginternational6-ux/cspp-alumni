import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, verifiedProcedure } from "../_core/trpc";
import * as db from "../db";
import { EventError } from "../db/events";

function toTrpcError(error: unknown): never {
  if (error instanceof EventError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  throw error;
}

export const eventsRouter = router({
  listPublished: protectedProcedure.query(() => db.listPublishedEvents()),
  mine: verifiedProcedure.query(({ ctx }) => db.listMyEvents(ctx.user.id)),

  create: verifiedProcedure
    .input(
      z.object({
        title: z.string().min(3).max(180),
        description: z.string().min(10).max(4000),
        location: z.string().max(200).optional(),
        isOnline: z.boolean().optional(),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date().optional(),
        capacity: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => ({ eventId: await db.createEvent(ctx.user.id, input) })),

  register: verifiedProcedure.input(z.object({ eventId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try {
      return await db.registerForEvent(ctx.user.id, input.eventId);
    } catch (error) {
      toTrpcError(error);
    }
  }),

  cancelRegistration: verifiedProcedure.input(z.object({ eventId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await db.cancelEventRegistration(ctx.user.id, input.eventId);
    return { success: true } as const;
  }),
});
