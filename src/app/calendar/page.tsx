import React from "react";
import { cookies } from "next/headers";
import { Calendar } from "./_components/calendar";
import { outlookEventRouter } from "~/server/api/routers/outlookEvent";
import { api } from "~/trpc/server";

export default async function page() {
  const layout = cookies().get("react-resizable-panels:layout");
  const collapsed = cookies().get("react-resizable-panels:collapsed");

  const me = await api.outlookEvent.getAll.query();
  console.log("t", me);

  const defaultLayout = layout
    ? (JSON.parse(layout.value) as number[])
    : undefined;
  const defaultCollapsed = collapsed
    ? (JSON.parse(collapsed.value) as boolean)
    : undefined;
  return (
    <div className="h-svh">
      <Calendar
        defaultLayout={defaultLayout}
        defaultCollapsed={defaultCollapsed}
      />
    </div>
  );
}
