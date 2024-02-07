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
          <>
            <a
              href={`mailto:${calendarEvent.organizer?.emailAddress?.address}`}
              className="flex items-center gap-2 truncate text-nowrap"
            >
              <Mail className="w-4" />
              <span>
                {calendarEvent.organizer?.emailAddress?.name}
                <span className="ml-1">
                  ({calendarEvent.organizer?.emailAddress?.address})
                </span>
              </span>
            </a>
          </>
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
