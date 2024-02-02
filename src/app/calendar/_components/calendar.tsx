"use client";
import React, { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TooltipProvider } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { Nav } from "./nav";
import {
  ChevronLeft,
  ChevronRight,
  File,
  Inbox,
  Search,
  Timer,
} from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { TimesheetProgress } from "./timesheet-progress";
import { CalendarDisplay } from "./calendar-display";
import { api } from "~/trpc/react";
import { TaskListDisplay } from "./task-list-display";
import { update } from "lodash";
import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
} from "~/lib/hooks/use-task-api";
import { useCalendarStore } from "~/app/_store";
import dayjs from "dayjs";

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
  const { data: activeTask } = api.task.getActiveTask.useQuery();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
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
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-4 py-4">
                <h1 className="flex-1 text-3xl">
                  {dayjs(selectedDate).format("dddd, DD MMMM YYYY")}
                </h1>
                <div className="flex gap-2">
                  <Button
                    className="mr-2"
                    variant="secondary"
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

              <div className="bg-background/95 p-4 backdrop-blur @container supports-[backdrop-filter]:bg-background/60">
                <form>
                  <div className="relative">
                    <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Task" className="pl-8" />
                  </div>
                  <div className="mt-4 flex flex-col justify-end gap-4 @md:flex-row">
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
