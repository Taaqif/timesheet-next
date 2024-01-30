import { and, between, eq, or } from "drizzle-orm";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { tasks, teamworkTasks } from "~/server/db/schema";
import dayjs from "dayjs";

export const taskRouter = createTRPCRouter({
  getPersonalTasks: protectedProcedure
    .input(z.object({ weekOf: z.date() }))
    .query(async ({ ctx, input }) => {
      const start = dayjs(input.weekOf).startOf("week").toDate();
      const end = dayjs(input.weekOf).endOf("week").toDate();
      const myTasks = await ctx.db.query.tasks.findMany({
        with: {
          teamworkTask: true,
        },
        where: and(
          eq(tasks.userId, ctx.session?.user.id),
          or(between(tasks.start, start, end), between(tasks.end, start, end)),
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
        teamworkTask: createInsertSchema(teamworkTasks)
          .omit({
            id: true,
            taskId: true,
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const createdTasks = await ctx.db
        .insert(tasks)
        .values({ ...input.task, userId: ctx.session.user.id })
        .returning();
      const createdTask = createdTasks[0];
      if (createdTask && input.teamworkTask) {
        const createdTeamworkTasks = await ctx.db
          .insert(teamworkTasks)
          .values({ ...input.teamworkTask, taskId: createdTask.id })
          .returning();
        const createdTeamworkTask = createdTeamworkTasks[0];
        if (createdTeamworkTask) {
          return { createdTask, createdTeamworkTask };
        } else {
          return { createdTask };
        }
      } else {
        return { createdTask };
      }
    }),
  updatePersonalTask: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        task: createInsertSchema(tasks).omit({
          userId: true,
          id: true,
        }),
        teamworkTask: createInsertSchema(teamworkTasks)
          .omit({
            id: true,
            taskId: true,
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedTasks = await ctx.db
        .update(tasks)
        .set({ ...input.task })
        .where(
          and(eq(tasks.id, input.id), eq(tasks.userId, ctx.session.user.id)),
        )
        .returning();
      const updatedTask = updatedTasks[0];
      if (updatedTask && input.teamworkTask) {
        //check if teamwork task exists?
        const existingTeamworkTask = await ctx.db.query.teamworkTasks.findFirst(
          {
            where: eq(teamworkTasks.taskId, input.id),
          },
        );
        if (existingTeamworkTask) {
          const updatedTeamWorkTasks = await ctx.db
            .update(teamworkTasks)
            .set({ ...input.teamworkTask })
            .where(and(eq(teamworkTasks.taskId, input.id)))
            .returning();
          const updatedTeamWorkTask = updatedTeamWorkTasks[0];
          if (updatedTeamWorkTask) {
            return { updatedTask, updatedTeamWorkTask };
          } else {
            return { updatedTask };
          }
        } else {
          const updatedTeamWorkTasks = await ctx.db
            .insert(teamworkTasks)
            .values({ ...input.teamworkTask, taskId: input.id })
            .returning();
          const updatedTeamWorkTask = updatedTeamWorkTasks[0];
          if (updatedTeamWorkTask) {
            return { updatedTask, updatedTeamWorkTask };
          } else {
            return { updatedTask };
          }
        }
      }
      return { updatedTask };
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
