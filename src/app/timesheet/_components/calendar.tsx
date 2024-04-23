"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { Separator } from "~/components/ui/separator";
import { CalendarEventType, cn, findClosestEvent } from "~/lib/utils";
import {
  CalendarDays,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  MoreVertical,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { CalendarDisplay } from "./calendar-display";
import { Calendar as CalendarPicker } from "~/components/ui/calendar";
import { api } from "~/trpc/react";
import { TaskListDisplay } from "./task-list-display";
import {
  useCalendarEventsQuery,
  useStartTaskMutation,
  useStopTaskMutation,
} from "~/hooks/use-task-api";
import { useCalendarStore } from "~/app/_store";
import dayjs from "dayjs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { type ImperativePanelHandle } from "react-resizable-panels";
import { useBreakpoint } from "~/hooks/use-breakpoint";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { AllTaskEventsTimesheetProgress } from "./timesheet-progress";
import { AllTaskEventsTimesheetBadge } from "./timesheet-total-hours-badge";
import { Nav } from "~/app/_components/Nav";
import { ScrollArea } from "~/components/ui/scroll-area";

export type CalendarProps = {
  defaultCalendarCollapsed?: boolean;
  defaultLayout?: number[];
};
export function Calendar({
  defaultCalendarCollapsed = false,
  defaultLayout = [60, 40],
}: CalendarProps) {
  const navCollapsedSize = 4;
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const setSelectedEventId = useCalendarStore((s) => s.setSelectedEventId);
  const calendarPanelRef = useRef<ImperativePanelHandle>(null);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const [firstScroll, setFirstScroll] = useState(false);

  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(
    defaultCalendarCollapsed,
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isHorizontalCalendarOpen, setIsHorizontalCalendarOpen] =
    useState(false);
  const { data: activeTask } = api.task.getActiveTask.useQuery();
  const { events } = useCalendarEventsQuery();
  const stopActiveTask = useStopTaskMutation();
  const startActiveTask = useStartTaskMutation();
  const { breakpoint } = useBreakpoint();

  useEffect(() => {
    if (activeTask) {
      const now = dayjs();
      const timerStart = dayjs(activeTask.start);

      if (now.isAfter(timerStart, "day")) {
        stopActiveTask.mutate({
          endDate: timerStart.endOf("day").toDate(),
        });
      }
    }
  }, [activeTask]);

  useEffect(() => {
    if (breakpoint === "mobile") {
      if (!isCalendarCollapsed) {
        setIsCalendarCollapsed(true);
      }
    }
  }, [breakpoint]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedDate]);

  useEffect(() => {
    if (firstScroll === false && events.length > 0) {
      scrollToBottom();
      setFirstScroll(true);
    }
  }, [events]);

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const goNext = () => {
    setSelectedDate(dayjs(selectedDate).add(1, "day").toDate());
  };

  const goPrevious = () => {
    setSelectedDate(dayjs(selectedDate).add(-1, "day").toDate());
  };
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaViewportRef.current) {
        scrollAreaViewportRef.current.scroll({
          top: scrollAreaViewportRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  return (
    <div className="h-svh">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:calendar-layout=${JSON.stringify(
            sizes,
          )}`;
          window.dispatchEvent(new Event("resize"));
        }}
        className="h-full items-stretch"
      >
        <ResizablePanel defaultSize={defaultLayout[0]} minSize={30}>
          <div className="flex h-full flex-col @container/calendar-task-list">
            <div className="flex flex-row justify-between gap-2 px-4 py-4 @lg/calendar-task-list:items-center">
              <Popover
                open={isDatePickerOpen}
                onOpenChange={setIsDatePickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button variant={"ghost"} className="px-1">
                    <h1 className="flex flex-1 items-center gap-2 text-xl @lg/calendar-task-list:text-2xl">
                      <CalendarIcon className="h-5 w-5" />
                      {dayjs(selectedDate).format("dddd, DD MMMM YYYY")}
                    </h1>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  side="bottom"
                  align="start"
                >
                  <CalendarPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date!);
                      setIsDatePickerOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {breakpoint !== "mobile" && (
                <div className="flex gap-2">
                  {!dayjs(selectedDate).isSame(dayjs(), "day") && (
                    <Button
                      className="hidden @lg/calendar-task-list:block"
                      variant={"outline"}
                      onClick={() => {
                        goToToday();
                      }}
                    >
                      Today
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => {
                      goPrevious();
                    }}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => {
                      goNext();
                    }}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              )}
              {breakpoint === "mobile" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => {
                        goToToday();
                      }}
                    >
                      Today
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        goNext();
                      }}
                    >
                      Next Day
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        goPrevious();
                      }}
                    >
                      Previous Day
                    </DropdownMenuItem>
                    {isCalendarCollapsed && (
                      <DropdownMenuItem
                        onClick={() => {
                          setIsHorizontalCalendarOpen(
                            !isHorizontalCalendarOpen,
                          );
                        }}
                      >
                        {isHorizontalCalendarOpen ? "Hide" : "Show"} Calendar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <Separator />
            <div className="relative flex min-h-0 flex-grow flex-col">
              <div className="absolute left-0 right-0 top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex flex-col gap-2 px-7 py-4 ">
                  {isCalendarCollapsed && isHorizontalCalendarOpen && (
                    <div className="h-[120px]">
                      <CalendarDisplay view="timelineDayWorkHours" />
                    </div>
                  )}
                  <div className="flex flex-row items-center justify-end gap-4  ">
                    <AllTaskEventsTimesheetBadge />

                    <div className="flex flex-row items-center justify-end gap-4 ">
                      {activeTask && (
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => {
                            stopActiveTask.mutate({});
                          }}
                        >
                          <CirclePause className="mr-1 h-4 w-4" />
                          Stop
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={async () => {
                          const closestScheduleEvent = findClosestEvent({
                            events,
                            start: new Date(),
                            type: CalendarEventType.CALENDAR_EVENT,
                          });
                          const newTask = await startActiveTask.mutateAsync({
                            task: {
                              description: closestScheduleEvent?.title,
                            },
                          });
                          setSelectedEventId(newTask.createdTask?.id);
                        }}
                      >
                        <CirclePlay className="mr-1 h-4 w-4" />
                        Start
                      </Button>
                    </div>
                  </div>
                  <div className="">
                    <AllTaskEventsTimesheetProgress />
                  </div>
                </div>
                <Separator />
              </div>
              <div className="flex min-h-0 flex-grow">
                <ScrollArea
                  className="w-full"
                  viewportRef={scrollAreaViewportRef}
                  viewportClassName={cn("pt-20", {
                    "pt-52": isCalendarCollapsed && isHorizontalCalendarOpen,
                  })}
                >
                  <TaskListDisplay />
                </ScrollArea>
              </div>
            </div>
          </div>
        </ResizablePanel>
        {breakpoint !== "mobile" && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              ref={calendarPanelRef}
              defaultSize={defaultLayout[1]}
              maxSize={40}
              minSize={15}
              collapsedSize={navCollapsedSize}
              collapsible={true}
              onExpand={() => {
                setIsCalendarCollapsed(false);
                document.cookie = `react-resizable-panels:calendar-collapsed=${JSON.stringify(
                  false,
                )}`;
              }}
              onCollapse={() => {
                setIsCalendarCollapsed(true);
                document.cookie = `react-resizable-panels:calendar-collapsed=${JSON.stringify(
                  true,
                )}`;
              }}
              className={cn(
                isCalendarCollapsed &&
                  "min-w-[50px] transition-all duration-300 ease-in-out",
              )}
            >
              {isCalendarCollapsed && (
                <>
                  <div
                    className={cn(isCalendarCollapsed ? "h-[68px]" : "px-2")}
                  ></div>
                  <Separator />
                  <div className="group" data-collapsed={isCalendarCollapsed}>
                    <Nav
                      isCollapsed={isCalendarCollapsed}
                      links={[
                        {
                          title: "Show calendar",
                          label: "",
                          icon: CalendarDays,
                          variant: "ghost",
                          onClick: () => {
                            calendarPanelRef?.current?.resize(40);
                            // setIsCalendarCollapsed(false);
                          },
                        },
                      ]}
                    />
                  </div>
                </>
              )}

              {!isCalendarCollapsed && (
                <div className="h-full">
                  <CalendarDisplay />
                </div>
              )}
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
