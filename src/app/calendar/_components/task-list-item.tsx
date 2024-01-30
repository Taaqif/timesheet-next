import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "~/trpc/react";
import { formatRange, type EventInput } from "@fullcalendar/core";
import {
  TasksWithTeamworkTaskSelectSchema,
  getHoursMinutesTextFromDates,
} from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { TeamworkProjectsSelect } from "./teamwork-projects-select";

export type TaskListItemProps = { event: EventInput };
export const TaskListItem = ({ event }: TaskListItemProps) => {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTeamworkTaskId, setSelectedTeamworkTaskId] = useState("");
  const [description, setDescription] = useState("");

  const updateTask = api.task.updatePersonalTask.useMutation();
  const deleteTask = api.task.deletePersonalTask.useMutation();

  const task = useMemo(
    () =>
      event.extendedProps?.task as
        | TasksWithTeamworkTaskSelectSchema
        | undefined,
    [event.extendedProps],
  );
  const time = useMemo(
    () =>
      formatRange(event.start!, event.end!, {
        hour: "numeric",
        minute: "numeric",
      }),
    [event.start, event.end],
  );
  useEffect(() => {
    if (task?.teamworkTask?.teamworkProjectId) {
      setSelectedProjectId(task.teamworkTask.teamworkProjectId);
    }
    if (task?.teamworkTask?.teamworkTaskId) {
      setSelectedTeamworkTaskId(task.teamworkTask.teamworkTaskId);
    }
    if (task?.description) {
      setDescription(task.description);
    }
  }, [task]);
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all @container/event">
      <div className="text-sm text-muted-foreground">
        <span className="mr-1">{time}</span>
        <span>
          ({getHoursMinutesTextFromDates(event.start!, event.end!, true)})
        </span>
      </div>
      <div>{event.title}</div>
      <div className="grid w-full grid-cols-1 gap-4 @md/event:grid-cols-2">
        <div className="grid gap-2">
          <Label>Project</Label>
          <TeamworkProjectsSelect
            projectId={task?.teamworkTask?.teamworkProjectId}
            onChange={(selectedProjectId) => {
              setSelectedProjectId(selectedProjectId);
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label>Task</Label>
          <Input placeholder="Select a task..." />
        </div>
        <div className="col-span-full grid gap-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Add some notes..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
        </div>
        <div className="col-span-full flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (task) {
                updateTask.mutate({
                  id: task.id,
                  task: {
                    ...task,
                    description: description,
                  },
                  teamworkTask: {
                    ...task.teamworkTask,
                    teamworkProjectId:
                      selectedProjectId ?? task.teamworkTask.teamworkProjectId,
                  },
                });
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};
