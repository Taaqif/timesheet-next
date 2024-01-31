import { type ClassValue, clsx } from "clsx";
import dayjs from "dayjs";
import { type InferSelectModel } from "drizzle-orm";
import { twMerge } from "tailwind-merge";
import {
  type tasks as tasksSchema,
  type timers as timersSchema,
} from "~/server/db/schema";
import { type CalendarScheduleItemType } from "./pnp/getSchedule";
import { type DateInput, type EventInput } from "@fullcalendar/core/index.js";
import { InferResultType } from "~/server/db";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getHoursMinutesTextFromDates = (
  start: Date | string | DateInput,
  end: Date | string | DateInput,
  condensed = false,
) => {
  try {
    const ds = dayjs(end as unknown as Date);
    const minsTotal = ds.diff(start as unknown as Date, "minute");
    if (minsTotal > 0) {
      return getHoursMinutesTextFromMinutes(minsTotal, condensed);
    } else {
      const secTotal = ds.diff(start as unknown as Date, "second");
      return getSecondsTextFromSeconds(secTotal, condensed);
    }
  } catch (error) {
    return `N/A`;
  }
};

export const getSecondsTextFromSeconds = (
  secondTotal: number,
  condensed = false,
) => {
  if (condensed) {
    return `${secondTotal}s`;
  } else {
    return `${secondTotal} seconds`;
  }
};
export const getHoursMinutesTextFromMinutes = (
  minsTotal: number,
  condensed = false,
) => {
  const hours = Math.floor(minsTotal / 60);
  const minutes = minsTotal % 60;
  if (condensed) {
    return (
      (hours > 0 ? `${hours}h` : "") +
      (hours > 0 && minutes > 0 ? " " : "") +
      (minutes > 0 ? `${minutes}m` : "")
    );
  } else {
    return (
      (hours > 0 ? `${hours} hours` : "") +
      (minutes > 0 && hours > 0 ? " and " : "") +
      (minutes > 0 ? `${minutes} minutes` : "")
    );
  }
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
export const getCalendarEvents = ({
  activeTask,
  tasks,
  schedule,
}: {
  activeTask?: TasksWithTeamworkTaskSelectSchema | null;
  tasks?: TasksWithTeamworkTaskSelectSchema[] | null;
  schedule?: CalendarScheduleItemType[] | null;
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
      newEvents = newEvents.concat(
        schedule.scheduleItems.map((scheduleItem) => {
          const mappedEvent: EventInput = {
            extendedProps: {
              type: "MEETING",
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
    });
  }
  if (tasks) {
    newEvents = newEvents.concat(
      tasks.map((task) => {
        const mappedEvent: EventInput = {
          start: task.start,
          end: task.end ?? undefined,
          backgroundColor: "#006d77",
          title: task.title ?? "",
          id: `TASK_${task.id}`,
          extendedProps: {
            type: "TASK",
            description: task.description,
            task: task,
          },
        };
        return mappedEvent;
      }),
    );
  }
  if (activeTask) {
    const now = new Date();
    newEvents.push({
      extendedProps: {
        type: "TIMER",
        task: activeTask,
      },
      id: "TIMER",
      backgroundColor: "#f2cc8f",
      editable: false,
      textColor: "black",
      start: activeTask.start,
      end: now,
    });
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
