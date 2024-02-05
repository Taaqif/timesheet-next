import { Check, ChevronsUpDown, Link } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
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
  return (
    <>
      {tasks.map((task, index) => (
        <React.Fragment key={`${task.id}_${index}`}>
          <CommandItem
            value={`${task.id} - ${task.content} - ${parent}`}
            onSelect={() => {
              onSelect(task);
            }}
            className="group relative"
          >
            <div className="flex">
              <Check
                className={cn(
                  "mr-2 h-4 w-4 flex-shrink-0 group-hover:opacity-0",
                  task.id === selectedTaskId ? "opacity-100" : "opacity-0",
                )}
              />
              <a
                href={`${teamworkConfig?.teamworkBaseUrl}/#/tasks/${task.id}`}
                target="_blank"
                className="absolute top-2 flex w-4 flex-shrink-0 items-center opacity-0 transition group-hover:opacity-100"
              >
                <Link className={"h-4 w-4"} />
              </a>
              <div style={{ width: `${10 * level}px`, height: "16px" }}></div>
              {task.content}
            </div>
            {task.tags && (
              <div className="mt-1 flex flex-wrap justify-end gap-2">
                <TeamworkTags tags={task.tags} />
              </div>
            )}
            {!!task["estimated-minutes"] && task["estimated-minutes"] > 0 && (
              <div className="mt-1 flex flex-wrap justify-end gap-2">
                <Badge variant="outline">
                  Est{" "}
                  {getHoursMinutesTextFromMinutes(
                    task["estimated-minutes"],
                    true,
                  )}
                </Badge>
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
};
export const TeamworkTaskSelect = ({
  projectId,
  teamworkTaskId,
  onChange,
}: TeamworkTaskSelectProps) => {
  const [open, setOpen] = useState(false);
  const [firstOpen, setFirstOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
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

  const setTeamworkProjectTasksOptions = () => {
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
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
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
      </PopoverTrigger>
      {!!projectId && (
        <PopoverContent
          className="w-full min-w-[400px] max-w-lg p-0"
          align="start"
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
            {teamworkProjectTasksLoading && (
              <CommandLoading>Fetching tasks...</CommandLoading>
            )}
            {!teamworkProjectTasksLoading && (
              <>
                <CommandEmpty>No tasks found.</CommandEmpty>
                <CommandList>
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
                </CommandList>
              </>
            )}
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
};
