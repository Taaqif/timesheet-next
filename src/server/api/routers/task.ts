import { and, between, eq, or } from "drizzle-orm";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { tasks } from "~/server/db/schema";

export const taskRouter = createTRPCRouter({
  getPersonalTasks: protectedProcedure
    .input(z.object({ start: z.date(), end: z.date() }))
    .query(async ({ ctx, input }) => {
      const myTasks = await ctx.db.query.tasks.findMany({
        where: and(
          eq(tasks.userId, ctx.session?.user.id),
          or(
            between(tasks.start, input.start, input.end),
            between(tasks.end, input.start, input.end),
          ),
        ),
      });
      return myTasks ?? [];
    }),
  createPersonalTask: protectedProcedure
    .input(
      z.object({
        task: createInsertSchema(tasks).omit({
          userId: true,
          id: true,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const createdTask = await ctx.db
        .insert(tasks)
        .values({ ...input.task, userId: ctx.session.user.id })
        .returning();
      return createdTask;
    }),
  updatePersonalTask: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        task: createInsertSchema(tasks).omit({
          userId: true,
          id: true,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedTask = await ctx.db
        .update(tasks)
        .set({ ...input.task })
        .where(
          and(eq(tasks.id, input.id), eq(tasks.userId, ctx.session.user.id)),
        )
        .returning();
      return updatedTask;
    }),
  deletePersonalTask: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(tasks)
        .where(
          and(eq(tasks.id, input.id), eq(tasks.userId, ctx.session.user.id)),
        );
      return true;
    }),
});
