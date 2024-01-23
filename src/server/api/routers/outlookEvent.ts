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
import "~/lib/pnp/getSchedule";
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

export const outlookEventRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const client = getGraphApiClient(ctx.session.user.accessToken);

    const me = await client.me.calendars();
    console.log(me);
    return me;
  }),
});
