import React, { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction"; // for selectable
import { api } from "~/trpc/react";
import dayjs from "dayjs";
import { EventApi, type EventInput } from "@fullcalendar/core";
import { getCalendarEvents, getHoursMinutesTextFromDates } from "~/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  HoverCardPortal,
} from "~/components/ui/hover-card";
import { useCalendarStore } from "~/app/_store";
import { TaskListItem } from "./task-list-item";
import { useDebounceCallback } from "~/lib/hooks/use-debounce-callback";

export type CalendarDisplayProps = {};
export const CalendarDisplay = ({}: CalendarDisplayProps) => {
  const [calendarEvents, setCalendarEvents] = useState<EventInput[]>([]);
  const [calendarBusinessHours, setBusinessHours] = useState<EventInput>();
  const calendarRef = useRef<FullCalendar>(null);
  const closestEventsAtStart = useRef<EventApi[]>([]);
  const closestEventsAtEnd = useRef<EventApi[]>([]);
  const weekOf = useCalendarStore((s) => s.weekOf);
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const { data: schedule } = api.outlook.getMySchedule.useQuery(
    {
      weekOf: weekOf,
    },
    {
      enabled: !!weekOf,
    },
  );
  const { data: activeTask } = api.task.getActiveTask.useQuery();
  const { data: personalTasks } = api.task.getPersonalTasks.useQuery(
    {
      weekOf: weekOf,
    },
    {
      enabled: !!weekOf,
    },
  );

  const debouncedEventResizeCallback = useDebounceCallback(
    (start: Date, end: Date) => {
      if (closestEventsAtEnd.current && closestEventsAtEnd.current.length > 0) {
        closestEventsAtEnd.current.forEach((event) => {
          event.setStart(end);
        });
      }
      if (
        closestEventsAtStart.current &&
        closestEventsAtStart.current.length > 0
      ) {
        closestEventsAtStart.current.forEach((event) => {
          event.setEnd(start);
        });
      }
    },
    10,
  );

  useEffect(() => {
    const calendarApi = calendarRef?.current?.getApi();
    calendarApi?.scrollToTime(dayjs().add(-2, "hours").format("HH:mm:ss"));
  }, [weekOf]);

  useEffect(() => {
    setEvents();
  }, [schedule, activeTask, personalTasks]);

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

  const setEvents = () => {
    const { newEvents, businessHours } = getCalendarEvents({
      activeTask: activeTask,
      tasks: personalTasks,
      schedule,
    });
    if (businessHours) {
      setBusinessHours(businessHours);
    }
    setCalendarEvents(newEvents);
  };

  const updateTimerEvent = () => {
    const calendarApi = calendarRef.current!.getApi();
    const timerEvent = calendarApi.getEventById("TIMER");
    if (timerEvent) {
      timerEvent.setProp("editable", true);
      timerEvent.moveEnd("00:00:01");
      timerEvent.setProp("editable", false);
    }
  };
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="h-full p-4">
      <FullCalendar
        ref={calendarRef}
        events={calendarEvents}
        businessHours={calendarBusinessHours}
        slotDuration="00:15"
        snapDuration="00:01"
        datesSet={({ view }) => {
          const date = calendarRef?.current?.getApi().getDate();
          if (date) {
            setSelectedDate(date);
          }
        }}
        eventContent={(arg) => {
          if (isDragging && arg.isResizing) {
            const start = arg.event.start;
            const end = arg.event.end;
            if (start && end) {
              debouncedEventResizeCallback(start, end);
            }
          }
          return (
            <HoverCard openDelay={500}>
              <HoverCardTrigger asChild>
                <div className="fc-event-main-frame">
                  {!!arg.timeText && (
                    <div className="fc-event-time">
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
                  </div>
                </HoverCardContent>
              </HoverCardPortal>
            </HoverCard>
          );
        }}
        plugins={[interactionPlugin, timeGridPlugin]}
        initialView="timeGridDay"
        height={"100%"}
        selectable
        eventDurationEditable
        eventResizableFromStart
        eventResizeStart={(e) => {
          const allEvents = e.view.calendar.getEvents();
          const start = e.event.start;
          const end = e.event.end;
          closestEventsAtEnd.current = allEvents?.filter((event) => {
            const diff = Math.abs(dayjs(event.start).diff(end, "minute"));
            return diff >= 0 && diff <= 5;
          });
          closestEventsAtStart.current = allEvents?.filter((event) => {
            const diff = Math.abs(dayjs(event.end).diff(start, "minute"));
            return diff >= 0 && diff <= 5;
          });
          setIsDragging(true);
        }}
        eventResizeStop={() => {
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
