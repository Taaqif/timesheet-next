import { Check, ChevronsUpDown } from "lucide-react";
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
import { cn } from "~/lib/utils";
import { TeamworkTask } from "~/server/api/routers/teamwork";
import { usePrevious } from "~/lib/hooks/use-previous";
import { MagnifyingGlassIcon, SymbolIcon } from "@radix-ui/react-icons";
import { utils } from "prettier/doc.js";

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
}: {
  tasks: TeamworkTaskWithChildren[];
  selectedTaskId?: string | null;
  onSelect: (task: TeamworkTask) => void;
  level?: number;
  parent: string;
}) => {
  return (
    <>
      {tasks.map((task, index) => (
        <>
          <CommandItem
            key={task.id}
            value={`${task.id} - ${task.content} - ${parent}`}
            onSelect={() => {
              onSelect(task);
            }}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4 flex-shrink-0",
                task.id === selectedTaskId ? "opacity-100" : "opacity-0",
              )}
            />
            <div style={{ width: `${8 * level}px`, height: "16px" }}></div>
            {task.content}
          </CommandItem>
          {task.children?.length > 0 && (
            <RenderTeamworkTaskWithChildren
              tasks={task.children}
              onSelect={onSelect}
              level={level + 1}
              parent={task.content}
              selectedTaskId={selectedTaskId}
            />
          )}
        </>
      ))}
    </>
  );
};
type TeamworkTaskGroup = {
  tasklist: string;
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
  const utils = api.useUtils();

  const [taskGroups, setTaskGroups] = useState<TeamworkTaskGroup[]>([]);
  const { data: teamworkTask, isLoading: teamworkTaskLoading } =
    api.teamwork.getTask.useQuery(
      {
        taskId: teamworkTaskId!,
      },
      {
        enabled: !!teamworkTaskId && !firstOpen,
      },
    );
  const { data: teamworkProjectTasks, isLoading: teamworkProjectTasksLoading } =
    api.teamwork.getAllProjectTasks.useQuery(
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
      const sorted = groupedByTasklist[taskListKey]?.sort(
        (a, b) => a.order - b.order,
      );

      if (sorted) {
        const tree = createDataTree(sorted);
        options.push({
          tasklist: taskListKey,
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
            if (open === false && e.key !== "Tab") {
              setOpen(true);
            }
          }}
          disabled={!projectId}
          aria-expanded={open}
          className={cn(
            "h-auto w-full justify-between whitespace-normal bg-transparent text-left font-normal",
            {
              "text-muted-foreground": !teamworkTaskId,
            },
          )}
        >
          {!projectId
            ? "Select a project first..."
            : (teamworkProjectTasksLoading || teamworkTaskLoading) &&
                !selectedTask &&
                teamworkTaskId
              ? "Fetching tasks..."
              : teamworkTaskId && selectedTask
                ? `${selectedTask?.content} (${selectedTask?.["todo-list-name"]})`
                : "Select task..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {!!projectId && (
        <PopoverContent
          className="w-full min-w-[300px] max-w-lg p-0"
          align="start"
        >
          <Command loop>
            <CommandInput
              placeholder="Search tasks..."
              rightActions={
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-1 shrink-0 opacity-50"
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
                        heading={taskGroup.tasklist}
                        key={`project_${index}`}
                      >
                        <RenderTeamworkTaskWithChildren
                          tasks={taskGroup.tasks}
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
