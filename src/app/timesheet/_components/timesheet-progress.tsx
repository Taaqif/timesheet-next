import { type EventInput } from "@fullcalendar/core";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import { ProgressContainer, ProgressIndicator } from "~/components/ui/progress";
import { useCalendarEventsQuery } from "~/hooks/use-task-api";
import { CalendarEventType, calculateEventProgressBarInfo } from "~/lib/utils";
import { TaskListItem } from "./task-list-item";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";
import { HoverCardPortal } from "@radix-ui/react-hover-card";
import { Skeleton } from "~/components/ui/skeleton";

export const AllTaskEventsTimesheetProgress = ({ date }: { date: Date }) => {
  const {
    events,
    businessHours,
    isFetched: calendarEventsFetched,
  } = useCalendarEventsQuery({
    date,
  });

  const selectedCalendarEvents = useMemo(() => {
    return events.filter((event) => {
      const hasTask = !!event?.extendedProps?.task;
      return hasTask && dayjs(event.start as Date).isSame(dayjs(date), "day");
    });
  }, [date, events]);

  if (!calendarEventsFetched) {
    return <Skeleton className="h-2 w-full rounded-xl" />;
  }

  return (
    <ProgressContainer>
      {selectedCalendarEvents?.map((event, index) => {
        return (
          <TimeSheetProgressIndicator
            key={index}
            event={event}
            businessHoursEndTime={businessHours?.endTime as string}
            businessHoursStartTime={businessHours?.startTime as string}
          />
        );
      })}
    </ProgressContainer>
  );
};

export type EventTimeSheetProgressProps = {
  event: EventInput;
  businessHoursEndTime?: string;
  businessHoursStartTime?: string;
};
export const EventTimeSheetProgress = ({
  event,
  businessHoursStartTime,
  businessHoursEndTime,
}: EventTimeSheetProgressProps) => {
  return (
    <ProgressContainer>
      <TimeSheetProgressIndicator
        event={event}
        businessHoursEndTime={businessHoursEndTime}
        businessHoursStartTime={businessHoursStartTime}
      />
    </ProgressContainer>
  );
};

type TimeSheetProgressIndicatorProps = {
  event: EventInput;
  businessHoursEndTime?: string;
  businessHoursStartTime?: string;
};
const TimeSheetProgressIndicator = ({
  event,
  businessHoursStartTime,
  businessHoursEndTime,
}: TimeSheetProgressIndicatorProps) => {
  const isActiveTimer = event.extendedProps?.type === CalendarEventType.TIMER;
  const [endDate, setEndDate] = useState<Date>(event.end as Date);
  const progressBarInfo = useMemo(() => {
    if (businessHoursEndTime && businessHoursStartTime) {
      return calculateEventProgressBarInfo(
        businessHoursStartTime,
        businessHoursEndTime,
        event.start as Date,
        endDate,
      );
    }
  }, [event.start, endDate, businessHoursStartTime, businessHoursEndTime]);
  useEffect(() => {
    if (isActiveTimer) {
      const interval = setInterval(() => {
        const plusOneSecond = dayjs().add(1, "second").toDate();
        updateEventTimeDisplay(plusOneSecond);
      }, 1000);
      updateEventTimeDisplay(new Date());
      return () => {
        clearInterval(interval);
      };
    } else {
      updateEventTimeDisplay(event.end as Date);
    }
  }, [event]);

  const updateEventTimeDisplay = (endDate: Date) => {
    setEndDate(endDate);
  };
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <ProgressIndicator
          value={progressBarInfo?.value}
          offset={progressBarInfo?.offset}
          color={event.backgroundColor}
        />
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent
          align="center"
          side="bottom"
          sideOffset={10}
          className="min-w-[400px] max-w-[500px] p-4"
        >
          <TaskListItem
            event={event}
            businessHoursStartTime={businessHoursStartTime}
            businessHoursEndTime={businessHoursEndTime}
          />
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
};
