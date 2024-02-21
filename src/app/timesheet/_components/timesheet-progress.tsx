import dayjs from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import { useCalendarStore } from "~/app/_store";
import {
  Progress,
  ProgressContainer,
  ProgressIndicator,
} from "~/components/ui/progress";
import { useCalendarEventsQuery } from "~/hooks/use-task-api";
import { calculateEventProgressBarInfo } from "~/lib/utils";

type TimesheetProgressProps = {
  //
};

export const TimesheetProgress = ({}: TimesheetProgressProps) => {
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const {
    events,
    businessHours,
    isFetched: calendarEventsFetched,
  } = useCalendarEventsQuery();

  const selectedCalendarEvents = useMemo(() => {
    return events.filter((event) => {
      const hasTask = !!event?.extendedProps?.task;
      return (
        hasTask && dayjs(event.start as Date).isSame(dayjs(selectedDate), "day")
      );
    });
  }, [selectedDate, events]);

  return (
    <div>
      <ProgressContainer>
        {selectedCalendarEvents?.map((event, index) => {
          const progress = calculateEventProgressBarInfo(
            businessHours?.startTime as string,
            businessHours?.endTime as string,
            event.start as Date,
            event.end as Date,
          );
          return (
            <ProgressIndicator
              key={index}
              value={progress?.value}
              offset={progress?.offset}
              color={event.backgroundColor}
            />
          );
        })}
      </ProgressContainer>
    </div>
  );
};
