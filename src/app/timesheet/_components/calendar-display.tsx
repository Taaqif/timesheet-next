import React, { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
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
  getHoursMinutesTextFromDates,
  CalendarEventType,
  findClosestEvent,
} from "~/lib/utils";
import { useCalendarStore } from "~/app/_store";
import { TaskListItem } from "./task-list-item";
import { useDebounceCallback } from "usehooks-ts";
import {
  useCalendarEventsQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "~/hooks/use-task-api";
import { type ICalendarViewInfo } from "@pnp/graph/calendars";
import { CalendarEventItem } from "./calendar-event-item";
import { createDuration } from "@fullcalendar/core/internal";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
  HoverCardPortal,
} from "~/components/ui/hover-card";
import { Clock } from "lucide-react";
import { api } from "~/trpc/react";

export type CalendarDisplayProps = {
  view?: "timelineDayWorkHours" | "timeGridDay";
  date: Date;
};
export const CalendarDisplay = ({
  view = "timeGridDay",
  date,
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
  const { data: activeTask } = api.task.getActiveTask.useQuery();

  const [isDragging, setIsDragging] = useState(false);

  const { events, businessHours } = useCalendarEventsQuery({
    date,
  });

  const debouncedEventResizeCallback = useDebounceCallback(
    (start: Date, end: Date) => {
      if (closestEventsAtEnd.current && closestEventsAtEnd.current.length > 0) {
        closestEventsAtEnd.current.forEach((event) => {
          if (!event) {
            return;
          }
          if (end >= event.end!) {
            return;
          }
          if (event?.extendedProps?.type === CalendarEventType.TIMER) {
            event.setProp("editable", true);
          }
          event.setStart(end);
          if (event?.extendedProps?.type === CalendarEventType.TIMER) {
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
    if (activeTask) {
      const calendarApi = calendarRef?.current?.getApi();
      const activeTaskEvent = calendarApi?.getEventById(
        `TASK_${activeTask?.id}`,
      );
      const interval = setInterval(() => {
        activeTaskEvent?.moveEnd("00:00:01");
      }, 1000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [activeTask]);

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
        dayHeaders={false}
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
        datesSet={({}) => {
          const date = calendarRef?.current?.getApi().getDate();
          if (date) {
            setSelectedDate(date);
          }
        }}
        eventContent={(arg) => {
          return (
            <RenderContent
              arg={arg}
              businessHoursStartTime={businessHours?.startTime as string}
              businessHoursEndTime={businessHours?.endTime as string}
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
                      description: arg.event.title,
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
            const closestScheduleEvent = findClosestEvent({
              events,
              start,
              type: CalendarEventType.CALENDAR_EVENT,
            });
            await createTask.mutateAsync({
              task: {
                start,
                end,
                description: closestScheduleEvent?.title,
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
            const type = event.extendedProps?.type as CalendarEventType;
            if (
              type === CalendarEventType.TASK ||
              type === CalendarEventType.TIMER
            ) {
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
            if (!event) {
              return;
            }
            const task = event.extendedProps?.task as
              | TasksWithTeamworkTaskSelectSchema
              | undefined;
            const start = event.start;
            const end = event.end;
            if (task && start && end) {
              updateTask.mutate({
                id: task.id,
                preventInvalidateCache: true,
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
  businessHoursStartTime: string;
  businessHoursEndTime: string;
  isDragging: boolean;
  onEventResize: (start: Date, end: Date) => void;
  setSelectedEventId: (id: number) => void;
  onClick: () => void;
};
const RenderContent = ({
  arg,
  businessHoursStartTime,
  businessHoursEndTime,
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
    <HoverCard
      openDelay={500}
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
      <HoverCardTrigger asChild>
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
            {+(task?.teamworkTask?.teamworkTimeEntryId ?? 0) > 0 && (
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
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent
          align="start"
          side="left"
          sideOffset={10}
          className="min-w-[400px] max-w-[500px] p-4"
        >
          <div className="">
            {!!arg.event.extendedProps?.task ? (
              <TaskListItem
                event={arg.event as EventInput}
                defaultExpanded
                businessHoursStartTime={businessHoursStartTime}
                businessHoursEndTime={businessHoursEndTime}
              />
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
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
};
