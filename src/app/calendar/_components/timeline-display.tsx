import React from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";

import interactionPlugin from "@fullcalendar/interaction"; // for selectable
export type TimelineDisplayProps = {};
export const TimelineDisplay = ({}: TimelineDisplayProps) => {
  return (
    <div className="h-full p-4">
      <FullCalendar
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
