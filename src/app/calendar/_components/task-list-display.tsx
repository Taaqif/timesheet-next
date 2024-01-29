import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import dayjs from "dayjs";
import { formatRange, type EventInput } from "@fullcalendar/core";
import { ScrollArea } from "~/components/ui/scroll-area";
import { getCalendarEvents, getHoursMinutesTextFromDates } from "~/lib/utils";
import { useCalendarStore } from "~/app/_store";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";

export type TaskListDisplayProps = {};
export const TaskListDisplay = ({}: TaskListDisplayProps) => {
  const [calendarEvents, setCalendarEvents] = useState<EventInput[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const { data: schedule } = api.outlook.getMySchedule.useQuery(
    {
      start: startDate!,
      end: endDate!,
    },
    {
      enabled: !!startDate && !!endDate,
    },
  );
  const { data: activeTimer } = api.timer.getActive.useQuery();
  const { data: personalTasks } = api.task.getPersonalTasks.useQuery(
    {
      start: startDate!,
      end: endDate!,
    },
    {
      enabled: !!startDate && !!endDate,
    },
  );

  useEffect(() => {
    setStartDate(dayjs(selectedDate).startOf("week").toDate());
    setEndDate(dayjs(selectedDate).endOf("week").toDate());
  }, [selectedDate]);

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
        {calendarEvents.map((event, index) => {
          const time = formatRange(event.start!, event.end!, {
            hour: "numeric",
            minute: "numeric",
          });
          return (
            <div
              key={index}
              className="flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all"
            >
              <div className="text-sm text-muted-foreground">
                <span className="mr-1">{time}</span>
                <span>
                  (
                  {getHoursMinutesTextFromDates(event.start!, event.end!, true)}
                  )
                </span>
              </div>
              <div>{event.title}</div>
              <div className="grid w-full grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={`project_${index}`}>Project</Label>
                  <Input
                    id={`project_${index}`}
                    placeholder="Select a project..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`task_${index}`}>Task</Label>
                  <Input id={`task_${index}`} placeholder="Select a task..." />
                </div>
                <div className="col-span-2 grid gap-2">
                  <Label htmlFor={`description_${index}`}>Description</Label>
                  <Textarea
                    id={`description_${index}`}
                    placeholder="Add some notes..."
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button size="sm" variant="outline">
                    Save
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
