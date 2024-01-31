import { api } from "~/trpc/react";

export const useUpdateTask = () => {
  const utils = api.useUtils();

  const updateTask = api.task.updatePersonalTask.useMutation({
    async onSuccess() {
      await utils.task.getPersonalTasks.invalidate();
      await utils.task.getActiveTask.invalidate();
    },
  });

  return updateTask;
};

export const useDeleteTask = () => {
  const utils = api.useUtils();

  const deleteTask = api.task.deletePersonalTask.useMutation({
    async onSuccess() {
      await utils.task.getPersonalTasks.invalidate();
      await utils.task.getActiveTask.invalidate();
    },
  });
  return deleteTask;
};

export const useCreateTask = () => {
  const utils = api.useUtils();
  const createTask = api.task.createPersonalTask.useMutation({
    async onSuccess() {
      await utils.task.getPersonalTasks.invalidate();
      await utils.task.getActiveTask.invalidate();
    },
  });
  return createTask;
};
