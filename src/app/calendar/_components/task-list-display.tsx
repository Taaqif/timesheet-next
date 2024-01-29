import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import dayjs from "dayjs";
import { formatRange, type EventInput } from "@fullcalendar/core";
import { ScrollArea } from "~/components/ui/scroll-area";
import { getCalendarEvents } from "~/lib/utils";

export type TaskListDisplayProps = {};
export const TaskListDisplay = ({}: TaskListDisplayProps) => {
  const [calendarEvents, setCalendarEvents] = useState<EventInput[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
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
    setStartDate(dayjs().startOf("week").toDate());
    setEndDate(dayjs().endOf("week").toDate());
  }, []);

  useEffect(() => {
    setEvents();
  }, [schedule, activeTimer, personalTasks]);

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
      schedule,
      tasks: personalTasks,
    });
    setCalendarEvents(newEvents);
  };

  const updateTimerEvent = () => {};

  return (
    <ScrollArea className="w-full">
      <div className="p-4">
        {calendarEvents.map((event, index) => {
          const time = formatRange(event.start, event.end, {
            hour: "numeric",
            minute: "numeric",
          });
          return (
            <div key={index} className="mb-2">
              <div>{time}</div>
              {event.title}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
