import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { DefaultHeaders, DefaultInit, graphfi } from "@pnp/graph";
import {
  BrowserFetchWithRetry,
  DefaultParse,
  type Queryable,
} from "@pnp/queryable";
import { type TimelinePipe } from "@pnp/core";
import "@pnp/graph/users";
import "@pnp/graph/calendars";
import dayjs from "dayjs";
import { users } from "~/server/db/schema";
import { logger } from "~/logger/server";
import { eq } from "drizzle-orm";
export function AccessToken(accessToken: string): TimelinePipe<Queryable> {
  return (instance: Queryable) => {
    instance.on.auth.replace(async function (url: URL, init: RequestInit) {
      // @ts-expect-error Authorization is a key
      // eslint-disable-next-line
      init.headers!["Authorization"] = `Bearer ${accessToken}`;

      return [url, init];
    });

    return instance;
  };
}
const getGraphApiClient = (accessToken: string) => {
  const graph = graphfi().using(
    DefaultHeaders(),
    DefaultInit(),
    BrowserFetchWithRetry(),
    DefaultParse(),
    AccessToken(accessToken),
  );
  return graph;
};

export const outlookRouter = createTRPCRouter({
  getMyCalendarEvents: protectedProcedure
    .input(z.object({ weekOf: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = getGraphApiClient(ctx.session.user.access_token);
      const start = dayjs(input.weekOf).startOf("week").toISOString();
      const end = dayjs(input.weekOf).endOf("week").toISOString();

      const events = await client.me.calendarView(start, end).top(999)();
      return events;
    }),
  getUserSchedule: protectedProcedure
    .input(z.object({ weekOf: z.string(), userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not create task";
      }
      const client = getGraphApiClient(ctx.session.user.access_token);
      const start = dayjs(input.weekOf).startOf("week").toDate();
      const end = dayjs(input.weekOf).endOf("week").toDate();

      const schedule = await client.me.calendar.getSchedule({
        schedules: [user.email],
        startTime: {
          dateTime: start.toISOString(),
          timeZone: "Etc/GMT",
        },
        endTime: {
          dateTime: end.toISOString(),
          timeZone: "Etc/GMT",
        },
      });
      return schedule;
    }),
});
