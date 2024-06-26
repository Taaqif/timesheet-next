import { createTRPCRouter } from "~/server/api/trpc";
import { outlookRouter } from "./routers/outlook";
import { taskRouter } from "./routers/task";
import { teamworkRouter } from "./routers/teamwork";
import { todoRouter } from "./routers/todo";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  outlook: outlookRouter,
  task: taskRouter,
  teamwork: teamworkRouter,
  todo: todoRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
