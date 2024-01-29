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
import { File, Inbox, Search, Timer } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { TimesheetProgress } from "./timesheet-progress";
import { CalendarDisplay } from "./calendar-display";
import { api } from "~/trpc/react";
import { TaskListDisplay } from "./task-list-display";

export type CalendarProps = {
  defaultCollapsed?: boolean;
  defaultLayout?: number[];
};
export function Calendar({
  defaultCollapsed = false,
  defaultLayout = [265, 440, 655],
}: CalendarProps) {
  const navCollapsedSize = 4;
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const utils = api.useUtils();
  const { data: activeTimer } = api.timer.getActive.useQuery();
  const createTask = api.task.createPersonalTask.useMutation({
    async onSuccess() {
      await utils.task.getPersonalTasks.invalidate();
    },
  });
  const updateTask = api.task.updatePersonalTask.useMutation();
  const deleteTask = api.task.deletePersonalTask.useMutation();
  const startTimer = api.timer.start.useMutation({
    async onSuccess() {
      await utils.timer.invalidate();
    },
  });
  const stopTimer = api.timer.stop.useMutation({
    async onSuccess() {
      await utils.timer.invalidate();
    },
  });
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
              <div className="flex items-center px-4 py-2">
                <h1 className="text-xl font-bold">Inbox</h1>
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
                        if (activeTimer) {
                          createTask.mutate({
                            task: {
                              start: activeTimer.startedAt,
                              end: new Date(),
                            },
                          });
                        }
                        startTimer.mutate({
                          id: activeTimer?.id,
                        });
                      }}
                    >
                      <Timer className="mr-1 h-4 w-4" />
                      Start Task
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (activeTimer) {
                          createTask.mutate({
                            task: {
                              start: activeTimer.startedAt,
                              end: new Date(),
                            },
                          });
                          stopTimer.mutate({
                            id: activeTimer?.id,
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
              <div className="flex min-h-0 flex-grow">
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
