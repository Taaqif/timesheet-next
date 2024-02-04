import { useCalendarStore } from "~/app/_store";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import { type TimeEntry } from "~/server/api/routers/teamwork";
import { type RouterInputs, type RouterOutputs } from "~/trpc/shared";
import { type InferSelectModel } from "drizzle-orm";
import { type tasks } from "~/server/db/schema";
import { ex } from "node_modules/@fullcalendar/core/internal-common";
import { toast } from "sonner";

export const useDeleteTask = () => {
  const utils = api.useUtils();
  const deleteTimeEntry = api.teamwork.deleteTimeEntry.useMutation({});
  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.task.deletePersonalTask.useMutation();
  const mutateAsync = async (
    payload: RouterInputs["task"]["deletePersonalTask"],
  ): Promise<RouterOutputs["task"]["deletePersonalTask"]> => {
    const result = await mutateAsyncOrig(payload);
    const { existingTask } = result;
    if (existingTask.teamworkTask?.teamworkTimeEntryId) {
      await deleteTimeEntry.mutateAsync({
        timeEntryId: existingTask.teamworkTask.teamworkTimeEntryId,
      });
    }
    await utils.task.getPersonalTasks.invalidate();
    await utils.task.getActiveTask.invalidate();
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

export const useUpdateTask = () => {
  const utils = api.useUtils();
  const { data: teamworkPerson } = useSessionTeamworkPerson();
  const updateTimeEntry = api.teamwork.updateTimeEntry.useMutation({});
  const createTimeEntry = api.teamwork.createTimeEntryForTask.useMutation({});
  const deleteTimeEntry = api.teamwork.deleteTimeEntry.useMutation({});
  const updateTask = api.task.updatePersonalTask.useMutation({});

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.task.updatePersonalTask.useMutation({});
  const mutateAsync = async (
    payload: RouterInputs["task"]["updatePersonalTask"],
  ): Promise<RouterOutputs["task"]["updatePersonalTask"]> => {
    const result = await mutateAsyncOrig(payload);
    const { existingTask, updatedTask } = result;
    let timeEntryDeleted = false;
    if (!updatedTask?.activeTimerRunning) {
      if (
        !updatedTask?.logTime &&
        existingTask?.teamworkTask?.teamworkTimeEntryId
      ) {
        await deleteTimeEntry.mutateAsync({
          timeEntryId: existingTask?.teamworkTask.teamworkTimeEntryId,
        });
        timeEntryDeleted = true;
        await updateTask.mutateAsync({
          id: payload.id,
          task: { ...updatedTask! },
          teamworkTask: {
            teamworkTimeEntryId: "",
          },
        });
      } else if (updatedTask?.logTime && teamworkPerson?.id) {
        const timeEntry = getTimeEntry(updatedTask, teamworkPerson.id);
        if (
          existingTask.teamworkTask.teamworkTaskId !==
            updatedTask?.teamworkTask.teamworkTaskId &&
          updatedTask?.teamworkTask.teamworkTimeEntryId
        ) {
          // delete the time entry if the task has changed
          await deleteTimeEntry.mutateAsync({
            timeEntryId: updatedTask?.teamworkTask.teamworkTimeEntryId,
          });
          timeEntryDeleted = true;
        }

        if (
          updatedTask?.teamworkTask?.teamworkTimeEntryId &&
          timeEntryDeleted === false
        ) {
          // update time entry
          await updateTimeEntry.mutateAsync({
            timeEntryId: updatedTask?.teamworkTask?.teamworkTimeEntryId,
            timeEntry,
          });
        } else if (updatedTask?.teamworkTask?.teamworkTaskId) {
          // create new time entry
          const id = await createTimeEntry.mutateAsync({
            taskId: updatedTask?.teamworkTask?.teamworkTaskId,
            timeEntry,
          });
          if (id) {
            await updateTask.mutateAsync({
              id: updatedTask.id,
              task: { ...updatedTask },
              teamworkTask: {
                teamworkTimeEntryId: id,
              },
            });
          }
        }
      } else if (
        updatedTask?.logTime &&
        !updatedTask?.teamworkTask.teamworkTimeEntryId
      ) {
        await updateTask.mutateAsync({
          id: updatedTask.id,
          task: { ...updatedTask, logTime: false, billable: false },
        });
      }
    }
    await utils.task.getPersonalTasks.invalidate();
    await utils.task.getActiveTask.invalidate();
    return result;
  };
  const mutate = (payload: RouterInputs["task"]["updatePersonalTask"]) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};

export const useCreateTask = () => {
  const utils = api.useUtils();
  const { data: teamworkPerson } = useSessionTeamworkPerson();
  const createTimeEntry = api.teamwork.createTimeEntryForTask.useMutation({});
  const updateTask = api.task.updatePersonalTask.useMutation({});

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.task.createPersonalTask.useMutation({});
  const mutateAsync = async (
    payload: RouterInputs["task"]["createPersonalTask"],
  ): Promise<RouterOutputs["task"]["createPersonalTask"]> => {
    const result = await mutateAsyncOrig(payload);
    const { createdTask } = result;
    if (
      createdTask?.logTime &&
      teamworkPerson?.id &&
      createdTask?.teamworkTask?.teamworkTaskId
    ) {
      const timeEntry = getTimeEntry(createdTask, teamworkPerson.id);
      const id = await createTimeEntry.mutateAsync({
        taskId: createdTask?.teamworkTask?.teamworkTaskId,
        timeEntry,
      });
      if (id) {
        await updateTask.mutateAsync({
          id: createdTask.id,
          task: { ...createdTask },
          teamworkTask: {
            teamworkTimeEntryId: id,
          },
        });
      }
    }
    toast("Task created");
    await utils.task.getPersonalTasks.invalidate();
    await utils.task.getActiveTask.invalidate();
    return result;
  };
  const mutate = (payload: RouterInputs["task"]["createPersonalTask"]) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};

export const useGetTasks = () => {
  const weekOf = useCalendarStore((s) => s.weekOf);
  const tasks = api.task.getPersonalTasks.useQuery(
    {
      weekOf: weekOf,
    },
    {
      enabled: !!weekOf,
    },
  );
  return tasks;
};
