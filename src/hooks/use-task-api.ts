import { useCalendarStore, useLocalIdMappingStore } from "~/app/_store";
import { type Overwrite } from "utility-types";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import { type RouterInputs, type RouterOutputs } from "~/trpc/shared";
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
  const weekOf = useCalendarStore((s) => s.weekOf);
  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.task.deleteTask.useMutation();
  const mutateAsync = async (
    payload: RouterInputs["task"]["deleteTask"],
  ): Promise<RouterOutputs["task"]["deleteTask"]> => {
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
    void utils.task.getUserTasks.invalidate();
    void utils.task.getActiveTask.invalidate();
    toast("Task deleted");
    return result;
  };
  const mutate = (payload: RouterInputs["task"]["deleteTask"]) => {
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

export const useUpdateTaskMutation = () => {
  const utils = api.useUtils();
  const weekOf = useCalendarStore((s) => s.weekOf);
  const { waitForNewLocalIdMapping } = useLocalIdMappingStore();

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.task.updateTask.useMutation({});
  const mutateAsync = async (
    payload: RouterInputs["task"]["updateTask"] & {
      preventInvalidateCache?: boolean;
    },
  ): Promise<RouterOutputs["task"]["updateTask"]> => {
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

    let id = payload.id;
    if (id < -1) {
      const newId = await waitForNewLocalIdMapping("task", payload.id);
      id = +newId;
    }
    const result = await mutateAsyncOrig({ ...payload, id: id });
    const { existingTask, updatedTask } = result;
    if (!payload.preventInvalidateCache) {
      void utils.task.getUserTasks.invalidate();
      void utils.task.getActiveTask.invalidate();
    }
    return result;
  };
  const mutate = (
    payload: RouterInputs["task"]["updateTask"] & {
      preventInvalidateCache?: boolean;
    },
  ) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};

type CreateTaskPayload = Overwrite<
  RouterInputs["task"]["createTask"],
  {
    task: Omit<RouterInputs["task"]["createTask"]["task"], "timezone">;
  }
>;
export const useCreateTaskMutation = () => {
  const utils = api.useUtils();
  const { data: session } = useSession();
  const { generateUniqueLocalId, addLocalIdMapping, updateLocalIdMapping } =
    useLocalIdMappingStore();
  const weekOf = useCalendarStore((s) => s.weekOf);

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.task.createTask.useMutation({});
  const mutateAsync = async (
    payload: CreateTaskPayload,
  ): Promise<RouterOutputs["task"]["createTask"]> => {
    await utils.task.getUserTasks.cancel();
    await utils.task.getActiveTask.cancel();

    const previousTasks = utils.task.getUserTasks.getData();

    const tz = dayjs.tz.guess();

    const localTaskId = generateUniqueLocalId("task") * -1;
    const localTeamworkTaskId = generateUniqueLocalId("teamworkTask") * -1;
    addLocalIdMapping("task", localTaskId);

    const tempTask = {
      id: localTaskId,
      userId: session?.user.id ?? "",
      end: null,
      title: null,
      logTime: null,
      billable: null,
      description: null,
      timezone: tz,
      activeTimerRunning: payload.activeTaskTimer ?? false,
      ...payload.task,
      teamworkTask: {
        taskId: localTeamworkTaskId,
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

    const result = await mutateAsyncOrig({
      ...payload,
      task: {
        ...payload.task,
        timezone: tz,
      },
    });
    const { createdTask } = result;
    if (createdTask?.id) {
      updateLocalIdMapping("task", localTaskId, createdTask.id);
    }
    toast("Task created");
    void utils.task.getUserTasks.invalidate();
    void utils.task.getActiveTask.invalidate();
    return result;
  };
  const mutate = (payload: CreateTaskPayload) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};

type StartTaskPayload = Partial<
  Overwrite<
    RouterInputs["task"]["createTask"],
    {
      task: Omit<RouterInputs["task"]["createTask"]["task"], "start" | "end">;
    }
  >
>;
export const useStartTaskMutation = () => {
  const utils = api.useUtils();
  const weekOf = useCalendarStore((s) => s.weekOf);
  const { generateUniqueLocalId, addLocalIdMapping, updateLocalIdMapping } =
    useLocalIdMappingStore();
  const { data: session } = useSession();
  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.task.createTask.useMutation({});
  const mutateAsync = async (
    payload?: StartTaskPayload,
  ): Promise<RouterOutputs["task"]["createTask"]> => {
    await utils.task.getUserTasks.cancel();
    await utils.task.getActiveTask.cancel();

    const previousTasks = utils.task.getUserTasks.getData();
    const now = new Date();
    const tz = dayjs.tz.guess();
    const localTaskId = generateUniqueLocalId("task") * -1;
    const localTeamworkTaskId = generateUniqueLocalId("teamworkTask") * -1;
    addLocalIdMapping("task", localTaskId);

    const tempActiveTask = {
      id: localTaskId,
      activeTimerRunning: true,
      userId: session?.user.id ?? "",
      title: null,
      logTime: null,
      billable: null,
      description: null,
      timezone: tz,
      ...payload?.task,
      start: now,
      end: null,
      teamworkTask: {
        taskId: localTeamworkTaskId,
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
        timezone: tz,
        start: now,
        end: null,
      },
      activeTaskTimer: true,
    });
    const { createdTask } = result;
    if (createdTask?.id) {
      updateLocalIdMapping("task", localTaskId, createdTask.id);
    }
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

type StopTaskPayload = Omit<RouterInputs["task"]["stopActiveTask"], "timezone">;
export const useStopTaskMutation = () => {
  const utils = api.useUtils();
  const weekOf = useCalendarStore((s) => s.weekOf);
  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.task.stopActiveTask.useMutation({});
  const mutateAsync = async (
    payload?: StopTaskPayload,
  ): Promise<RouterOutputs["task"]["stopActiveTask"]> => {
    await utils.task.getActiveTask.cancel();
    await utils.task.getUserTasks.cancel();

    const previousTasks = utils.task.getUserTasks.getData();

    utils.task.getUserTasks.setData(
      { weekOf: weekOf },
      (oldQueryData) =>
        oldQueryData?.map((q) => {
          if (q.activeTimerRunning) {
            q.end = payload?.endDate ?? new Date();
            q.activeTimerRunning = false;
          }
          return q;
        }) ?? [],
    );

    utils.task.getActiveTask.setData(undefined, () => undefined);

    const tz = dayjs.tz.guess();

    const result = await mutateAsyncOrig({ ...payload, timezone: tz });
    void utils.task.getUserTasks.invalidate();
    void utils.task.getActiveTask.invalidate();
    return result;
  };
  const mutate = (payload?: StopTaskPayload) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
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
  const { data: tasks, isFetched: tasksFetched } = useGetTasksQuery();
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
    api.outlook.getUserSchedule.useQuery(
      {
        weekOf: weekOf,
      },
      {
        enabled: !!weekOf,
      },
    );
  useEffect(() => {
    setEventData();
  }, [schedule, tasks, calendarEvents]);

  const setEventData = () => {
    const { newEvents, businessHours } = getCalendarEvents({
      tasks: tasks,
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
    isFetched: tasksFetched,
  };
};
