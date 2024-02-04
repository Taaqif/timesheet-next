"use client";
import React, { useEffect, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { Separator } from "~/components/ui/separator";
import { TooltipProvider } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { Nav } from "./nav";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  File,
  Inbox,
  Timer,
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

export type CalendarProps = {
  defaultCollapsed?: boolean;
  defaultLayout?: number[];
};
export function Calendar({
  defaultCollapsed = false,
  defaultLayout = [265, 440, 655],
}: CalendarProps) {
  const navCollapsedSize = 4;
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const { data: activeTask } = api.task.getActiveTask.useQuery();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
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
  return (
    <div className="h-svh">
      <TooltipProvider delayDuration={0}>
        <ResizablePanelGroup
          direction="horizontal"
          onLayout={(sizes: number[]) => {
            document.cookie = `react-resizable-panels:layout=${JSON.stringify(
              sizes,
            )}`;
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
                "flex h-[52px] items-center justify-center",
                isCollapsed ? "h-[52px]" : "px-2",
              )}
            >
              {/* <AccountSwitcher isCollapsed={isCollapsed} accounts={accounts} /> */}
            </div>
            <Separator />
            <Nav
              isCollapsed={isCollapsed}
              links={[
                {
                  title: "Calendar",
                  label: "128",
                  icon: Inbox,
                  variant: "default",
                },
                {
                  title: "Drafts",
                  label: "9",
                  icon: File,
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
                      <h1 className="flex flex-1 items-center gap-1 text-xl md:text-2xl">
                        <CalendarIcon className="h-6 w-6" />
                        {dayjs(selectedDate).format("dddd, DD MMMM YYYY")}
                      </h1>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
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
                      setSelectedDate(
                        dayjs(selectedDate).add(1, "day").toDate(),
                      );
                    }}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
              <Separator />

              <div className="bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <form>
                  <div className="flex flex-col justify-end gap-4 @md/calendar-task-list:flex-row">
                    <Button
                      type="button"
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
                      Start Task
                    </Button>
                    <Button
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
                      <Timer className="mr-1 h-4 w-4" />
                      Stop Task
                    </Button>
                  </div>
                </form>
                <div className="mt-4">
                  <TimesheetProgress />
                </div>
              </div>
              <div className="mr-2 flex min-h-0 flex-grow">
                <TaskListDisplay />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={defaultLayout[2]}>
            <CalendarDisplay />
          </ResizablePanel>
        </ResizablePanelGroup>
      </TooltipProvider>
    </div>
  );
}
