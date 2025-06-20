import { and, between, eq, or } from "drizzle-orm";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { tasks, teamworkTasks, users } from "~/server/db/schema";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import { api } from "~/trpc/server";
import { logger } from "~/logger/server";
import { type TeamworkPerson, type TimeEntry } from "./teamwork";
import {
  TasksWithTeamworkTaskSelectSchema,
  type TasksSelectSchema,
  type TeamworkTasksSelectSchema,
} from "~/lib/utils";
import { getCacheKey, setCacheKey } from "~/server/cache";
import { ex } from "node_modules/@fullcalendar/core/internal-common";

const getTimeEntry = (
  createdTask: Omit<TasksSelectSchema, "id">,
  teamworkPersonId: string,
) => {
  const start = dayjs.tz(createdTask.start, createdTask.timezone);
  const end = dayjs(createdTask.end, createdTask.timezone);
  const minsTotal = end.diff(start, "minute");
  const hours = Math.floor(minsTotal / 60);
  const minutes = minsTotal % 60;
  const timeEntry: TimeEntry = {
    date: start.format("YYYYMMDD"),
    time: start.format("HH:mm"),
    "person-id": teamworkPersonId,
    hours: hours,
    minutes: minutes,
    isbillable: createdTask.billable ?? false,
    description: createdTask.description ?? "",
  };
  // if there is a ticket attached to this task, assign it
  const matchedId = createdTask.title?.match(/#(\d{8})/);
  if (matchedId?.[1]) {
    timeEntry.deskTicketId = +matchedId[1];
  }
  return timeEntry;
};

const processTimeEntry = async ({
  task,
  existingTask,
  teamworkTask,
  email,
}: {
  task: Omit<TasksSelectSchema, "id">;
  existingTask?: Omit<TasksWithTeamworkTaskSelectSchema, "id">;
  teamworkTask?: Omit<TeamworkTasksSelectSchema, "id">;
  email: string;
}) => {
  const taskToUpdate = { ...task };
  const teamWorkTaskToUpdate = {
    teamworkTaskId: null,
    taskId: 0,
    teamworkProjectId: null,
    teamworkTimeEntryId: null,
    ...teamworkTask,
  };
  // Handle time logging
  let timeEntryDeleted = false;
  if (!taskToUpdate?.activeTimerRunning) {
    if (!taskToUpdate?.logTime && teamWorkTaskToUpdate?.teamworkTimeEntryId) {
      await api.teamwork.deleteTimeEntry.mutate({
        timeEntryId: teamWorkTaskToUpdate.teamworkTimeEntryId,
      });
      timeEntryDeleted = true;
      teamWorkTaskToUpdate.teamworkTasId = null;
    } else if (taskToUpdate?.logTime) {
      if (
        (teamWorkTaskToUpdate.teamworkProjectId !==
          existingTask?.teamworkTask?.teamworkProjectId ||
          teamWorkTaskToUpdate.teamworkTaskId !==
            existingTask?.teamworkTask?.teamworkTaskId) &&
        existingTask?.teamworkTask.teamworkTimeEntryId
      ) {
        // delete the time entry if the task/project has changed
        await api.teamwork.deleteTimeEntry.mutate({
          timeEntryId: existingTask?.teamworkTask.teamworkTimeEntryId,
        });
        teamWorkTaskToUpdate.teamworkTaskId = null;
        teamWorkTaskToUpdate.teamworkTimeEntryId = null;
        timeEntryDeleted = true;
      }

      let teamworkPerson = await getCacheKey<TeamworkPerson>(
        `teamworkPerson:${email}`,
      );
      if (!teamworkPerson) {
        const teamworkPeople = await api.teamwork.getPeopleBySearchTerm.query({
          searchTerm: email ?? "",
        });
        if (teamworkPeople?.[0]) {
          teamworkPerson = teamworkPeople[0];
          void setCacheKey(`teamworkPerson:${email}`, teamworkPerson);
        }
      }
      if (teamworkPerson?.id) {
        const timeEntry = getTimeEntry(taskToUpdate, teamworkPerson.id);
        if (
          teamWorkTaskToUpdate?.teamworkTimeEntryId &&
          timeEntryDeleted === false
        ) {
          // update time entry
          await api.teamwork.updateTimeEntry.mutate({
            timeEntryId: teamWorkTaskToUpdate?.teamworkTimeEntryId,
            timeEntry,
          });
        } else if (teamWorkTaskToUpdate?.teamworkTaskId) {
          // create new time entry
          const id = await api.teamwork.createTimeEntryForTask.mutate({
            taskId: teamWorkTaskToUpdate?.teamworkTaskId,
            timeEntry,
          });
          if (id) {
            teamWorkTaskToUpdate.teamworkTimeEntryId = id;
          }
        }
      }
    } else if (
      taskToUpdate?.logTime &&
      !teamWorkTaskToUpdate.teamworkTimeEntryId
    ) {
      taskToUpdate.logTime = false;
      taskToUpdate.billable = false;
    }
  }
  return { taskToUpdate, teamWorkTaskToUpdate };
};

export const taskRouter = createTRPCRouter({
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
  createTask: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
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
      logger.info("creating task", input);
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not create task";
      }
      if (input.activeTaskTimer) {
        logger.info("stopping active task");
        //stop all timers
        await api.task.stopActiveTask.mutate({
          userId: user.id,
          timezone: input.task.timezone!,
        });
      }

      // eslint-disable-next-line
      let taskToCreate: any = {
        ...input.task,
        activeTimerRunning: input.activeTaskTimer ?? false,
        userId: user.id,
      };
      // eslint-disable-next-line
      let teamworkTaskToCreate: any = {
        ...input.teamworkTask,
        activeTimerRunning: input.activeTaskTimer ?? false,
        userId: user.id,
      };
      const { teamWorkTaskToUpdate, taskToUpdate } = await processTimeEntry({
        email: user.email,
        // eslint-disable-next-line
        task: taskToCreate,
        // eslint-disable-next-line
        teamworkTask: teamworkTaskToCreate,
      });
      taskToCreate = taskToUpdate;
      teamworkTaskToCreate = teamWorkTaskToUpdate;
      const createdTasks = await ctx.db
        .insert(tasks)
        // eslint-disable-next-line
        .values({
          ...taskToCreate,
        })
        .returning({ id: tasks.id });
      const createdTaskId = createdTasks[0]?.id;
      if (createdTaskId) {
        await ctx.db
          .insert(teamworkTasks)
          // eslint-disable-next-line
          .values({ ...teamworkTaskToCreate, taskId: createdTaskId });
        const createdTask = await ctx.db.query.tasks.findFirst({
          with: {
            teamworkTask: true,
          },
          where: and(eq(tasks.id, createdTaskId), eq(tasks.userId, user.id)),
        });

        logger.info(`created task`, createdTask);
        return { createdTask };
      } else {
        logger.error(`Could not create task`);
        throw "could not create task";
      }
    }),
  updateTask: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        userId: z.string().optional(),
        task: createInsertSchema(tasks).partial().omit({
          userId: true,
          id: true,
        }),
        teamworkTask: createInsertSchema(teamworkTasks)
          .partial()
          .omit({
            id: true,
            taskId: true,
            teamworkTimeEntryId: true,
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      logger.info("Updating task", input);
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not create task";
      }
      const existingTask = await ctx.db.query.tasks.findFirst({
        with: {
          teamworkTask: true,
        },
        where: and(eq(tasks.id, input.id), eq(tasks.userId, user.id)),
      });
      if (existingTask) {
        let existingTaskToUpdate = { ...existingTask };
        existingTaskToUpdate = {
          ...existingTaskToUpdate,
          ...input.task,
          teamworkTask: {
            ...existingTaskToUpdate.teamworkTask,
            ...input.teamworkTask,
          },
        };
        // Handle time logging
        const { teamWorkTaskToUpdate, taskToUpdate } = await processTimeEntry({
          email: ctx.session?.user.email,
          teamworkTask: existingTaskToUpdate.teamworkTask,
          existingTask,
          task: existingTaskToUpdate,
        });
        existingTaskToUpdate = {
          ...existingTaskToUpdate,
          ...taskToUpdate,
          teamworkTask: teamWorkTaskToUpdate,
        };
        const {
          teamworkTask: teamworkTaskToUpdate,
          ...taskToUpdateFromTimeEntry
        } = existingTaskToUpdate;

        await ctx.db
          .update(tasks)
          .set({ ...taskToUpdateFromTimeEntry })
          .where(and(eq(tasks.id, input.id), eq(tasks.userId, user.id)));

        //check if teamwork task exists?
        const existingTeamworkTask = await ctx.db.query.teamworkTasks.findFirst(
          {
            where: eq(teamworkTasks.taskId, input.id),
          },
        );
        if (existingTeamworkTask) {
          await ctx.db
            .update(teamworkTasks)
            .set({ ...teamworkTaskToUpdate })
            .where(and(eq(teamworkTasks.taskId, input.id)));
        } else {
          await ctx.db
            .insert(teamworkTasks)
            .values({ ...teamworkTaskToUpdate, taskId: input.id });
        }
        const updatedTaskToReturn = await ctx.db.query.tasks.findFirst({
          with: {
            teamworkTask: true,
          },
          where: and(eq(tasks.id, input.id), eq(tasks.userId, user.id)),
        });
        logger.info("Updated task", {
          existingTask: existingTaskToUpdate,
          updatedTask: updatedTaskToReturn,
        });
        return {
          existingTask: existingTaskToUpdate,
          updatedTask: updatedTaskToReturn,
        };
      }
      logger.error(`Could not find task`);
      throw "cannot find task";
    }),
  deleteTask: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not create task";
      }
      const existingTask = await ctx.db.query.tasks.findFirst({
        with: {
          teamworkTask: true,
        },
        where: and(eq(tasks.id, input.id), eq(tasks.userId, user.id)),
      });
      if (!existingTask) {
        logger.error(`Could not find task`);
        throw "could not delete task";
      }
      await ctx.db
        .delete(tasks)
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, user.id)));
      if (existingTask.teamworkTask?.teamworkTimeEntryId) {
        await api.teamwork.deleteTimeEntry.mutate({
          timeEntryId: existingTask.teamworkTask.teamworkTimeEntryId,
        });
      }
      logger.info("deleted task", { existingTask });
      return { existingTask };
    }),
  stopActiveTask: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        endDate: z.date().optional(),
        timezone: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not create task";
      }
      const existingActiveTask = await ctx.db.query.tasks.findFirst({
        with: {
          teamworkTask: true,
        },
        where: and(
          eq(tasks.userId, user.id),
          eq(tasks.activeTimerRunning, true),
        ),
      });
      if (existingActiveTask) {
        await api.task.updateTask.mutate({
          id: existingActiveTask.id,
          task: {
            ...existingActiveTask,
            activeTimerRunning: false,
            end: dayjs
              .tz(input.endDate, input.timezone)
              .set("seconds", 0)
              .toDate(),
          },
        });
      }
      logger.info("stopped active task", { input });
    }),
  getActiveTask: protectedProcedure
    .input(
      z
        .object({
          userId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not create task";
      }
      const timer = await ctx.db.query.tasks.findFirst({
        with: {
          teamworkTask: true,
        },
        where: and(
          eq(tasks.userId, user.id),
          eq(tasks.activeTimerRunning, true),
        ),
      });
      return timer ?? null;
    }),
});
