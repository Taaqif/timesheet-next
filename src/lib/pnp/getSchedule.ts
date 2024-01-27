import {
  type IGraphQueryable,
  GraphQueryableCollection,
} from "@pnp/graph/graphqueryable";

import { _Calendar } from "@pnp/graph/calendars/types";
import { graphPost } from "@pnp/graph";
import { body } from "@pnp/odata";

export interface CalendarScheduleItemType {
  scheduleId: string;
  availabilityView: string;
  scheduleItems: ScheduleItem[];
  workingHours: WorkingHours;
}

export interface ScheduleItem {
  status: string;
  start: ScheduleItemDate;
  end: ScheduleItemDate;
  subject: string;
}

export interface ScheduleItemDate {
  dateTime: string;
  timeZone: string;
}

export interface WorkingHours {
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  timeZone: TimeZoneClass;
}

export interface TimeZoneClass {
  name: string;
}

export interface IGetScheduleRequest {
  schedules: string[];
  startTime: ScheduleItemDate;
  endTime: ScheduleItemDate;
  availabilityViewInterval?: number;
}

declare module "@pnp/graph/calendars/types" {
  interface _Calendar {
    getSchedule(
      request: IGetScheduleRequest,
    ): Promise<CalendarScheduleItemType[]>;
  }
  interface ICalendar {
    getSchedule(
      request: IGetScheduleRequest,
    ): Promise<CalendarScheduleItemType[]>;
  }
}

_Calendar.prototype.getSchedule = async function (
  this: IGraphQueryable,
  request: IGetScheduleRequest,
): Promise<CalendarScheduleItemType[]> {
  const query = GraphQueryableCollection(this, "getSchedule");
  // eslint-disable-next-line
  const data = await graphPost(query, body(request));
  // eslint-disable-next-line
  return data;
};
