import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { formatRange, type EventInput } from "@fullcalendar/core";
import {
  type TasksWithTeamworkTaskSelectSchema,
  getHoursMinutesTextFromDates,
} from "~/lib/utils";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { TeamworkProjectsSelect } from "./teamwork-projects-select";
import { TeamworkTaskSelect } from "./teamwork-task-select";
import { useDeleteTask, useUpdateTask } from "~/lib/hooks/use-task-api";
import dayjs from "dayjs";
import { History } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { useCalendarStore } from "~/app/_store";

export type TaskListItemProps = { event: EventInput };
export const TaskListItem = ({ event }: TaskListItemProps) => {
  const task = event.extendedProps?.task as
    | TasksWithTeamworkTaskSelectSchema
    | undefined;
  const isActiveTimer = event.extendedProps?.type === "TIMER";
  const [time, setTime] = useState<string>("");
  const [endDate, setEndDate] = useState<Date>(event.end as Date);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    task?.teamworkTask?.teamworkProjectId ?? "",
  );
  const [shouldSave, setShouldSave] = useState(false);
  const [hasChange, setHasChange] = useState(false);
  const [hasProjectChange, setHasProjectChange] = useState(false);
  const [hasTaskChange, setHasTaskChange] = useState(false);
  const selectedEventId = useCalendarStore((s) => s.selectedEventId);
  const eventRef = useRef<HTMLDivElement>(null);
  const [selectedTeamworkTaskId, setSelectedTeamworkTaskId] = useState<string>(
    task?.teamworkTask?.teamworkTaskId ?? "",
  );
  const [description, setDescription] = useState("");

  const { data: teamworkProjects, isLoading: teamworkProjectsLoading } =
    api.teamwork.getAllProjects.useQuery();
  const { data: selectedTeamworkTask, isLoading: teamworkTaskLoading } =
    api.teamwork.getTask.useQuery(
      {
        taskId: selectedTeamworkTaskId,
      },
      {
        enabled: !!selectedTeamworkTaskId,
      },
    );
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const selectedProject = useMemo(
    () => teamworkProjects?.find((project) => project.id === selectedProjectId),
    [selectedProjectId, teamworkProjects],
  );

  const updateEventDetails = () => {
    if (task) {
      let title = task.title;
      if (selectedProject && !selectedTeamworkTask) {
        title = `${selectedProject?.company?.name}: ${selectedProject?.name}`;
      } else if (selectedTeamworkTask) {
        title = `${selectedProject?.company?.name}: ${selectedProject?.name} - ${selectedTeamworkTask?.content}`;
      }
      updateTask.mutate({
        id: task.id,
        task: {
          ...task,
          title: title,
          description: description,
        },
        teamworkTask: {
          ...task.teamworkTask,
          teamworkTaskId:
            selectedTeamworkTask?.id ?? task.teamworkTask.teamworkTaskId,
          teamworkProjectId:
            selectedProject?.id ?? task.teamworkTask.teamworkProjectId,
        },
      });
    }
  };
  useEffect(() => {
    if (isActiveTimer) {
      const interval = setInterval(() => {
        const plusOneSecond = dayjs().add(1, "second").toDate();
        updateEventTimeDisplay(plusOneSecond);
      }, 1000);
      updateEventTimeDisplay(new Date());
      return () => {
        clearInterval(interval);
      };
    } else {
      updateEventTimeDisplay(event.end as Date);
    }
  }, [event]);
  const updateEventTimeDisplay = (endDate: Date) => {
    setEndDate(endDate);
    setTime(
      formatRange(event.start!, endDate, {
        hour: "numeric",
        minute: "numeric",
      }),
    );
  };

  useEffect(() => {
    setSelectedProjectId(task?.teamworkTask?.teamworkProjectId ?? "");
    setSelectedTeamworkTaskId(task?.teamworkTask?.teamworkTaskId ?? "");
    setDescription(task?.description ?? "");
  }, [event]);

  useEffect(() => {
    if (selectedEventId === event.id) {
      eventRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [selectedEventId, event]);

  useEffect(() => {
    if (shouldSave === true) {
      if (hasChange === true) {
        let save = true;
        if (hasTaskChange && !selectedTeamworkTask) {
          save = false;
        }
        if (hasProjectChange && !selectedProject) {
          save = false;
        }
        if (save) {
          updateEventDetails();
          setHasChange(false);
          setHasTaskChange(false);
          setHasProjectChange(false);
          setShouldSave(false);
        }
      } else {
        setShouldSave(false);
      }
    }
  }, [
    shouldSave,
    description,
    selectedTeamworkTask,
    selectedProject,
    hasChange,
  ]);

  return (
    <div
      className="flex scroll-m-5 flex-col gap-2 @container/event"
      ref={eventRef}
    >
      <div className="text-sm text-muted-foreground">
        <span className="mr-1 flex items-center gap-1">
          {isActiveTimer && <History className="w-4" />}
          <span>{time}</span>
          <Badge variant="outline" className="text-muted-foreground">
            {getHoursMinutesTextFromDates(
              event.start!,
              endDate,
              true,
              isActiveTimer,
            )}
          </Badge>
        </span>
      </div>
      <div className="mb-2 text-lg">{event.title}</div>
      <div className="grid w-full grid-cols-1 gap-4 @md/event:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground">Project</Label>
          <TeamworkProjectsSelect
            projectId={selectedProjectId}
            onChange={(selectedProject) => {
              setSelectedProjectId(selectedProject?.id ?? "");
              setHasProjectChange(true);
              setSelectedTeamworkTaskId("");
              setHasTaskChange(true);
              setHasChange(true);
              setShouldSave(true);
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground">Task</Label>
          <TeamworkTaskSelect
            projectId={selectedProjectId}
            teamworkTaskId={selectedTeamworkTaskId}
            onChange={(selectedTeamworkTask) => {
              setSelectedTeamworkTaskId(selectedTeamworkTask?.id ?? "");
              setHasChange(true);
              setHasTaskChange(true);
              setShouldSave(true);
            }}
          />
        </div>
        <div className="col-span-full grid gap-2">
          <Label className="text-muted-foreground">Description</Label>
          <Textarea
            placeholder="Add some notes..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setHasChange(true);
            }}
            onBlur={() => {
              setShouldSave(true);
            }}
          />
        </div>
        <div className="col-span-full flex justify-end gap-4">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (task) {
                deleteTask.mutate({
                  id: task.id,
                });
              }
            }}
          >
            Delete
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              updateEventDetails();
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};
