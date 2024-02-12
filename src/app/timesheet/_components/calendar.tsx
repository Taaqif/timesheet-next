"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { Nav } from "./nav";
import {
  CalendarClock,
  CalendarDays,
  CalendarIcon,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Timer,
  TimerReset,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { TimesheetProgress } from "./timesheet-progress";
import { CalendarDisplay } from "./calendar-display";
import { Calendar as CalendarPicker } from "~/components/ui/calendar";
import { api } from "~/trpc/react";
import { TaskListDisplay } from "./task-list-display";
import {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useStartTaskMutation,
  useStopTaskMutation,
  useUpdateTaskMutation,
} from "~/lib/hooks/use-task-api";
import { useCalendarStore } from "~/app/_store";
import dayjs from "dayjs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { type ImperativePanelHandle } from "react-resizable-panels";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { useBreakpoint } from "~/lib/hooks/use-breakpoint";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export type CalendarProps = {
  defaultNavCollapsed?: boolean;
  defaultCalendarCollapsed?: boolean;
  defaultLayout?: number[];
};
export function Calendar({
  defaultNavCollapsed = false,
  defaultCalendarCollapsed = false,
  defaultLayout = [265, 440, 655],
}: CalendarProps) {
  const navCollapsedSize = 4;
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const setSelectedEventId = useCalendarStore((s) => s.setSelectedEventId);
  const calendarPanelRef = useRef<ImperativePanelHandle>(null);
  const navPanelRef = useRef<ImperativePanelHandle>(null);

  const [isNavCollapsed, setIsNavCollapsed] = useState(defaultNavCollapsed);
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(
    defaultCalendarCollapsed,
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isHorizontalCalendarOpen, setIsHorizontalCalendarOpen] =
    useState(false);
  const { data: activeTask } = api.task.getActiveTask.useQuery();
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
      if (!isNavCollapsed) {
        setIsNavCollapsed(true);
        navPanelRef.current?.collapse();
      }
    }
  }, [breakpoint]);

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const goNext = () => {
    setSelectedDate(dayjs(selectedDate).add(1, "day").toDate());
  };

  const goPrevious = () => {
    setSelectedDate(dayjs(selectedDate).add(-1, "day").toDate());
  };

  return (
    <div className="h-svh">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:layout=${JSON.stringify(
            sizes,
          )}`;
          window.dispatchEvent(new Event("resize"));
        }}
        className="h-full items-stretch"
      >
        <ResizablePanel
          ref={navPanelRef}
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={15}
          maxSize={20}
          onExpand={() => {
            setIsNavCollapsed(false);
            document.cookie = `react-resizable-panels:nav-collapsed=${JSON.stringify(
              false,
            )}`;
          }}
          onCollapse={() => {
            setIsNavCollapsed(true);
            document.cookie = `react-resizable-panels:nav-collapsed=${JSON.stringify(
              true,
            )}`;
          }}
          className={cn(
            isNavCollapsed &&
              "min-w-[50px] transition-all duration-300 ease-in-out",
          )}
        >
          <div
            className={cn(
              "flex h-[68px] items-center justify-center",
              isNavCollapsed ? "h-[68px]" : "px-2",
            )}
          >
            {/* <AccountSwitcher isCollapsed={isCollapsed} accounts={accounts} /> */}
          </div>
          <Separator />
          <Nav
            isCollapsed={isNavCollapsed}
            links={[
              {
                title: "Timesheet",
                label: "",
                icon: CalendarClock,
                variant: "default",
              },
              {
                title: "Schedule",
                label: "",
                icon: CalendarRange,
                variant: "ghost",
              },
            ]}
          />
          <Separator />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
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
                  <Button
                    className="mr-2 hidden @lg/calendar-task-list:block"
                    variant={
                      dayjs(selectedDate).isSame(dayjs(), "day")
                        ? "outline"
                        : "secondary"
                    }
                    onClick={() => {
                      goToToday();
                    }}
                  >
                    Today
                  </Button>
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
                <div>
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
                </div>
              )}
            </div>
            <Separator />

            <div className="flex flex-col gap-2 bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              {isCalendarCollapsed && isHorizontalCalendarOpen && (
                <div className="h-[150px]">
                  <CalendarDisplay view="timelineDayWorkHours" />
                </div>
              )}
              <div className="flex flex-row justify-end gap-4 ">
                {activeTask && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      stopActiveTask.mutate();
                    }}
                  >
                    <TimerReset className="mr-1 h-4 w-4" />
                    Stop task
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    const newTask = await startActiveTask.mutateAsync();
                    setSelectedEventId(newTask.createdTask?.id);
                  }}
                >
                  <Timer className="mr-1 h-4 w-4" />
                  {activeTask ? "Start new task" : "Start task"}
                </Button>
              </div>
              {/* <TimesheetProgress /> */}
            </div>
            <Separator />
            <div className="mr-2 flex min-h-0 flex-grow">
              <TaskListDisplay />
            </div>
          </div>
        </ResizablePanel>
        {breakpoint !== "mobile" && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              ref={calendarPanelRef}
              defaultSize={defaultLayout[2]}
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
