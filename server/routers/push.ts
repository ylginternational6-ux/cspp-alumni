import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { ENV } from "../_core/env";

export const pushRouter = router({
  /** Clé publique VAPID, nécessaire côté client pour s'abonner (PushManager.subscribe). */
  publicKey: protectedProcedure.query(() => ({ publicKey: ENV.vapidPublicKey })),

  /** Cet appareil a-t-il déjà un abonnement actif pour cet utilisateur ? */
  status: protectedProcedure.query(async ({ ctx }) => ({ subscribed: await db.hasPushSubscription(ctx.user.id) })),

  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().min(1).max(500),
        keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await db.savePushSubscription(ctx.user.id, input, ctx.req.headers["user-agent"]);
      return { success: true } as const;
    }),

  unsubscribe: protectedProcedure.input(z.object({ endpoint: z.string().min(1).max(500) })).mutation(async ({ ctx, input }) => {
    await db.removePushSubscription(ctx.user.id, input.endpoint);
    return { success: true } as const;
  }),
});
