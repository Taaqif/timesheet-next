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
  EventContentArg,
  type EventApi,
  type EventInput,
} from "@fullcalendar/core";
import {
  type TasksWithTeamworkTaskSelectSchema,
  getCalendarEvents,
  getHoursMinutesTextFromDates,
  CalendarEventType,
} from "~/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  HoverCardPortal,
} from "~/components/ui/hover-card";
import { useCalendarStore } from "~/app/_store";
import { TaskListItem } from "./task-list-item";
import { useDebounceCallback } from "~/lib/hooks/use-debounce-callback";
import {
  useCreateTask,
  useGetTasks,
  useUpdateTask,
} from "~/lib/hooks/use-task-api";
import { type ICalendarViewInfo } from "@pnp/graph/calendars";
import { CalendarEventItem } from "./calendar-event-item";
import { createDuration } from "@fullcalendar/core/internal";

export type CalendarDisplayProps = {
  view?: "timelineDayWorkHours" | "timeGridDay";
};
export const CalendarDisplay = ({
  view = "timeGridDay",
}: CalendarDisplayProps) => {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [businessHours, setBusinessHours] = useState<EventInput>();
  const calendarRef = useRef<FullCalendar>(null);
  const closestEventsAtStart = useRef<EventApi[]>([]);
  const closestEventsAtEnd = useRef<EventApi[]>([]);
  const weekOf = useCalendarStore((s) => s.weekOf);
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const setSelectedEventId = useCalendarStore((s) => s.setSelectedEventId);
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const { data: calendarEvents } = api.outlook.getMyCalendarEvents.useQuery(
    {
      weekOf: weekOf,
    },
    {
      enabled: !!weekOf,
    },
  );
  const { data: schedule } = api.outlook.getMySchedule.useQuery(
    {
      weekOf: weekOf,
    },
    {
      enabled: !!weekOf,
    },
  );
  const { data: personalTasks } = useGetTasks();

  const activeTask = useMemo(
    () => personalTasks?.find((f) => f.activeTimerRunning),
    [personalTasks],
  );

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
    setEventData();
  }, [schedule, personalTasks, calendarEvents]);

  useEffect(() => {
    if (selectedDate) {
      const calendarApi = calendarRef?.current?.getApi();
      const calendarDate = calendarApi?.getDate();
      if (calendarDate && !dayjs(selectedDate).isSame(calendarDate, "day")) {
        calendarApi?.gotoDate(selectedDate);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateTimerEvent();
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [activeTask]);

  const setEventData = () => {
    const { newEvents, businessHours } = getCalendarEvents({
      tasks: personalTasks,
      schedule,
      calendarEvents,
    });
    if (businessHours) {
      setBusinessHours(businessHours);
    }
    setEvents(newEvents);
  };

  const updateTimerEvent = () => {
    const calendarApi = calendarRef.current!.getApi();
    if (activeTask) {
      const timerEvent = calendarApi.getEventById(`TASK_${activeTask?.id}`);
      if (timerEvent) {
        timerEvent.setProp("editable", true);
        timerEvent.moveEnd("00:00:01");
        timerEvent.setProp("editable", false);
      }
    }
  };
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="h-full p-4">
      <FullCalendar
        ref={calendarRef}
        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
        events={events}
        views={{
          timelineDayWorkHours: {
            type: "timeline",
            nowIndicator: true,
          },
        }}
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
  setSelectedEventId: (id: string) => void;
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
  const selectedEventId = useCalendarStore((s) => s.selectedEventId);
  const [open, setOpen] = useState(false);
  const eventRef = useRef<HTMLDivElement>(null);
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

  const isActiveTimer =
    arg.event.extendedProps?.type === CalendarEventType.TIMER;
  const calendarEvent =
    (arg.event.extendedProps.event as ICalendarViewInfo) ?? null;
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
            setSelectedEventId(arg.event.id);
          }}
          onMouseLeave={() => {
            // setSelectedEventId(undefined);
          }}
          onClick={() => {
            onClick();
          }}
        >
          {!!arg.timeText && (
            <div className="fc-event-time">
              <span className="mr-1">{arg.timeText}</span>
              <span>
                (
                {getHoursMinutesTextFromDates(
                  arg.event.start!,
                  arg.event.end!,
                  true,
                  isActiveTimer,
                )}
                )
              </span>
            </div>
          )}
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
          className="min-w-[400px]"
        >
          <div className="">
            {!!arg.event.extendedProps?.task ? (
              <TaskListItem event={arg.event.toPlainObject()} />
            ) : (
              <>
                {!!arg.timeText && (
                  <div className="">
                    <span className="mr-1">{arg.timeText}</span>
                    <span>
                      (
                      {getHoursMinutesTextFromDates(
                        arg.event.start!,
                        arg.event.end!,
                        true,
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
