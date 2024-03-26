import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { ScrollArea } from "~/components/ui/scroll-area";
import { type TasksWithTeamworkTaskSelectSchema, cn } from "~/lib/utils";
import { useCalendarStore } from "~/app/_store";
import { TaskListItem } from "./task-list-item";
import { useCalendarEventsQuery } from "~/hooks/use-task-api";
import { NotepadText } from "lucide-react";
import { EmptyTaskListItem } from "./empty-task-list-item";
import colorString from "color-string";
export type TaskListDisplayProps = {
  //
};
export const TaskListDisplay = ({}: TaskListDisplayProps) => {
  const [firstScroll, setFirstScroll] = useState(false);
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const selectedEventId = useCalendarStore((s) => s.selectedEventId);
  const {
    events,
    businessHours,
    isFetched: calendarEventsFetched,
  } = useCalendarEventsQuery();

  const selectedCalendarEvents = useMemo(() => {
    return events.filter((event) => {
      const hasTask = !!event?.extendedProps?.task;
      return (
        dayjs(event.start as Date).isSame(dayjs(selectedDate), "day") && hasTask
      );
    });
  }, [selectedDate, events]);

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
    if (firstScroll === false && events.length > 0) {
      scrollToBottom();
      setFirstScroll(true);
    }
  }, [events]);
  if (!calendarEventsFetched) {
    return (
      <div className="w-full">
        <div className="flex flex-col gap-4 p-4 ">
          <div className={cn("rounded-lg border p-3")}>
            <EmptyTaskListItem />
          </div>
          <div className={cn("rounded-lg border p-3 opacity-50")}>
            <EmptyTaskListItem />
          </div>
          <div className={cn("rounded-lg border p-3 opacity-30")}>
            <EmptyTaskListItem />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full" viewportRef={scrollAreaViewportRef}>
      <div className="flex flex-col gap-4 p-4 ">
        {selectedCalendarEvents.map((event, index) => {
          const rgbColor = colorString.get.rgb(event.backgroundColor ?? null);
          return (
            <div
              key={`event_${selectedDate.toISOString()}_${index}`}
              className={cn("relative overflow-hidden rounded-lg border p-3", {
                "bg-neutral-300/5 shadow-lg dark:bg-neutral-700/5":
                  selectedEventId ===
                  (
                    event?.extendedProps?.task as
                      | TasksWithTeamworkTaskSelectSchema
                      | undefined
                  )?.id,
              })}
            >
              <TaskListItem
                event={event}
                businessHoursStartTime={businessHours?.startTime as string}
                businessHoursEndTime={businessHours?.endTime as string}
              />
              <div
                style={{
                  background: rgbColor
                    ? `rgba(${rgbColor[0]},${rgbColor[1]},${rgbColor[2]}, 0.5)`
                    : "",
                }}
                className="pointer-events-none absolute right-0 top-[-30px] z-[-1] h-10 w-full rounded-full blur-2xl transition dark:z-auto"
              ></div>
            </div>
          );
        })}

        {selectedCalendarEvents?.length === 0 && calendarEventsFetched && (
          <div className="flex flex-col items-center justify-center gap-5 p-10">
            <h1 className="text-3xl">No Events</h1>
            <NotepadText className="h-20 w-20 text-muted-foreground opacity-60" />
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
