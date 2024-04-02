import React from "react";
import { cookies } from "next/headers";
import { Calendar } from "./_components/calendar";

export const metadata = {
  title: "Timesheet",
};

export default async function page() {
  const layout = cookies().get("react-resizable-panels:calendar-layout");
  const calendarCollapsed = cookies().get(
    "react-resizable-panels:calendar-collapsed",
  );

  const defaultLayout = layout
    ? (JSON.parse(layout.value) as number[])
    : undefined;
  const defaultCalendarCollapsed = calendarCollapsed
    ? (JSON.parse(calendarCollapsed.value) as boolean)
    : undefined;
  return (
    <div className="h-svh">
      <Calendar
        defaultLayout={defaultLayout}
        defaultCalendarCollapsed={defaultCalendarCollapsed}
      />
    </div>
  );
}
