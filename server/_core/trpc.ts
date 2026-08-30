import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { requireActiveAccount, requireVerifiedAccount } from "../permissions";
import { getActiveRoleCodes } from "../db";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Un compte suspendu ou désactivé ne doit plus pouvoir agir, même les
  // actions normalement ouvertes en lecture (référentiel section 6).
  requireActiveAccount(ctx.user.accountStatus);

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const verifiedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  requireVerifiedAccount(ctx.user.accountStatus);
  return next({ ctx });
});

const roleProcedure = (allowed: string[]) => protectedProcedure.use(async ({ ctx, next }) => {
  const codes = await getActiveRoleCodes(ctx.user.id);
  if (!codes.some(code => allowed.includes(code)) && !(allowed.includes("administrator") && ctx.user.role === "admin")) throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  return next({ ctx });
});

export const moderatorProcedure = roleProcedure(["moderator", "administrator"]);
export const mentorProcedure = roleProcedure(["mentor", "administrator"]);

export const adminProcedure = roleProcedure(["administrator"]);
