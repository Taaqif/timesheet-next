import { type ClassValue, clsx } from "clsx";
import dayjs from "dayjs";
import { twMerge } from "tailwind-merge";
import { type DateInput, type EventInput } from "@fullcalendar/core/index.js";
import { type InferResultType } from "~/server/db";
import { type ICalendarViewInfo } from "@pnp/graph/calendars";
import { type ScheduleInformation } from "@microsoft/microsoft-graph-types";
import stringToColor from "string-to-color";
import fontColorContrast from "font-color-contrast";

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
  if (includeSeconds || totalSeconds < 60) {
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
export type TasksSelectSchema = InferResultType<"tasks">;
export type TeamworkTasksSelectSchema = InferResultType<"teamworkTasks">;
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
  schedule?: ScheduleInformation[] | null;
  calendarEvents?: ICalendarViewInfo[] | null;
}) => {
  let newEvents: EventInput[] = [];
  let businessHours: EventInput | null = null;
  if (schedule) {
    schedule.forEach((schedule) => {
      const daysOfWeek = schedule.workingHours?.daysOfWeek?.map(
        (day) => weekMap[day],
      );
      businessHours = {
        daysOfWeek,
        startTime: schedule.workingHours?.startTime,
        endTime: schedule.workingHours?.endTime,
      };

      if (!calendarEvents) {
        if (schedule.scheduleItems) {
          newEvents = newEvents.concat(
            schedule.scheduleItems.map((scheduleItem) => {
              const mappedEvent: EventInput = {
                extendedProps: {
                  type: CalendarEventType.SCHEDULE,
                  scheduleEvent: scheduleItem,
                },
                backgroundColor: "#e07a5f",
                start: `${scheduleItem.start?.dateTime}Z`,
                editable: false,
                end: `${scheduleItem.end?.dateTime}Z`,
                title:
                  (scheduleItem.subject
                    ? scheduleItem.subject
                    : scheduleItem.status) ?? "",
              };
              const diff = dayjs(mappedEvent.start as Date).diff(
                mappedEvent.end as Date,
                "second",
              );
              // 24 hours in seconds
              mappedEvent.allDay = diff % 86400 === 0 ?? false;
              return mappedEvent;
            }),
          );
        }
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
          allDay: event.isAllDay ?? false,
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
        const bgColor = "#006d77";
        const { backgroundColor, color } = getTextColor(
          task.teamworkTask?.teamworkProjectId ?? "",
        );
        const mappedEvent: EventInput = {
          id: `TASK_${task.id}`,
          start: task.start,
          end: task.end ?? undefined,
          editable: true,
          backgroundColor: task.teamworkTask?.teamworkProjectId
            ? backgroundColor
            : bgColor,
          textColor: task.teamworkTask?.teamworkProjectId ? color : "white",
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

export const getTextColor = (text: string) => {
  const backgroundColor = stringToColor(text);
  const color = fontColorContrast(backgroundColor, 0.6);
  return {
    backgroundColor,
    color,
  };
};

export type ProgressBarInfo = {
  offset: number;
  value: number;
};

export function calculateEventProgressBarInfo(
  businessHoursStartTime: string,
  businessHoursEndTime: string,
  timeEntryStart: Date | undefined,
  timeEntryEnd: Date | undefined,
): ProgressBarInfo | undefined {
  const startSplit = businessHoursStartTime?.split(":");
  const endSplit = businessHoursEndTime?.split(":");
  if (!startSplit && !endSplit) {
    return undefined;
  }
  const startOfDay = dayjs(timeEntryStart)
    .set("hours", +startSplit[0]!)
    .set("minutes", +startSplit[1]!)
    .toDate();
  const endOfDay = dayjs(timeEntryStart)
    .set("hours", +endSplit[0]!)
    .set("minutes", +endSplit[1]!)
    .toDate();

  const totalBusinessHours =
    (endOfDay?.valueOf() ?? 0) - (startOfDay?.valueOf() ?? 0);
  if (totalBusinessHours > 0) {
    const elapsedBusinessHours =
      (timeEntryEnd?.valueOf() ?? 0) - (timeEntryStart?.valueOf() ?? 0);
    const offset =
      (((timeEntryStart?.valueOf() ?? 0) - (startOfDay?.valueOf() ?? 0)) /
        totalBusinessHours) *
      100;
    const value = (elapsedBusinessHours / totalBusinessHours) * 100;

    return { offset, value };
  }
}

export const getInitials = (fullName: string): string => {
  const words = fullName.split(" ");

  const initials = words
    .map((word) => word.charAt(0))
    .slice(0, 3)
    .join("")
    .toUpperCase();

  return initials;
};

type FindClosestEventParams = {
  events: EventInput[];
  type?: CalendarEventType;
  start: Date;
};
export const findClosestEvent = ({
  events,
  type,
  start,
}: FindClosestEventParams) => {
  const closestScheduleEvent = events.find((event) => {
    if (!type || event.extendedProps?.type === type) {
      const diff = Math.abs(dayjs(event.start as Date).diff(start, "minute"));
      return diff >= 0 && diff <= 5;
    }
  });
  return closestScheduleEvent;
};

export const convertHexToRGBA = (hexCode: string, opacity = 1) => {
  let hex = hexCode.replace("#", "");

  if (hex.length === 3) {
    hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  /* Backward compatibility for whole number based opacity values. */
  if (opacity > 1 && opacity <= 100) {
    opacity = opacity / 100;
  }

  return `rgba(${r},${g},${b},${opacity})`;
};

/**
 * Move an array item to a different position. Returns a new array with the item moved to the new position.
 */
export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = array.slice();
  newArray.splice(
    to < 0 ? newArray.length + to : to,
    0,
    newArray.splice(from, 1)[0]!,
  );

  return newArray;
}
