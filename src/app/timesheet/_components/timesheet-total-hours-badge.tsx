import dayjs from "dayjs";
import React, { useMemo } from "react";
import { useCalendarEventsQuery } from "~/hooks/use-task-api";
import { Badge } from "~/components/ui/badge";
import {
  CalendarEventType,
  type TasksWithTeamworkTaskSelectSchema,
  getHoursMinutesSecondsTextFromSeconds,
} from "~/lib/utils";
import { Skeleton } from "~/components/ui/skeleton";

export const AllTaskEventsTimesheetBadge = ({
  date,
  compact,
}: {
  date: Date;
  compact?: boolean;
}) => {
  const { events, isFetched: calendarEventsFetched } = useCalendarEventsQuery({
    date,
  });

  const diff = useMemo(() => {
    return events.reduce((curr, event) => {
      const task = event.extendedProps?.task as
        | TasksWithTeamworkTaskSelectSchema
        | undefined;
      const isActiveTimer =
        event.extendedProps?.type === CalendarEventType.TIMER;
      const shouldShow = dayjs(event.start as Date).isSame(dayjs(date), "day");
      if (shouldShow && task && !isActiveTimer) {
        curr += dayjs(event.end as Date).diff(event.start as Date, "seconds");
      }
      return curr;
    }, 0);
  }, [date, events]);

  if (!calendarEventsFetched) {
    return <Skeleton className="h-4 w-11 rounded-xl" />;
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      {diff > 0
        ? `${!compact ? "Logged" : ""} ${getHoursMinutesSecondsTextFromSeconds(diff, true)}`
        : compact
          ? "-"
          : "No time logged"}
    </Badge>
  );
};
