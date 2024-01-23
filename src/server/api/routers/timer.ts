import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { timers } from "~/server/db/schema";

export const timerRouter = createTRPCRouter({
  start: protectedProcedure
    .input(z.object({ id: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id && input.id > 0) {
        await ctx.db
          .update(timers)
          .set({
            startedAt: new Date(),
          })
          .where(
            and(
              eq(timers.id, input.id),
              eq(timers.userId, ctx.session.user.id),
            ),
          );
      } else {
        await ctx.db.insert(timers).values({
          userId: ctx.session.user.id,
          startedAt: new Date(),
        });
      }
    }),

  stop: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(timers)
        .where(
          and(eq(timers.id, input.id), eq(timers.userId, ctx.session.user.id)),
        );
    }),

  pause: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(timers)
        .set({
          startedAt: new Date(),
        })
        .where(
          and(eq(timers.id, input.id), eq(timers.userId, ctx.session.user.id)),
        );
    }),

  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.timers.findMany({
      where: eq(timers.userId, ctx.session?.user.id),
    });
  }),
});
