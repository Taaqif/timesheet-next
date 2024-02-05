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
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
} from "~/lib/hooks/use-task-api";
import { useCalendarStore } from "~/app/_store";
import dayjs from "dayjs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ImperativePanelHandle } from "react-resizable-panels";
import { useWindowSize } from "usehooks-ts";

export type CalendarProps = {
  defaultCollapsed?: boolean;
  defaultLayout?: number[];
};
export function Calendar({
  defaultCollapsed = false,
  defaultLayout = [265, 440, 655],
}: CalendarProps) {
  const navCollapsedSize = 4;
  const calendarCollapsedSize = 8;
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const calendarPanelRef = useRef<ImperativePanelHandle>(null);

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isCalendarCollapsed, setIsCalendarCollapsed] =
    useState(defaultCollapsed);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const { data: activeTask } = api.task.getActiveTask.useQuery();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const windowSize = useWindowSize();
  const isSmallScreen = windowSize?.width <= 800;
  useEffect(() => {
    if (activeTask) {
      const now = dayjs();
      const timerStart = dayjs(activeTask.start);
      if (now.isAfter(timerStart, "day")) {
        updateTask.mutate({
          id: activeTask.id,
          task: {
            ...activeTask,
            activeTimerRunning: false,
            end: timerStart.endOf("day").toDate(),
          },
        });
      }
    }
  }, [activeTask]);

  useEffect(() => {
    if (isSmallScreen === true) {
      if (!isCalendarCollapsed) {
        setIsCalendarCollapsed(true);
      }
    }
  }, [windowSize]);

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
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={15}
          maxSize={20}
          onExpand={() => {
            setIsCollapsed(false);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              false,
            )}`;
          }}
          onCollapse={() => {
            setIsCollapsed(true);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              true,
            )}`;
          }}
          className={cn(
            isCollapsed &&
              "min-w-[50px] transition-all duration-300 ease-in-out",
          )}
        >
          <div
            className={cn(
              "flex h-[68px] items-center justify-center",
              isCollapsed ? "h-[68px]" : "px-2",
            )}
          >
            {/* <AccountSwitcher isCollapsed={isCollapsed} accounts={accounts} /> */}
          </div>
          <Separator />
          <Nav
            isCollapsed={isCollapsed}
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
            <div className="flex flex-col justify-between gap-2 px-4 py-4 @md/calendar-task-list:flex-row @md/calendar-task-list:items-center">
              <Popover
                open={isDatePickerOpen}
                onOpenChange={setIsDatePickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button variant={"ghost"} className="px-1">
                    <h1 className="flex flex-1 items-center gap-2 text-xl md:text-2xl">
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
              <div className="flex gap-2">
                <Button
                  className="mr-2"
                  variant={
                    dayjs(selectedDate).isSame(dayjs(), "day")
                      ? "outline"
                      : "secondary"
                  }
                  onClick={() => {
                    setSelectedDate(new Date());
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    setSelectedDate(
                      dayjs(selectedDate).add(-1, "day").toDate(),
                    );
                  }}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    setSelectedDate(dayjs(selectedDate).add(1, "day").toDate());
                  }}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
            <Separator />

            <div className="flex flex-col gap-4 bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex flex-col justify-end gap-4 @md/calendar-task-list:flex-row">
                {activeTask && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      if (activeTask) {
                        updateTask.mutate({
                          id: activeTask.id,
                          task: {
                            ...activeTask,
                            activeTimerRunning: false,
                            end: new Date(),
                          },
                        });
                      }
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
                    if (activeTask) {
                      updateTask.mutate({
                        id: activeTask.id,
                        task: {
                          ...activeTask,
                          activeTimerRunning: false,
                          end: new Date(),
                        },
                      });
                    }
                    createTask.mutate({
                      task: {
                        activeTimerRunning: true,
                        start: new Date(),
                      },
                    });
                  }}
                >
                  <Timer className="mr-1 h-4 w-4" />
                  {activeTask ? "Start new task" : "Start task"}
                </Button>
              </div>
              {isCalendarCollapsed && (
                <div className="h-[170px] py-4">
                  <CalendarDisplay view="timelineDayWorkHours" />
                </div>
              )}
              {/* <TimesheetProgress /> */}
            </div>
            <Separator />
            <div className="mr-2 flex min-h-0 flex-grow">
              <TaskListDisplay />
            </div>
          </div>
        </ResizablePanel>
        {!isSmallScreen && (
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
                  "min-w-[10px] transition-all duration-300 ease-in-out",
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
