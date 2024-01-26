import { postRouter } from "~/server/api/routers/post";
import { createTRPCRouter } from "~/server/api/trpc";
import { timerRouter } from "./routers/timer";
import { outlookRouter } from "./routers/outlook";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  outlook: outlookRouter,
  timer: timerRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
