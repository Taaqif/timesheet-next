"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "~/lib/utils";

type ProgressProps = {
  notchValue?: number;
  offset?: number;
  indicatorClassName?: React.ComponentProps<"div">["className"];
  indicatorColor?: string;
} & React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>;

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      value,
      notchValue,
      offset,
      indicatorClassName,
      indicatorColor,
      ...props
    },
    ref,
  ) => (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 origin-left bg-primary transition-all",
          indicatorClassName,
        )}
        style={{
          transform: `${offset ? `translateX(${offset ?? 0}%)` : ""} scaleX(${value ?? 0}%)`,
          backgroundColor: indicatorColor ? indicatorColor : undefined,
        }}
      />
      {notchValue && notchValue > 0 && (
        <div
          className="absolute top-0 h-full w-1 bg-muted-foreground transition-all"
          style={{ right: `${100 - (notchValue || 0)}%` }}
        ></div>
      )}
    </ProgressPrimitive.Root>
  ),
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
