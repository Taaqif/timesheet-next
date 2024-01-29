import React, { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction"; // for selectable
import { api } from "~/trpc/react";
import dayjs from "dayjs";
import { type EventInput } from "@fullcalendar/core";
import { getCalendarEvents, getHoursMinutesTextFromDates } from "~/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  HoverCardPortal,
} from "~/components/ui/hover-card";
import { useCalendarStore } from "~/app/_store";
import { Input } from "~/components/ui/input";

export type CalendarDisplayProps = {};
export const CalendarDisplay = ({}: CalendarDisplayProps) => {
  const [calendarEvents, setCalendarEvents] = useState<EventInput[]>([]);
  const [calendarBusinessHours, setBusinessHours] = useState<EventInput>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const calendarRef = useRef<FullCalendar>(null);
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
    const calendarApi = calendarRef?.current?.getApi();
    calendarApi?.scrollToTime(dayjs().add(-2, "hours").format("HH:mm:ss"));
  }, [selectedDate]);

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
    const { newEvents, businessHours } = getCalendarEvents({
      timer: activeTimer,
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
      timerEvent.moveEnd("00:00:01");
    }
  };

  return (
    <div className="h-full p-4">
      <FullCalendar
        ref={calendarRef}
        events={calendarEvents}
        businessHours={calendarBusinessHours}
        slotDuration="00:15"
        snapDuration="00:01"
        eventContent={(arg) => {
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
                <HoverCardContent align="start" side="left" sideOffset={10}>
                  <div>
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
                    <div className="">
                      <div className="">{arg.event.title || <>&nbsp;</>}</div>
                      <div>
                        <Input />
                      </div>
                    </div>
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
        selectMirror
        nowIndicator
      />
    </div>
  );
};
