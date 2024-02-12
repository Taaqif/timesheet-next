import React, { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import { api } from "~/trpc/react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import {
  type EventContentArg,
  type EventApi,
  type EventInput,
  formatRange,
} from "@fullcalendar/core";
import {
  type TasksWithTeamworkTaskSelectSchema,
  getCalendarEvents,
  getHoursMinutesTextFromDates,
  CalendarEventType,
} from "~/lib/utils";
import { useCalendarStore } from "~/app/_store";
import { TaskListItem } from "./task-list-item";
import { useDebounceCallback } from "usehooks-ts";
import {
  useCalendarEventsQuery,
  useCreateTaskMutation,
  useGetTasksQuery,
  useUpdateTaskMutation,
} from "~/lib/hooks/use-task-api";
import { type ICalendarViewInfo } from "@pnp/graph/calendars";
import { CalendarEventItem } from "./calendar-event-item";
import { createDuration } from "@fullcalendar/core/internal";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipPortal,
} from "~/components/ui/tooltip";
import { Clock } from "lucide-react";

export type CalendarDisplayProps = {
  view?: "timelineDayWorkHours" | "timeGridDay";
};
export const CalendarDisplay = ({
  view = "timeGridDay",
}: CalendarDisplayProps) => {
  const calendarRef = useRef<FullCalendar>(null);
  const closestEventsAtStart = useRef<EventApi[]>([]);
  const closestEventsAtEnd = useRef<EventApi[]>([]);
  const weekOf = useCalendarStore((s) => s.weekOf);
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const setSelectedEventId = useCalendarStore((s) => s.setSelectedEventId);
  const updateTask = useUpdateTaskMutation();
  const createTask = useCreateTaskMutation();

  const [isDragging, setIsDragging] = useState(false);

  const { events, businessHours } = useCalendarEventsQuery();

  const debouncedEventResizeCallback = useDebounceCallback(
    (start: Date, end: Date) => {
      if (closestEventsAtEnd.current && closestEventsAtEnd.current.length > 0) {
        closestEventsAtEnd.current.forEach((event) => {
          if (end >= event.end!) {
            return;
          }
          if (event.extendedProps?.type === "TIMER") {
            event.setProp("editable", true);
          }
          event.setStart(end);
          if (event.extendedProps?.type === "TIMER") {
            event.setProp("editable", false);
          }
        });
      }
      if (
        closestEventsAtStart.current &&
        closestEventsAtStart.current.length > 0
      ) {
        closestEventsAtStart.current.forEach((event) => {
          if (start <= event.start!) {
            return;
          }
          event.setEnd(start);
        });
      }
    },
    10,
  );

  useEffect(() => {
    const calendarApi = calendarRef?.current?.getApi();
    const now = dayjs();
    let scrollToTime = now.add(-2, "hours");
    if (now.hour() > 10) {
      scrollToTime = now.add(-4, "hours");
    }
    calendarApi?.scrollToTime(scrollToTime.format("HH:mm:ss"));
  }, [weekOf]);

  useEffect(() => {
    if (selectedDate) {
      const calendarApi = calendarRef?.current?.getApi();
      const calendarDate = calendarApi?.getDate();
      if (calendarDate && !dayjs(selectedDate).isSame(calendarDate, "day")) {
        calendarApi?.gotoDate(selectedDate);
      }
    }
  }, [selectedDate]);

  return (
    <div className="h-full">
      <FullCalendar
        ref={calendarRef}
        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
        events={events}
        views={{
          timelineDayWorkHours: {
            type: "timeline",
            slotDuration: "00:05",
          },
        }}
        eventOrder={["index"]}
        eventOrderStrict
        businessHours={businessHours}
        slotDuration="00:15"
        snapDuration="00:01"
        datesSet={({ view }) => {
          const date = calendarRef?.current?.getApi().getDate();
          if (date) {
            setSelectedDate(date);
          }
        }}
        eventContent={(arg) => {
          return (
            <RenderContent
              arg={arg}
              isDragging={isDragging}
              setSelectedEventId={setSelectedEventId}
              onEventResize={debouncedEventResizeCallback}
              onClick={() => {
                const type =
                  (arg.event.extendedProps?.type as CalendarEventType) ?? "";
                if (
                  arg.event.start &&
                  arg.event.end &&
                  (type === CalendarEventType.CALENDAR_EVENT ||
                    type === CalendarEventType.SCHEDULE)
                ) {
                  createTask.mutate({
                    task: {
                      start: arg.event.start,
                      end: arg.event.end,
                    },
                  });
                }
              }}
            />
          );
        }}
        plugins={[interactionPlugin, timeGridPlugin, resourceTimelinePlugin]}
        nowIndicatorContent={(arg) => {
          if (arg.isAxis) {
            const formatTime = dayjs(arg.date).format("h:mma");
            return <span className="">{formatTime}</span>;
          } else {
          }
        }}
        slotLabelClassNames={(arg) => {
          const isToday = dayjs(arg.view.currentStart).isSame(dayjs(), "day");
          let className = "transition";
          if (isToday) {
            const slotDuration = arg.view.calendar.getOption("slotDuration");
            const duration = createDuration(slotDuration as string);
            const nowTime = dayjs().format("HH:mm");
            const compare = dayjs(`1970-01-01T${nowTime}`);
            if (
              duration &&
              compare.isBetween(
                arg.date,
                dayjs(arg.date).add(duration.milliseconds, "milliseconds"),
                "milliseconds",
                "[]",
              )
            ) {
              className = "transition opacity-0";
            }
          }
          return className;
        }}
        initialView={view}
        height={"100%"}
        selectable
        headerToolbar={false}
        selectMinDistance={5}
        select={async (arg) => {
          const start = arg.start;
          const end = arg.end;
          if (start && end) {
            await createTask.mutateAsync({
              task: {
                start,
                end,
              },
            });

            const calendarApi = calendarRef?.current?.getApi();
            calendarApi?.unselect();
          }
        }}
        eventDurationEditable
        eventResizableFromStart
        eventResizeStart={(e) => {
          const allEvents = e.view.calendar.getEvents();
          const start = e.event.start;
          const end = e.event.end;

          closestEventsAtEnd.current = [];
          allEvents?.forEach((event) => {
            const type = event.extendedProps?.type as string;
            if (type === "TASK" || type === "TIMER") {
              const diffEnd = Math.abs(dayjs(event.start).diff(end, "minute"));
              const diffStart = Math.abs(
                dayjs(event.end).diff(start, "minute"),
              );
              if (diffEnd >= 0 && diffEnd <= 5) {
                closestEventsAtEnd.current.push(event);
              } else if (diffStart >= 0 && diffStart <= 5) {
                closestEventsAtStart.current.push(event);
              }
            }
          });
          setIsDragging(true);
        }}
        eventResize={(arg) => {
          const changedEvents = [
            arg.event,
            ...closestEventsAtStart.current,
            ...closestEventsAtEnd.current,
          ];
          changedEvents.forEach((event) => {
            const task = event.extendedProps?.task as
              | TasksWithTeamworkTaskSelectSchema
              | undefined;
            const start = event.start;
            const end = event.end;
            if (task && start && end) {
              updateTask.mutate({
                id: task.id,
                task: {
                  start,
                  end,
                },
              });
            }
          });
          closestEventsAtEnd.current = [];
          closestEventsAtStart.current = [];
          setIsDragging(false);
        }}
        selectMirror
        nowIndicator
      />
    </div>
  );
};

type RenderContentProps = {
  arg: EventContentArg;
  isDragging: boolean;
  onEventResize: (start: Date, end: Date) => void;
  setSelectedEventId: (id: number) => void;
  onClick: () => void;
};
const RenderContent = ({
  arg,
  isDragging,
  onEventResize,
  setSelectedEventId,
  onClick,
}: RenderContentProps) => {
  if (isDragging && arg.isResizing) {
    const start = arg.event.start;
    const end = arg.event.end;
    if (start && end) {
      onEventResize(start, end);
    }
  }
  const isActiveTimer =
    arg.event.extendedProps?.type === CalendarEventType.TIMER;
  const calendarEvent = arg.event.extendedProps.event as
    | ICalendarViewInfo
    | undefined;
  const task = arg.event.extendedProps?.task as
    | TasksWithTeamworkTaskSelectSchema
    | undefined;
  const [time, setTime] = useState<string>("");
  const [endDate, setEndDate] = useState<Date>(arg.event.end ?? new Date());
  const selectedEventId = useCalendarStore((s) => s.selectedEventId);
  const [open, setOpen] = useState(false);
  const eventRef = useRef<HTMLDivElement>(null);
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
    } else if (arg.event.end) {
      updateEventTimeDisplay(arg.event.end);
    }
  }, [arg.event]);

  const updateEventTimeDisplay = (endDate: Date) => {
    setEndDate(endDate);
    setTime(
      formatRange(arg.event.start!, endDate, {
        hour: "numeric",
        minute: "numeric",
      }),
    );
  };
  // useEffect(() => {
  //   const activeElement = document.activeElement;
  //   const tag = activeElement?.tagName.toLowerCase();
  //   if (tag === "input" || tag === "textarea") {
  //     return;
  //   }
  //   if (selectedEventId === arg.event.id) {
  //     eventRef.current?.scrollIntoView({
  //       behavior: "smooth",
  //     });
  //   }
  // }, [selectedEventId]);

  return (
    <Tooltip
      delayDuration={500}
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          const activeElement = document.activeElement;
          const tag = activeElement?.tagName.toLowerCase();
          if (tag === "input" || tag === "textarea") {
            return;
          }
        }
        setOpen(isOpen);
      }}
    >
      <TooltipTrigger asChild>
        <div
          ref={eventRef}
          className="fc-event-main-frame"
          onMouseEnter={() => {
            if (task?.id) {
              setSelectedEventId(task?.id);
            }
          }}
          onMouseLeave={() => {
            // setSelectedEventId(undefined);
          }}
          onClick={() => {
            onClick();
          }}
        >
          <div className="fc-event-time flex items-center gap-1">
            {task?.teamworkTask.teamworkTimeEntryId && (
              <Clock className="inline h-auto w-3" />
            )}
            {!!arg.timeText && time}
            <span>
              (
              {getHoursMinutesTextFromDates(
                arg.event.start!,
                endDate,
                true,
                isActiveTimer,
              )}
              )
            </span>
          </div>
          <div className="fc-event-title-container">
            <div className="fc-event-title fc-sticky">
              {arg.event.title || <>&nbsp;</>}
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          align="start"
          side="left"
          sideOffset={10}
          className="min-w-[400px] max-w-[500px] p-4"
        >
          <div className="">
            {!!arg.event.extendedProps?.task ? (
              <TaskListItem event={arg.event as EventInput} defaultExpanded />
            ) : (
              <>
                {!!arg.timeText && (
                  <div className="">
                    <span className="mr-1">{time}</span>
                    <span>
                      (
                      {getHoursMinutesTextFromDates(
                        arg.event.start!,
                        endDate,
                        true,
                        isActiveTimer,
                      )}
                      )
                    </span>
                  </div>
                )}
              </>
            )}
            {calendarEvent && (
              <div className="mt-2">
                <CalendarEventItem calendarEvent={calendarEvent} />
              </div>
            )}
          </div>
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
};
