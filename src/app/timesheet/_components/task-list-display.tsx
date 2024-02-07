import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { type EventInput } from "@fullcalendar/core";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  type TasksWithTeamworkTaskSelectSchema,
  cn,
  getCalendarEvents,
} from "~/lib/utils";
import { useCalendarStore } from "~/app/_store";
import { TaskListItem } from "./task-list-item";
import { useGetTasks } from "~/lib/hooks/use-task-api";
import { NotepadText } from "lucide-react";

export type TaskListDisplayProps = {
  //
};
export const TaskListDisplay = ({}: TaskListDisplayProps) => {
  const [calendarEvents, setCalendarEvents] = useState<EventInput[]>([]);
  const [firstScroll, setFirstScroll] = useState(false);
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const { data: personalTasks, isFetched: personalTasksFetched } =
    useGetTasks();
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const selectedEventId = useCalendarStore((s) => s.selectedEventId);

  const selectedCalendarEvents = useMemo(() => {
    return calendarEvents.filter((event) =>
      dayjs(event.start as Date).isSame(dayjs(selectedDate), "day"),
    );
  }, [selectedDate, calendarEvents]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaViewportRef.current) {
        scrollAreaViewportRef.current.scroll({
          top: scrollAreaViewportRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedDate]);

  useEffect(() => {
    setEvents();
  }, [personalTasks]);

  const setEvents = () => {
    const { newEvents } = getCalendarEvents({
      tasks: personalTasks,
    });
    setCalendarEvents(newEvents);
    if (firstScroll === false && newEvents.length > 0) {
      scrollToBottom();
      setFirstScroll(true);
    }
  };

  return (
    <ScrollArea className="w-full" viewportRef={scrollAreaViewportRef}>
      <div className="flex flex-col gap-4 p-4 ">
        {selectedCalendarEvents.map((event, index) => (
          <div
            key={`event_${selectedDate.toISOString()}_${event.id}_${index}`}
            className={cn("rounded-lg border p-3", {
              "shadow-lg":
                selectedEventId ===
                (
                  event?.extendedProps?.task as
                    | TasksWithTeamworkTaskSelectSchema
                    | undefined
                )?.id,
            })}
          >
            <TaskListItem event={event} />
          </div>
        ))}

        {selectedCalendarEvents?.length === 0 && personalTasksFetched && (
          <div className="flex flex-col items-center justify-center gap-5 p-10">
            <h1 className="text-3xl">No Events</h1>
            <NotepadText className="h-20 w-20 text-muted-foreground opacity-60" />
          </div>
        )}
      </div>
    </ScrollArea>
  );
};