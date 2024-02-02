import React, {
  ElementRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "~/trpc/react";
import dayjs from "dayjs";
import { type EventInput } from "@fullcalendar/core";
import {
  ScrollArea,
  type ScrollAreaViewport,
} from "~/components/ui/scroll-area";
import { getCalendarEvents } from "~/lib/utils";
import { useCalendarStore } from "~/app/_store";
import { TaskListItem } from "./task-list-item";
import { useGetTasks } from "~/lib/hooks/use-task-api";

export type TaskListDisplayProps = {};
export const TaskListDisplay = ({}: TaskListDisplayProps) => {
  const [calendarEvents, setCalendarEvents] = useState<EventInput[]>([]);
  const weekOf = useCalendarStore((s) => s.weekOf);
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const { data: personalTasks } = useGetTasks();
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      if (scrollAreaViewportRef.current) {
        scrollAreaViewportRef.current.scroll({
          top: scrollAreaViewportRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  }, [selectedDate]);

  useEffect(() => {
    setEvents();
  }, [personalTasks, selectedDate]);

  const setEvents = () => {
    const { newEvents } = getCalendarEvents({
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

  return (
    <ScrollArea className="w-full" viewportRef={scrollAreaViewportRef}>
      <div className="flex flex-col gap-4 p-4 ">
        {calendarEvents.map((event, index) => (
          <div
            key={`event_${selectedDate.toISOString()}_${event.id}_${index}`}
            className="rounded-lg border p-3"
          >
            <TaskListItem event={event} />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
