import { Check, ChevronsUpDown, Link } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
} from "~/components/ui/command";
import { api } from "~/trpc/react";
import { groupBy } from "lodash";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn, getHoursMinutesTextFromMinutes } from "~/lib/utils";
import {
  type TeamworkConfig,
  type TeamworkTask,
} from "~/server/api/routers/teamwork";
import { SymbolIcon } from "@radix-ui/react-icons";
import { TeamworkTags } from "~/components/ui/teamwork-tags";
import { Badge } from "~/components/ui/badge";
import { useBreakpoint } from "~/hooks/use-breakpoint";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import {
  TooltipContent,
  Tooltip,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

type TeamworkTaskWithChildren = TeamworkTask & {
  children: TeamworkTaskWithChildren[];
};
const createDataTree = (dataset: TeamworkTask[]) => {
  const hashTable: Record<string, TeamworkTaskWithChildren> = dataset.reduce(
    (acc, curr) => {
      curr.id = `${curr.id}`;
      acc[curr.id] = {
        ...curr,
        children: [],
      };
      return acc;
    },
    {} as Record<string, TeamworkTaskWithChildren>,
  );
  const dataTree: TeamworkTaskWithChildren[] = [];
  dataset.forEach((aData) => {
    if (aData.parentTaskId) {
      hashTable[aData.parentTaskId]?.children.push(hashTable[aData.id]!);
    } else {
      dataTree.push(hashTable[aData.id]!);
    }
  });
  return dataTree;
};
const RenderTeamworkTaskWithChildren = ({
  tasks,
  selectedTaskId,
  onSelect,
  level = 0,
  parent,
  teamworkConfig,
}: {
  tasks: TeamworkTaskWithChildren[];
  selectedTaskId?: string | null;
  onSelect: (task: TeamworkTask) => void;
  level?: number;
  parent: string;
  teamworkConfig?: TeamworkConfig;
}) => {
  const selectedTaskRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      if (selectedTaskRef) {
        selectedTaskRef.current?.scrollIntoView({
          block: "center",
          inline: "center",
        });
      }
    }, 10);
    return () => clearTimeout(id);
  }, []);
  return (
    <>
      {tasks.map((task, index) => (
        <React.Fragment key={`${task.id}_${index}`}>
          <CommandItem
            value={`${task.id} - ${task.content} - ${parent}`}
            onSelect={() => {
              onSelect(task);
            }}
            className="group relative flex-col items-start"
          >
            <div
              className="flex"
              ref={(ref) => {
                if (selectedTaskId === task.id) {
                  selectedTaskRef.current = ref;
                }
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4 flex-shrink-0 group-hover:opacity-0",
                  task.id === selectedTaskId ? "opacity-100" : "opacity-0",
                )}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`${teamworkConfig?.teamworkBaseUrl}/#/tasks/${task.id}`}
                    target="_blank"
                    className="absolute top-2 flex w-4 flex-shrink-0 items-center opacity-0 transition group-hover:opacity-100"
                  >
                    <Link className={"h-4 w-4"} />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="left">Open in teamwork</TooltipContent>
              </Tooltip>
              <div style={{ width: `${10 * level}px`, height: "16px" }}></div>
              {task.content}
              {task.completed && (
                <div className="ml-1 inline justify-end gap-2">
                  <Badge
                    variant="outline"
                    className="bg-green-800 px-2 text-white"
                  >
                    Completed
                  </Badge>
                </div>
              )}
              {!!task["estimated-minutes"] && task["estimated-minutes"] > 0 && (
                <div className="ml-1 inline justify-end gap-2">
                  <Badge variant="outline" className="px-2">
                    {getHoursMinutesTextFromMinutes(
                      task["estimated-minutes"],
                      true,
                    )}
                  </Badge>
                </div>
              )}
            </div>
            {task.tags && (
              <div className="mt-1 flex w-full flex-wrap justify-end gap-2">
                <TeamworkTags tags={task.tags} />
              </div>
            )}
          </CommandItem>
          {task.children?.length > 0 && (
            <RenderTeamworkTaskWithChildren
              tasks={task.children}
              onSelect={onSelect}
              level={level + 1}
              parent={task.content}
              selectedTaskId={selectedTaskId}
              teamworkConfig={teamworkConfig}
            />
          )}
        </React.Fragment>
      ))}
    </>
  );
};
type TeamworkTaskGroup = {
  tasklist: string;
  tasklistId: string;
  tasks: TeamworkTaskWithChildren[];
};
export type TeamworkTaskSelectProps = {
  projectId?: string | null;
  teamworkTaskId?: string | null;
  onChange: (selectedTask?: TeamworkTask) => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">;
export const TeamworkTaskSelect = React.forwardRef<
  HTMLButtonElement,
  TeamworkTaskSelectProps
>(({ projectId, teamworkTaskId, onChange, ...rest }, ref) => {
  const [open, setOpen] = useState(false);
  const [firstOpen, setFirstOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const utils = api.useUtils();

  const [taskGroups, setTaskGroups] = useState<TeamworkTaskGroup[]>([]);
  const { data: teamworkConfig } = api.teamwork.getTeamworkConfig.useQuery();
  const { data: teamworkTask, isLoading: teamworkTaskLoading } =
    api.teamwork.getTask.useQuery(
      {
        taskId: teamworkTaskId!,
      },
      {
        enabled: !!teamworkTaskId && !firstOpen,
      },
    );
  const {
    data: teamworkProjectTasks,
    isLoading: teamworkProjectTasksLoading,
    isFetching: teamworkProjectTasksFetching,
  } = api.teamwork.getAllProjectTasks.useQuery(
    {
      projectId: projectId!,
      includeCompleted: showCompleted,
    },
    {
      enabled: !!projectId && firstOpen,
    },
  );

  const selectedTask = useMemo(
    () =>
      teamworkProjectTasks?.find((task) => task.id === teamworkTaskId) ??
      teamworkTask,
    [teamworkTaskId, teamworkProjectTasks, teamworkTask],
  );
  useEffect(() => {
    if (firstOpen === false && open === true) {
      setFirstOpen(true);
    }
  }, [open]);
  useEffect(() => {
    if (teamworkProjectTasks && teamworkProjectTasks.length > 0) {
      setTeamworkProjectTasksOptions();
    }
  }, [teamworkProjectTasks]);

  const setTeamworkProjectTasksOptions = useCallback(() => {
    // eslint-disable-next-line
    const groupedByTasklist = groupBy(
      teamworkProjectTasks,
      "todo-list-name",
    ) as Record<string, TeamworkTask[]>;
    const options: TeamworkTaskGroup[] = [];

    Object.keys(groupedByTasklist).forEach((taskListKey) => {
      const tasklistId = groupedByTasklist[taskListKey]?.find(
        (a) => a["todo-list-name"] === taskListKey,
      )?.["todo-list-id"];
      const sorted = groupedByTasklist[taskListKey]?.sort(
        (a, b) => a.order - b.order,
      );

      if (sorted) {
        const tree = createDataTree(sorted);
        options.push({
          tasklist: taskListKey,
          tasklistId: tasklistId!,
          tasks: tree ?? [],
        });
      }
    });
    setTaskGroups(options);
  }, [teamworkProjectTasks]);

  const { breakpoint } = useBreakpoint();

  const SelectContainer: typeof Popover | typeof Dialog =
    breakpoint === "mobile" ? Dialog : Popover;
  const SelectTrigger: typeof PopoverTrigger | typeof DialogTrigger =
    breakpoint === "mobile" ? DialogTrigger : PopoverTrigger;
  const SelectContent: typeof PopoverContent | typeof DialogContent =
    breakpoint === "mobile" ? DialogContent : PopoverContent;

  return (
    <SelectContainer open={open} onOpenChange={setOpen}>
      <SelectTrigger asChild>
        <Button
          ref={(e) => {
            buttonRef.current = e;
            if (typeof ref === "function") {
              ref(e);
            } else if (ref) {
              ref.current = e;
            }
          }}
          variant="outline"
          {...rest}
          role="combobox"
          onClick={(e) => {
            // handle the event using mouse down instead
            e.preventDefault();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (open === false) {
              setHasFocus(true);
            }
            setOpen(!open);
          }}
          onKeyDown={(e) => {
            if (open === false && e.key !== "Tab" && !e.shiftKey) {
              setOpen(true);
            }
          }}
          onFocus={() => {
            setHasFocus(true);
            if (hasFocus === false) {
              setOpen(true);
            }
          }}
          onBlur={() => {
            if (open === false) {
              setHasFocus(false);
            }
          }}
          disabled={!projectId}
          aria-expanded={open}
          className={cn(
            "h-auto w-full min-w-0 justify-between whitespace-normal bg-transparent text-left font-normal",
            {
              "text-muted-foreground": !teamworkTaskId,
            },
          )}
        >
          <span className="overflow-hidden text-ellipsis text-nowrap">
            {!projectId
              ? "Select a project first..."
              : (teamworkProjectTasksLoading || teamworkTaskLoading) &&
                  !selectedTask &&
                  teamworkTaskId
                ? "Fetching tasks..."
                : teamworkTaskId && selectedTask
                  ? `${selectedTask?.content} (${selectedTask?.["todo-list-name"]})`
                  : "Select task..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </SelectTrigger>
      {!!projectId && (
        <SelectContent
          className={cn("w-full min-w-[400px] max-w-lg p-0", {
            "top-[10%] mx-2 translate-y-0": breakpoint === "mobile",
          })}
          align="start"
          hideClose
        >
          <Command loop>
            <CommandInput
              placeholder="Search tasks..."
              rightActions={
                <Button
                  variant="link"
                  size="icon"
                  className={cn(
                    "ml-1 flex shrink-0 items-center justify-center opacity-50",
                    {
                      "animate-spin": teamworkProjectTasksFetching,
                    },
                  )}
                  onClick={async () => {
                    await utils.teamwork.getAllProjectTasks.refetch({
                      projectId: projectId,
                    });
                  }}
                >
                  <SymbolIcon className="" />
                </Button>
              }
            />
            {!teamworkProjectTasksLoading && (
              <Tabs
                value={showCompleted ? "completed" : "active"}
                onValueChange={(value) => {
                  setShowCompleted(value === "completed");
                }}
              >
                <TabsList className="w-full rounded-none border-b bg-transparent">
                  <TabsTrigger value="active" className="!shadow-none">
                    Active Tasks
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="!shadow-none">
                    Include Completed Tasks
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <CommandList>
              {teamworkProjectTasksLoading ? (
                <CommandLoading>Fetching tasks...</CommandLoading>
              ) : (
                <CommandEmpty>No tasks found.</CommandEmpty>
              )}
              {!teamworkProjectTasksLoading && (
                <>
                  {taskGroups.map((taskGroup, index) => {
                    return (
                      <CommandGroup
                        heading={
                          <span className="group flex items-center gap-2">
                            {taskGroup.tasklist}
                            <a
                              href={`${teamworkConfig?.teamworkBaseUrl}/#/tasklists/${taskGroup.tasklistId}`}
                              target="_blank"
                              className="flex h-full w-3 flex-shrink-0 items-center opacity-0 transition group-hover:opacity-100"
                            >
                              <Link className={"h-3 w-3"} />
                            </a>
                          </span>
                        }
                        key={`project_${index}`}
                      >
                        <RenderTeamworkTaskWithChildren
                          tasks={taskGroup.tasks}
                          teamworkConfig={teamworkConfig}
                          parent={taskGroup.tasklist}
                          selectedTaskId={teamworkTaskId}
                          onSelect={(task) => {
                            if ((task.id ?? "") === (teamworkTaskId ?? "")) {
                              setOpen(false);
                              return;
                            }
                            onChange(task);
                            setOpen(false);
                          }}
                        />
                      </CommandGroup>
                    );
                  })}
                </>
              )}
            </CommandList>
          </Command>
        </SelectContent>
      )}
    </SelectContainer>
  );
});

TeamworkTaskSelect.displayName = "TeamworkTaskSelect";
