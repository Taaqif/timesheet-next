import dayjs from "dayjs";
import React from "react";
import { cn, getWeekDates } from "~/lib/utils";
import { AllTaskEventsTimesheetBadge } from "./timesheet-total-hours-badge";
import { AllTaskEventsTimesheetProgress } from "./timesheet-progress";

export const TimesheetTotalHoursWeek = ({ date }: { date: Date }) => {
  const weekDates = getWeekDates(date);
  return (
    <div className="flex flex-col gap-2">
      {weekDates?.map((weekDate, index) => {
        const d = dayjs(weekDate);
        const isToday = dayjs().isSame(d, "day");
        return (
          <div key={index} className="min-w-[200px]">
            <div
              className={cn("mb-2 flex gap-2 text-sm", {
                "font-bold": isToday,
              })}
            >
              <span>{d.format("dddd")}</span>
              <AllTaskEventsTimesheetBadge compact date={weekDate} />
            </div>
            <div className="">
              <AllTaskEventsTimesheetProgress date={weekDate} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
