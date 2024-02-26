import { InferInsertModel, and, between, eq, ne, or } from "drizzle-orm";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { tasks, teamworkTasks } from "~/server/db/schema";
import dayjs from "dayjs";
import { api } from "~/trpc/server";

export const taskRouter = createTRPCRouter({
  getPersonalTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const myTasks = await ctx.db.query.tasks.findFirst({
        with: {
          teamworkTask: true,
        },
        where: and(
          eq(tasks.userId, ctx.session?.user.id),
          eq(tasks.id, input.taskId),
        ),
      });
      return myTasks ?? [];
    }),
  getUserTasks: protectedProcedure
    .input(z.object({ weekOf: z.string(), userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const start = dayjs(input.weekOf).startOf("week").toDate();
      const end = dayjs(input.weekOf).endOf("week").toDate();
      const userTasks = await ctx.db.query.tasks.findMany({
        with: {
          teamworkTask: true,
        },
        where: and(
          eq(tasks.userId, input.userId ?? ctx.session.user.id),
          or(between(tasks.start, start, end), between(tasks.end, start, end)),
        ),
      });
      return userTasks ?? [];
    }),
  createPersonalTask: protectedProcedure
    .input(
      z.object({
        task: createInsertSchema(tasks).omit({
          userId: true,
          id: true,
          activeTimerRunning: true,
        }),
        teamworkTask: createInsertSchema(teamworkTasks)
          .omit({
            id: true,
            taskId: true,
            teamworkTimeEntryId: true,
          })
          .optional(),
        activeTaskTimer: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.activeTaskTimer) {
        //stop all timers
        await api.task.stopActiveTask.mutate();
      }
      const createdTasks = await ctx.db
        .insert(tasks)
        .values({
          ...input.task,
          activeTimerRunning: input.activeTaskTimer,
          userId: ctx.session.user.id,
        })
        .returning({ id: tasks.id });
      const createdTaskId = createdTasks[0]?.id;
      if (createdTaskId) {
        await ctx.db
          .insert(teamworkTasks)
          .values({ ...input.teamworkTask, taskId: createdTaskId });
        const createdTask = await ctx.db.query.tasks.findFirst({
          with: {
            teamworkTask: true,
          },
          where: and(
            eq(tasks.id, createdTaskId),
            eq(tasks.userId, ctx.session.user.id),
          ),
        });
        return { createdTask };
      } else {
        throw "could not create task";
      }
    }),
  updatePersonalTask: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        task: createInsertSchema(tasks).partial().omit({
          userId: true,
          id: true,
          activeTimerRunning: true,
        }),
        teamworkTask: createInsertSchema(teamworkTasks)
          .partial()
          .omit({
            id: true,
            taskId: true,
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingTask = await ctx.db.query.tasks.findFirst({
        with: {
          teamworkTask: true,
        },
        where: and(
          eq(tasks.id, input.id),
          eq(tasks.userId, ctx.session.user.id),
        ),
      });
      if (existingTask) {
        await ctx.db
          .update(tasks)
          .set({ ...input.task })
          .where(
            and(eq(tasks.id, input.id), eq(tasks.userId, ctx.session.user.id)),
          );
        //check if teamwork task exists?
        const existingTeamworkTask = await ctx.db.query.teamworkTasks.findFirst(
          {
            where: eq(teamworkTasks.taskId, input.id),
          },
        );
        if (existingTeamworkTask) {
          if (input.teamworkTask) {
            await ctx.db
              .update(teamworkTasks)
              .set({ ...input.teamworkTask })
              .where(and(eq(teamworkTasks.taskId, input.id)));
          }
        } else {
          await ctx.db
            .insert(teamworkTasks)
            .values({ ...input.teamworkTask, taskId: input.id });
        }
        const updatedTask = await ctx.db.query.tasks.findFirst({
          with: {
            teamworkTask: true,
          },
          where: and(
            eq(tasks.id, input.id),
            eq(tasks.userId, ctx.session.user.id),
          ),
        });
        return { existingTask, updatedTask };
      }
      throw "cannot find task";
    }),
  deletePersonalTask: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingTask = await ctx.db.query.tasks.findFirst({
        with: {
          teamworkTask: true,
        },
        where: and(
          eq(tasks.id, input.id),
          eq(tasks.userId, ctx.session.user.id),
        ),
      });
      if (!existingTask) {
        throw "could not delete task";
      }
      await ctx.db
        .delete(tasks)
        .where(
          and(eq(tasks.id, input.id), eq(tasks.userId, ctx.session.user.id)),
        );
      return { existingTask };
    }),
  stopActiveTask: protectedProcedure
    .input(
      z
        .object({
          endDate: z.date().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(tasks)
        .set({
          activeTimerRunning: false,
          end: input?.endDate ?? new Date(),
        })
        .where(
          and(
            eq(tasks.userId, ctx.session.user.id),
            eq(tasks.activeTimerRunning, true),
          ),
        );
    }),
  getActiveTask: protectedProcedure.query(async ({ ctx }) => {
    const timer = await ctx.db.query.tasks.findFirst({
      with: {
        teamworkTask: true,
      },
      where: and(
        eq(tasks.userId, ctx.session?.user.id),
        eq(tasks.activeTimerRunning, true),
      ),
    });
    return timer ?? null;
  }),
});
