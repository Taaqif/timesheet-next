import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import dayjs from "dayjs";
import { formatRange, type EventInput } from "@fullcalendar/core";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  TasksWithTeamworkTaskSelectSchema,
  getCalendarEvents,
  getHoursMinutesTextFromDates,
} from "~/lib/utils";
import { useCalendarStore } from "~/app/_store";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { TeamworkProjectsSelect } from "./teamwork-projects-select";
import { TaskListItem } from "./task-list-item";

export type TaskListDisplayProps = {};
export const TaskListDisplay = ({}: TaskListDisplayProps) => {
  const [calendarEvents, setCalendarEvents] = useState<EventInput[]>([]);
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const { data: schedule } = api.outlook.getMySchedule.useQuery(
    {
      weekOf: selectedDate,
    },
    {
      enabled: !!selectedDate,
    },
  );
  const { data: activeTimer } = api.timer.getActive.useQuery();
  const updateTask = api.task.updatePersonalTask.useMutation();
  const deleteTask = api.task.deletePersonalTask.useMutation();
  const { data: personalTasks } = api.task.getPersonalTasks.useQuery(
    {
      weekOf: selectedDate,
    },
    {
      enabled: !!selectedDate,
    },
  );

  useEffect(() => {}, [selectedDate]);

  useEffect(() => {
    setEvents();
  }, [activeTimer, personalTasks]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateTimerEvent();
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [activeTimer]);

  const setEvents = () => {
    const { newEvents } = getCalendarEvents({
      timer: activeTimer,
      tasks: personalTasks,
    });
    setCalendarEvents(
      newEvents.filter((event) =>
        dayjs(event.start as unknown as Date).isSame(
          dayjs(selectedDate),
          "day",
        ),
      ),
    );
  };

  const updateTimerEvent = () => {};

  return (
    <ScrollArea className="w-full">
      <div className="flex flex-col gap-4 p-4 ">
        {calendarEvents.map((event, index) => (
          <TaskListItem key={`event_${index}`} event={event} />
        ))}
      </div>
    </ScrollArea>
  );
};
