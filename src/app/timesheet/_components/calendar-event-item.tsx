import { type ICalendarViewInfo } from "@pnp/graph/calendars";
import { Mail, MapPin } from "lucide-react";
import React from "react";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export type CalendarEventItemProps = {
  calendarEvent: ICalendarViewInfo;
};
export const CalendarEventItem = ({
  calendarEvent,
}: CalendarEventItemProps) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="bold text-lg">{calendarEvent.subject}</div>
      <div className=" flex flex-col gap-2 overflow-hidden text-muted-foreground">
        <div className="mb-4">{calendarEvent.bodyPreview}</div>
        {calendarEvent.location?.displayName && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4" />
            {calendarEvent.location?.displayName}
          </div>
        )}
        {calendarEvent.organizer?.emailAddress && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <a
                href={`mailto:${calendarEvent.organizer?.emailAddress?.address}`}
                className="flex items-center gap-2 truncate text-nowrap"
              >
                <Mail className="w-4" />
                {calendarEvent.organizer?.emailAddress?.name}
              </a>
            </TooltipTrigger>
            <TooltipContent side="left" className="flex items-center gap-4">
              {calendarEvent.organizer?.emailAddress?.address}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {calendarEvent.onlineMeeting?.joinUrl && (
        <div className="mt-2">
          <Button
            variant="secondary"
            onClick={() => {
              window.open(calendarEvent.onlineMeeting?.joinUrl ?? "", "_blank");
            }}
          >
            Join Online
          </Button>
        </div>
      )}
    </div>
  );
};
