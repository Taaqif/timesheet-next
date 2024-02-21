"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "~/lib/utils";

const ProgressContainer = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
      className,
    )}
    {...props}
  />
));
ProgressContainer.displayName = ProgressPrimitive.Root.displayName;

const ProgressIndicator = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Indicator> & {
    offset?: ProgressProps["offset"];
    value: ProgressProps["value"];
    color?: string;
  }
>(({ className, offset, value, color, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "absolute top-0 h-full w-full flex-1 origin-left bg-primary transition-all ",
      className,
    )}
    style={{
      transform: `${offset ? `translateX(${offset ?? 0}%)` : ""} scaleX(${value ?? 0}%)`,
      backgroundColor: color,
    }}
    {...props}
  />
));
ProgressIndicator.displayName = ProgressPrimitive.Indicator.displayName;

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
    { value, notchValue, offset, indicatorClassName, indicatorColor, ...props },
    ref,
  ) => (
    <ProgressContainer ref={ref} {...props}>
      <ProgressIndicator
        className={indicatorClassName}
        value={value}
        color={indicatorColor}
        offset={offset}
      />
      {notchValue && notchValue > 0 && (
        <div
          className="absolute top-0 h-full w-1 bg-muted-foreground transition-all"
          style={{ right: `${100 - (notchValue || 0)}%` }}
        ></div>
      )}
    </ProgressContainer>
  ),
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress, ProgressContainer, ProgressIndicator };
