import React from "react";
import { Skeleton } from "~/components/ui/skeleton";

export const EmptyTaskListItem = () => {
  return (
    <div className="flex scroll-m-5 flex-col gap-2 @container/event">
      <div>
        <Skeleton className="h-2 w-full rounded-xl" />
      </div>
      <div className="py-2 text-sm text-muted-foreground">
        <span className="mr-1 flex items-center gap-1">
          <Skeleton className="h-4 w-16 rounded-xl" />
          <span> - </span>
          <Skeleton className="h-4 w-16 rounded-xl" />
        </span>
      </div>
      <div className="py-4">
        <Skeleton className="h-7 w-full rounded-xl" />
      </div>
    </div>
  );
};
