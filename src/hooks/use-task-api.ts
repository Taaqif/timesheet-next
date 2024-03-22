import { useCalendarStore } from "~/app/_store";
import { type Overwrite } from "utility-types";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import { type TimeEntry } from "~/server/api/routers/teamwork";
import { type RouterInputs, type RouterOutputs } from "~/trpc/shared";
import { type InferSelectModel } from "drizzle-orm";
import { type tasks } from "~/server/db/schema";
import { toast } from "sonner";
import { type EventInput } from "@fullcalendar/core";
import { useEffect, useState } from "react";
import {
  type TasksSelectSchema,
  type TeamworkTasksSelectSchema,
  getCalendarEvents,
} from "~/lib/utils";

export const useDeleteTaskMutation = () => {
  const utils = api.useUtils();
  const deleteTimeEntry = api.teamwork.deleteTimeEntry.useMutation({});
  const weekOf = useCalendarStore((s) => s.weekOf);
  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.task.deletePersonalTask.useMutation();
  const mutateAsync = async (
    payload: RouterInputs["task"]["deletePersonalTask"],
  ): Promise<RouterOutputs["task"]["deletePersonalTask"]> => {
    await utils.task.getUserTasks.cancel();
    await utils.task.getActiveTask.cancel();

    const previousTasks = utils.task.getUserTasks.getData();
    let isActiveTimer = false;

    utils.task.getUserTasks.setData({ weekOf: weekOf }, (oldQueryData) => [
      ...(oldQueryData?.filter((f) => {
        if (f.id === payload.id) {
          isActiveTimer = f.activeTimerRunning ?? false;
          return false;
        }
        return true;
      }) ?? []),
    ]);

    if (isActiveTimer) {
      utils.task.getActiveTask.setData(undefined, () => undefined);
    }

    const result = await mutateAsyncOrig(payload);
    const { existingTask } = result;
    // if (existingTask.teamworkTask?.teamworkTimeEntryId) {
    //   await deleteTimeEntry.mutateAsync({
    //     timeEntryId: existingTask.teamworkTask.teamworkTimeEntryId,
    //   });
    // }
    void utils.task.getUserTasks.invalidate();
    void utils.task.getActiveTask.invalidate();
    toast("Task deleted");
    return result;
  };
  const mutate = (payload: RouterInputs["task"]["deletePersonalTask"]) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};

export const useSessionTeamworkPerson = () => {
  const { data: session, status } = useSession();
  const sessionTeamworkPerson = api.teamwork.getPeopleBySearchTerm.useQuery(
    {
      searchTerm: session?.user.email ?? "",
    },
    {
      enabled: status === "authenticated" && !!session.user.email,
      select(data) {
        return data[0];
      },
    },
  );

  return sessionTeamworkPerson;
};

const getTimeEntry = (
  createdTask: InferSelectModel<typeof tasks>,
  teamworkPersonId: string,
) => {
  const start = dayjs(createdTask.start);
  const end = dayjs(createdTask.end);
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
  return timeEntry;
};

export const useUpdateTaskMutation = () => {
  const utils = api.useUtils();
  const { data: teamworkPerson } = useSessionTeamworkPerson();
  const updateTimeEntry = api.teamwork.updateTimeEntry.useMutation({});
  const createTimeEntry = api.teamwork.createTimeEntryForTask.useMutation({});
  const deleteTimeEntry = api.teamwork.deleteTimeEntry.useMutation({});
  const updateTask = api.task.updatePersonalTask.useMutation({});
  const weekOf = useCalendarStore((s) => s.weekOf);

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.task.updatePersonalTask.useMutation({});
  const mutateAsync = async (
    payload: RouterInputs["task"]["updatePersonalTask"] & {
      ignoreActiveTimer?: boolean;
      preventInvalidateCache?: boolean;
    },
  ): Promise<RouterOutputs["task"]["updatePersonalTask"]> => {
    await utils.task.getUserTasks.cancel();
    await utils.task.getActiveTask.cancel();

    const previousTasks = utils.task.getUserTasks.getData();
    let isActiveTimer: RouterOutputs["task"]["getActiveTask"] = null;

    const updateTaskCache = async ({
      id,
      task: taskCache,
      teamworkTask: teamworkTaskCache,
    }: {
      id?: number;
      task: Partial<TasksSelectSchema>;
      teamworkTask?: Partial<TeamworkTasksSelectSchema>;
    }) => {
      utils.task.getUserTasks.setData({ weekOf: weekOf }, (oldQueryData) => [
        ...(oldQueryData?.map((f) => {
          const idToCheck = id ? id : payload.id;
          if (f.id === idToCheck) {
            f = {
              ...f,
              ...taskCache,
              teamworkTask: {
                ...f.teamworkTask,
                ...teamworkTaskCache,
              },
            };
            if (f.activeTimerRunning) {
              isActiveTimer = f;
            }
          }
          return f;
        }) ?? []),
      ]);
    };
    const taskToSet = { ...payload.task } as TasksSelectSchema;
    if (payload.ignoreActiveTimer) {
      taskToSet.activeTimerRunning = false;
    }
    const teamworkTaskToSet = {
      ...payload.teamworkTask,
    } as TeamworkTasksSelectSchema;
    void updateTaskCache({
      task: taskToSet,
      teamworkTask: teamworkTaskToSet,
    });

    if (isActiveTimer) {
      utils.task.getActiveTask.setData(undefined, () => isActiveTimer);
    }

    const result = await mutateAsyncOrig(payload);
    const { existingTask, updatedTask } = result;
    // const shouldIgnoreProcessTimeEntry =
    //   +(payload.teamworkTask?.teamworkTimeEntryId ?? 0) < 0;
    // let timeEntryDeleted = false;
    // if (!updatedTask?.activeTimerRunning && !shouldIgnoreProcessTimeEntry) {
    //   if (
    //     !updatedTask?.logTime &&
    //     existingTask?.teamworkTask?.teamworkTimeEntryId
    //   ) {
    //     await deleteTimeEntry.mutateAsync({
    //       timeEntryId: existingTask?.teamworkTask.teamworkTimeEntryId,
    //     });
    //     timeEntryDeleted = true;
    //     await updateTask.mutateAsync({
    //       id: payload.id,
    //       task: updatedTask!,
    //       teamworkTask: {
    //         teamworkTimeEntryId: null,
    //       },
    //     });
    //   } else if (updatedTask?.logTime && teamworkPerson?.id) {
    //     const timeEntry = getTimeEntry(updatedTask, teamworkPerson.id);
    //     if (
    //       existingTask.teamworkTask.teamworkTaskId !==
    //         updatedTask?.teamworkTask.teamworkTaskId &&
    //       updatedTask?.teamworkTask.teamworkTimeEntryId
    //     ) {
    //       // delete the time entry if the task has changed
    //       await deleteTimeEntry.mutateAsync({
    //         timeEntryId: updatedTask?.teamworkTask.teamworkTimeEntryId,
    //       });
    //       timeEntryDeleted = true;
    //       await updateTask.mutateAsync({
    //         id: payload.id,
    //         task: updatedTask,
    //         teamworkTask: {
    //           teamworkTimeEntryId: null,
    //         },
    //       });
    //     }
    //
    //     if (
    //       updatedTask?.teamworkTask?.teamworkTimeEntryId &&
    //       timeEntryDeleted === false
    //     ) {
    //       // update time entry
    //       await updateTimeEntry.mutateAsync({
    //         timeEntryId: updatedTask?.teamworkTask?.teamworkTimeEntryId,
    //         timeEntry,
    //       });
    //     } else if (updatedTask?.teamworkTask?.teamworkTaskId) {
    //       // create new time entry
    //       const id = await createTimeEntry.mutateAsync({
    //         taskId: updatedTask?.teamworkTask?.teamworkTaskId,
    //         timeEntry,
    //       });
    //       if (id) {
    //         await updateTask.mutateAsync({
    //           id: updatedTask.id,
    //           task: updatedTask,
    //           teamworkTask: {
    //             teamworkTimeEntryId: id,
    //           },
    //         });
    //       }
    //     }
    //   } else if (
    //     updatedTask?.logTime &&
    //     !updatedTask?.teamworkTask.teamworkTimeEntryId
    //   ) {
    //     await updateTask.mutateAsync({
    //       id: updatedTask.id,
    //       task: { ...updatedTask, logTime: false, billable: false },
    //     });
    //   }
    // }
    if (!payload.preventInvalidateCache) {
      void utils.task.getUserTasks.invalidate();
      void utils.task.getActiveTask.invalidate();
    }
    return result;
  };
  const mutate = (payload: RouterInputs["task"]["updatePersonalTask"]) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};

export const useCreateTaskMutation = () => {
  const utils = api.useUtils();
  const { data: session } = useSession();
  const weekOf = useCalendarStore((s) => s.weekOf);

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.task.createPersonalTask.useMutation({});
  const mutateAsync = async (
    payload: RouterInputs["task"]["createPersonalTask"],
  ): Promise<RouterOutputs["task"]["createPersonalTask"]> => {
    await utils.task.getUserTasks.cancel();
    await utils.task.getActiveTask.cancel();

    const previousTasks = utils.task.getUserTasks.getData();

    const tempTask = {
      id: Math.ceil(Math.random() * -100),
      userId: session?.user.id ?? "",
      end: null,
      title: null,
      logTime: null,
      billable: null,
      description: null,
      activeTimerRunning: payload.activeTaskTimer ?? false,
      ...payload.task,
      teamworkTask: {
        taskId: Math.ceil(Math.random() * -100),
        teamworkTaskId: null,
        teamworkProjectId: null,
        teamworkTimeEntryId: null,
        ...payload.teamworkTask,
      },
    };

    utils.task.getUserTasks.setData({ weekOf: weekOf }, (oldQueryData) => [
      ...(oldQueryData ?? []),
      tempTask,
    ]);
    if (payload.activeTaskTimer) {
      utils.task.getActiveTask.setData(undefined, () => tempTask);
    }

    const result = await mutateAsyncOrig(payload);
    const { createdTask } = result;
    toast("Task created");
    void utils.task.getUserTasks.invalidate();
    void utils.task.getActiveTask.invalidate();
    return result;
  };
  const mutate = (payload: RouterInputs["task"]["createPersonalTask"]) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};

type StartTaskPayload = Partial<
  Overwrite<
    RouterInputs["task"]["createPersonalTask"],
    {
      task: Omit<
        RouterInputs["task"]["createPersonalTask"]["task"],
        "start" | "end"
      >;
    }
  >
>;
export const useStartTaskMutation = () => {
  const utils = api.useUtils();
  const weekOf = useCalendarStore((s) => s.weekOf);
  const { data: session } = useSession();
  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.task.createPersonalTask.useMutation({});
  const mutateAsync = async (
    payload?: StartTaskPayload,
  ): Promise<RouterOutputs["task"]["createPersonalTask"]> => {
    await utils.task.getUserTasks.cancel();
    await utils.task.getActiveTask.cancel();

    const previousTasks = utils.task.getUserTasks.getData();
    const now = new Date();

    const tempActiveTask = {
      id: Math.ceil(Math.random() * -100),
      activeTimerRunning: true,
      userId: session?.user.id ?? "",
      title: null,
      logTime: null,
      billable: null,
      description: null,
      ...payload?.task,
      start: now,
      end: null,
      teamworkTask: {
        taskId: Math.ceil(Math.random() * -100),
        teamworkTaskId: null,
        teamworkProjectId: null,
        teamworkTimeEntryId: null,
      },
    };

    utils.task.getUserTasks.setData({ weekOf: weekOf }, (oldQueryData) => [
      ...(oldQueryData?.map((q) => {
        if (q.activeTimerRunning) {
          q.end = now;
          q.activeTimerRunning = false;
        }
        return q;
      }) ?? []),
      tempActiveTask,
    ]);

    utils.task.getActiveTask.setData(undefined, () => tempActiveTask);

    const result = await mutateAsyncOrig({
      task: {
        ...payload?.task,
        start: now,
        end: null,
      },
      activeTaskTimer: true,
    });
    void utils.task.getUserTasks.invalidate();
    void utils.task.getActiveTask.invalidate();
    return result;
  };
  const mutate = (payload?: StartTaskPayload) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};

export const useStopTaskMutation = () => {
  const utils = api.useUtils();
  const weekOf = useCalendarStore((s) => s.weekOf);
  const stopActiveTask = api.task.stopActiveTask.useMutation({
    onMutate: async (input) => {
      await utils.task.getActiveTask.cancel();
      await utils.task.getUserTasks.cancel();

      const previousTasks = utils.task.getUserTasks.getData();

      utils.task.getUserTasks.setData(
        { weekOf: weekOf },
        (oldQueryData) =>
          oldQueryData?.map((q) => {
            if (q.activeTimerRunning) {
              q.end = input?.endDate ?? new Date();
              q.activeTimerRunning = false;
            }
            return q;
          }) ?? [],
      );

      utils.task.getActiveTask.setData(undefined, () => undefined);

      return { previousTasks };
    },
    onError: (_err, _newTodo, context) => {
      utils.task.getUserTasks.setData(
        { weekOf: weekOf },
        context?.previousTasks,
      );
    },
    onSettled: () => {
      void utils.task.getUserTasks.invalidate();
      void utils.task.getActiveTask.invalidate();
    },
  });

  return stopActiveTask;
};

export const useGetTasksQuery = () => {
  const weekOf = useCalendarStore((s) => s.weekOf);
  const tasks = api.task.getUserTasks.useQuery(
    {
      weekOf: weekOf,
    },
    {
      enabled: !!weekOf,
    },
  );
  return tasks;
};

export const useCalendarEventsQuery = () => {
  const weekOf = useCalendarStore((s) => s.weekOf);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [businessHours, setBusinessHours] = useState<EventInput>();
  const { data: personalTasks, isFetched: personalTasksFetched } =
    useGetTasksQuery();
  const { data: calendarEvents, isFetched: calendarFetched } =
    api.outlook.getMyCalendarEvents.useQuery(
      {
        weekOf: weekOf,
      },
      {
        enabled: !!weekOf,
      },
    );
  const { data: schedule, isFetched: scheduleFetched } =
    api.outlook.getMySchedule.useQuery(
      {
        weekOf: weekOf,
      },
      {
        enabled: !!weekOf,
      },
    );
  useEffect(() => {
    setEventData();
  }, [schedule, personalTasks, calendarEvents]);

  const setEventData = () => {
    const { newEvents, businessHours } = getCalendarEvents({
      tasks: personalTasks,
      schedule,
      calendarEvents,
    });
    if (businessHours) {
      setBusinessHours(businessHours);
    }
    setEvents(newEvents);
  };

  return {
    events,
    businessHours,
    isFetched: personalTasksFetched,
  };
};
