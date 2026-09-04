import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { accountRouter } from "./routers/account";
import { adminRouter } from "./routers/admin";
import { authRouter } from "./routers/auth";
import { eventsRouter } from "./routers/events";
import { feedRouter } from "./routers/feed";
import { mentorshipRouter } from "./routers/mentorship";
import { messagingRouter } from "./routers/messaging";
import { networkRouter } from "./routers/network";
import { notificationsRouter } from "./routers/notifications";
import { opportunitiesRouter } from "./routers/opportunities";
import { projectsRouter } from "./routers/projects";
import { pushRouter } from "./routers/push";
import { reportsRouter } from "./routers/reports";
import { savedRouter } from "./routers/saved";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: authRouter,
  account: accountRouter,
  network: networkRouter,
  messaging: messagingRouter,
  feed: feedRouter,
  opportunities: opportunitiesRouter,
  events: eventsRouter,
  mentorship: mentorshipRouter,
  projects: projectsRouter,
  notifications: notificationsRouter,
  push: pushRouter,
  reports: reportsRouter,
  saved: savedRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
