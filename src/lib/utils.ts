import { type ClassValue, clsx } from "clsx";
import dayjs from "dayjs";
import { type InferSelectModel } from "drizzle-orm";
import { twMerge } from "tailwind-merge";
import { type CalendarScheduleItemType } from "./pnp/getSchedule";
import { type DateInput, type EventInput } from "@fullcalendar/core/index.js";
import { type InferResultType } from "~/server/db";
import { type ICalendarViewInfo } from "@pnp/graph/calendars";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getHoursMinutesTextFromDates = (
  start: Date | string | DateInput,
  end: Date | string | DateInput,
  condensed = false,
  includeSeconds = false,
) => {
  try {
    const ds = dayjs(end as Date);
    const secTotal = ds.diff(start as Date, "second");
    return getHoursMinutesSecondsTextFromSeconds(
      secTotal,
      condensed,
      includeSeconds,
    );
  } catch (error) {
    return `N/A`;
  }
};

export const getHoursMinutesSecondsTextFromSeconds = (
  totalSeconds: number,
  condensed = false,
  includeSeconds = false,
) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const display = [];
  if (hours > 0) {
    display.push(`${hours}${condensed ? "h" : " hours"}`);
  }
  if (minutes > 0) {
    display.push(`${minutes}${condensed ? "m" : " minutes"}`);
  }
  if (includeSeconds) {
    if (totalSeconds === 0 || seconds > 0) {
      display.push(`${seconds}${condensed ? "s" : " seconds"}`);
    }
  }
  return display.join(condensed ? " " : " and ");
};

export const getHoursMinutesTextFromMinutes = (
  totalMinutes: number,
  condensed = false,
) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const display = [];
  if (hours > 0) {
    display.push(`${hours}${condensed ? "h" : " hours"}`);
  }
  if (minutes > 0) {
    display.push(`${minutes}${condensed ? "m" : " minutes"}`);
  }
  return display.join(condensed ? " " : " and ");
};

const weekMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};
export type TimerSelectSchema = InferSelectModel<typeof timersSchema>;
export type TasksWithTeamworkTaskSelectSchema = InferResultType<
  "tasks",
  { teamworkTask: true }
>;
export enum CalendarEventType {
  "SCHEDULE" = "SCHEDULE",
  "CALENDAR_EVENT" = "CALENDAR_EVENT",
  "TASK" = "TASK",
  "TIMER" = "TIMER",
}
export const getCalendarEvents = ({
  tasks,
  schedule,
  calendarEvents,
}: {
  tasks?: TasksWithTeamworkTaskSelectSchema[] | null;
  schedule?: CalendarScheduleItemType[] | null;
  calendarEvents?: ICalendarViewInfo[] | null;
}) => {
  let newEvents: EventInput[] = [];
  let businessHours: EventInput | null = null;
  if (schedule) {
    schedule.forEach((schedule) => {
      const daysOfWeek = schedule.workingHours.daysOfWeek.map(
        (day) => weekMap[day],
      );
      businessHours = {
        daysOfWeek,
        startTime: schedule.workingHours.startTime,
        endTime: schedule.workingHours.endTime,
      };

      if (!calendarEvents) {
        newEvents = newEvents.concat(
          schedule.scheduleItems.map((scheduleItem) => {
            const mappedEvent: EventInput = {
              extendedProps: {
                type: CalendarEventType.SCHEDULE,
              },
              backgroundColor: "#e07a5f",
              start: `${scheduleItem.start.dateTime}Z`,
              editable: false,
              end: `${scheduleItem.end.dateTime}Z`,
              title: scheduleItem.subject
                ? scheduleItem.subject
                : scheduleItem.status,
            };
            return mappedEvent;
          }),
        );
      }
    });
  }
  if (calendarEvents) {
    newEvents = newEvents.concat(
      calendarEvents.map((event) => {
        const mappedEvent: EventInput = {
          extendedProps: {
            type: CalendarEventType.CALENDAR_EVENT,
            event: event,
          },
          backgroundColor: "#e07a5f",
          start: `${event.start?.dateTime}Z`,
          editable: false,
          end: event.end ? `${event.end.dateTime}Z` : undefined,
          title: event.subject ?? "",
        };
        return mappedEvent;
      }),
    );
  }
  if (tasks) {
    newEvents = newEvents.concat(
      tasks.map((task) => {
        const mappedEvent: EventInput = {
          id: `TASK_${task.id}`,
          start: task.start,
          end: task.end ?? undefined,
          editable: true,
          backgroundColor: "#006d77",
          title: task.title ?? "",
          extendedProps: {
            type: CalendarEventType.TASK,
            task: task,
          },
        };
        if (task.activeTimerRunning) {
          const now = new Date();
          mappedEvent.end = now;
          mappedEvent.backgroundColor = "#f2cc8f";
          mappedEvent.editable = false;
          mappedEvent.textColor = "black";
          mappedEvent.extendedProps!.type = CalendarEventType.TIMER;
        }
        return mappedEvent;
      }),
    );
  }

  newEvents = newEvents.sort((a, b) =>
    dayjs(a.start! as unknown as Date).isAfter(
      dayjs(b.start! as unknown as Date),
    )
      ? 1
      : -1,
  );

  return {
    newEvents,
    businessHours,
  };
};
