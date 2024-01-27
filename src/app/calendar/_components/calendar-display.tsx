import React, { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction"; // for selectable
import { api } from "~/trpc/react";
import dayjs from "dayjs";
import { type EventInput } from "@fullcalendar/core";

const weekMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export type CalendarDisplayProps = {};
export const CalendarDisplay = ({}: CalendarDisplayProps) => {
  const [calendarEvents, setCalendarEvents] = useState<EventInput[]>([]);
  const [calendarBusinessHours, setBusinessHours] = useState<EventInput>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const calendarRef = useRef<FullCalendar>(null);
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

  useEffect(() => {
    setStartDate(dayjs().startOf("week").toDate());
    setEndDate(dayjs().endOf("week").toDate());
  }, []);

  useEffect(() => {
    setEvents();
  }, [schedule, activeTimer]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateTimerEvent();
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [activeTimer]);

  const setEvents = () => {
    let newEvents: EventInput[] = [];
    if (schedule) {
      schedule.forEach((schedule) => {
        const daysOfWeek = schedule.workingHours.daysOfWeek.map(
          (day) => weekMap[day],
        );
        const businessHours = {
          daysOfWeek,
          startTime: schedule.workingHours.startTime,
          endTime: schedule.workingHours.endTime,
        };
        setBusinessHours(businessHours);
        newEvents = newEvents.concat(
          schedule.scheduleItems.map((scheduleItem) => {
            const mappedEvent: EventInput = {
              extendedProps: {
                type: "MEETING",
              },
              backgroundColor: "#e07a5f",
              start: `${scheduleItem.start.dateTime}Z`,
              end: `${scheduleItem.end.dateTime}Z`,
              title: scheduleItem.subject
                ? scheduleItem.subject
                : scheduleItem.status,
            };
            return mappedEvent;
          }),
        );
      });
    }
    if (activeTimer) {
      const now = new Date();
      newEvents.push({
        extendedProps: {
          type: "TIMER",
        },
        id: "TIMER",
        backgroundColor: "#f2cc8f",
        textColor: "black",
        start: activeTimer.startedAt,
        end: now,
      });
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
