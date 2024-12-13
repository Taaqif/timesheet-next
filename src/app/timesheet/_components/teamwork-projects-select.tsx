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
import { cn } from "~/lib/utils";
import { type TeamworkProject } from "~/server/api/routers/teamwork";
import { useSessionTeamworkPerson } from "~/hooks/use-task-api";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { useBreakpoint } from "~/hooks/use-breakpoint";
import { SymbolIcon } from "@radix-ui/react-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

type TeamworkProjectGroup = {
  company: string;
  companyId: string;
  projects: TeamworkProject[];
};
export type TeamworkProjectsSelectProps = {
  projectId?: string | null;
  onChange: (selectedProject?: TeamworkProject) => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">;
export const TeamworkProjectsSelect = React.forwardRef<
  HTMLButtonElement,
  TeamworkProjectsSelectProps
>(({ projectId, onChange, ...rest }, ref) => {
  const [open, setOpen] = useState(false);
  const [firstOpen, setFirstOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [projectGroups, setProjects] = useState<TeamworkProjectGroup[]>([]);
  const { data: teamworkConfig } = api.teamwork.getTeamworkConfig.useQuery();
  const {
    data: teamworkProjects,
    isLoading: teamworkProjectsLoading,
    isFetching: teamworkProjectsFetching,
  } = api.teamwork.getAllProjects.useQuery();
  const utils = api.useUtils();

  const { data: teamworkPerson } = useSessionTeamworkPerson();
  const selectedProject = useMemo(
    () => teamworkProjects?.find((project) => project.id === projectId),
    [projectId, teamworkProjects],
  );
  useEffect(() => {
    if (firstOpen === false && open === true) {
      setFirstOpen(true);
    }
  }, [open]);

  useEffect(() => {
    if (teamworkProjects && teamworkProjects.length > 0) {
      setTeamworkProjectOptions();
    }
  }, [teamworkProjects, teamworkPerson]);
  const selectedItemRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) {
      return;
    }
    const id = setTimeout(() => {
      if (selectedItemRef) {
        selectedItemRef.current?.scrollIntoView({
          block: "center",
          inline: "center",
        });
      }
    }, 10);
    return () => clearTimeout(id);
  }, [open]);

  const setTeamworkProjectOptions = useCallback(() => {
    const userTeamworkProjects =
      teamworkProjects?.filter((t) =>
        t.people?.some((p) => p == teamworkPerson?.id),
      ) ?? [];

    // eslint-disable-next-line
    const groupedByCompany = groupBy(
      userTeamworkProjects,
      "company.name",
    ) as Record<string, TeamworkProject[]>;
    const options: TeamworkProjectGroup[] = [];

    Object.keys(groupedByCompany)
      .sort()
      .forEach((companyKey) => {
        options.push({
          company: companyKey,
          companyId:
            userTeamworkProjects.find((a) => a.company?.name === companyKey)
              ?.company?.id ?? "",
          projects: groupedByCompany[companyKey] ?? [],
        });
      });
    setProjects(options);
  }, [teamworkProjects, teamworkPerson]);
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
            if (hasFocus === false && open === false) {
              setOpen(true);
            }
          }}
          onBlur={() => {
            if (open === false) {
              setHasFocus(false);
            }
          }}
          aria-expanded={open}
          className={cn(
            "h-auto w-full min-w-0 justify-between whitespace-normal bg-transparent text-left font-normal",
            {
              "text-muted-foreground": !projectId,
            },
          )}
        >
          <span className="overflow-hidden text-ellipsis text-nowrap">
            {teamworkProjectsLoading
              ? "Fetching projects..."
              : projectId
                ? `${selectedProject?.name} (${selectedProject?.company?.name})`
                : "Select a project..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </SelectTrigger>
      <SelectContent
        className={cn("w-full min-w-[400px] max-w-lg p-0", {
          "top-[10%] translate-y-0": breakpoint === "mobile",
        })}
        align="start"
        hideClose
      >
        <Command loop>
          <CommandInput
            placeholder="Search project..."
            rightActions={
              <Button
                variant="link"
                size="icon"
                className={cn(
                  "ml-1 flex shrink-0 items-center justify-center opacity-50",
                  {
                    "animate-spin": teamworkProjectsFetching,
                  },
                )}
                onClick={async () => {
                  await utils.teamwork.getAllProjects.refetch();
                }}
              >
                <SymbolIcon className="" />
              </Button>
            }
          />
          <CommandList>
            {teamworkProjectsLoading ? (
              <CommandLoading>Fetching projects...</CommandLoading>
            ) : (
              <CommandEmpty>No projects found.</CommandEmpty>
            )}
            {!teamworkProjectsLoading && (
              <>
                {projectGroups.map((projectGroup, index) => {
                  return (
                    <CommandGroup
                      heading={
                        <span className="group flex items-center gap-2">
                          {projectGroup.company}
                          <a
                            href={`${teamworkConfig?.teamworkBaseUrl}/#/company/${projectGroup.companyId}`}
                            target="_blank"
                            className="flex h-full w-3 flex-shrink-0 items-center opacity-0 transition group-hover:opacity-100"
                          >
                            <Link className={"h-3 w-3"} />
                          </a>
                        </span>
                      }
                      key={`project_${index}`}
                    >
                      {projectGroup.projects.map((project) => (
                        <CommandItem
                          key={project.id}
                          value={`${project.name} - ${project.company?.name}`}
                          onSelect={() => {
                            if ((projectId ?? "") === (project.id ?? "")) {
                              setOpen(false);
                              return;
                            }
                            onChange(project);
                            setOpen(false);
                          }}
                          className="group relative"
                        >
                          <div
                            className="flex"
                            ref={(ref) => {
                              if (projectId === project.id) {
                                selectedItemRef.current = ref;
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 flex-shrink-0 group-hover:opacity-0",
                                project.id === projectId
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={`${teamworkConfig?.teamworkBaseUrl}/#/projects/${project.id}`}
                                  target="_blank"
                                  className="absolute top-0 flex h-full w-4 flex-shrink-0 items-center opacity-0 transition group-hover:opacity-100"
                                >
                                  <Link className={"h-4 w-4"} />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                Open in teamwork
                              </TooltipContent>
                            </Tooltip>
                            {project.name}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </>
            )}
          </CommandList>
        </Command>
      </SelectContent>
    </SelectContainer>
  );
});

TeamworkProjectsSelect.displayName = "TeamworkProjectsSelect";
