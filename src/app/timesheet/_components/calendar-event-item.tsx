import { type ICalendarViewInfo } from "@pnp/graph/calendars";
import { type Attendee } from "@microsoft/microsoft-graph-types";
import { Mail, MapPin } from "lucide-react";
import React from "react";
import { Button } from "~/components/ui/button";
import { getInitials, getTextColor } from "~/lib/utils";
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
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`mailto:${calendarEvent.organizer?.emailAddress?.address}`}
                  className="flex items-center gap-2 truncate text-nowrap"
                >
                  <Mail className="w-4" />
                  <span>{calendarEvent.organizer?.emailAddress?.name}</span>
                </a>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{calendarEvent.organizer?.emailAddress?.address}</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
        <Attendees attendees={calendarEvent.attendees} />
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

type AttendeesProps = {
  attendees?: Attendee[] | null;
};
const Attendees = ({ attendees }: AttendeesProps) => {
  if (attendees?.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {attendees?.map((attendee, index) => (
        <React.Fragment key={index}>
          {attendee.emailAddress?.name && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`mailto:${attendee.emailAddress.address}`}
                  className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full "
                  style={{
                    ...getTextColor(attendee.emailAddress.name),
                  }}
                >
                  <span className="font-medium ">
                    {getInitials(attendee.emailAddress.name)}
                  </span>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>{attendee.emailAddress.name}</p>
                <p>{attendee.emailAddress.address}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
