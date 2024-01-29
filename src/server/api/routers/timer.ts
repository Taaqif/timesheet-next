import dayjs from "dayjs";
import { InferInsertModel, and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { timers } from "~/server/db/schema";

export const timerRouter = createTRPCRouter({
  start: protectedProcedure
    .input(z.object({ id: z.number().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      let timer: InferInsertModel<typeof timers> | null = null;
      await ctx.db
        .update(timers)
        .set({
          active: false,
        })
        .where(eq(timers.userId, ctx.session.user.id));
      if (input?.id && input.id > 0) {
        const timerUpdated = await ctx.db
          .update(timers)
          .set({
            startedAt: new Date(),
            active: true,
          })
          .where(
            and(
              eq(timers.id, input.id),
              eq(timers.userId, ctx.session.user.id),
            ),
          )
          .returning();
        timer = timerUpdated[0] ?? null;
      } else {
        const timerInsert = await ctx.db
          .insert(timers)
          .values({
            userId: ctx.session.user.id,
            startedAt: new Date(),
            active: true,
          })
          .returning();
        timer = timerInsert[0] ?? null;
      }
      return timer;
    }),

  stop: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(timers)
        .where(
          and(eq(timers.id, input.id), eq(timers.userId, ctx.session.user.id)),
        );
      return true;
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
      return true;
    }),

  getActive: protectedProcedure.query(async ({ ctx }) => {
    const timer = await ctx.db.query.timers.findFirst({
      where: and(
        eq(timers.userId, ctx.session?.user.id),
        eq(timers.active, true),
      ),
    });
    return timer ?? null;
  }),
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.timers.findMany({
      where: eq(timers.userId, ctx.session?.user.id),
    });
  }),
});
