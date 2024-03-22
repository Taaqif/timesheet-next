import { type EventInput } from "@fullcalendar/core";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import { useCalendarStore } from "~/app/_store";
import { useCalendarEventsQuery } from "~/hooks/use-task-api";
import { Badge } from "~/components/ui/badge";
import {
  CalendarEventType,
  type TasksWithTeamworkTaskSelectSchema,
  getHoursMinutesSecondsTextFromSeconds,
} from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";

export const AllTaskEventsTimesheetBadge = () => {
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const { events, isFetched: calendarEventsFetched } = useCalendarEventsQuery();

  const diff = useMemo(() => {
    return events.reduce((curr, event) => {
      const task = event.extendedProps?.task as
        | TasksWithTeamworkTaskSelectSchema
        | undefined;
      const isActiveTimer =
        event.extendedProps?.type === CalendarEventType.TIMER;
      const shouldShow = dayjs(event.start as Date).isSame(
        dayjs(selectedDate),
        "day",
      );
      if (shouldShow && task && !isActiveTimer) {
        curr += dayjs(event.end as Date).diff(event.start as Date, "seconds");
      }
      return curr;
    }, 0);
  }, [selectedDate, events]);

  if (!calendarEventsFetched) {
    return <Skeleton className="h-4 w-11 rounded-xl" />;
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      {diff > 0
        ? `Logged ${getHoursMinutesSecondsTextFromSeconds(diff, true)}`
        : "No time logged"}
    </Badge>
  );
};
