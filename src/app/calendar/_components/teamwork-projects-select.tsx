import { Check, ChevronsUpDown, Link } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useSessionTeamworkPerson } from "~/lib/hooks/use-task-api";

type TeamworkProjectGroup = {
  company: string;
  companyId: string;
  projects: TeamworkProject[];
};
export type TeamworkProjectsSelectProps = {
  projectId?: string | null;
  onChange: (selectedProject?: TeamworkProject) => void;
};
export const TeamworkProjectsSelect = ({
  projectId,
  onChange,
}: TeamworkProjectsSelectProps) => {
  const [open, setOpen] = useState(false);
  const [firstOpen, setFirstOpen] = useState(false);
  const [projectGroups, setProjects] = useState<TeamworkProjectGroup[]>([]);
  const { data: teamworkConfig } = api.teamwork.getTeamworkConfig.useQuery();
  const { data: teamworkProjects, isLoading: teamworkProjectsLoading } =
    api.teamwork.getAllProjects.useQuery();

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
  }, [teamworkProjects]);

  const setTeamworkProjectOptions = () => {
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
      </PopoverTrigger>
      <PopoverContent
        className="w-full min-w-[400px] max-w-lg p-0"
        align="start"
      >
        <Command loop>
          <CommandInput placeholder="Search project..." />
          <CommandEmpty>No projects found.</CommandEmpty>
          {teamworkProjectsLoading && (
            <CommandLoading>Fetching projects...</CommandLoading>
          )}
          {!teamworkProjectsLoading && (
            <CommandList>
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
                        <div className="flex">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 flex-shrink-0 group-hover:opacity-0",
                              project.id === projectId
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <a
                            href={`${teamworkConfig?.teamworkBaseUrl}/#/projects/${project.id}`}
                            target="_blank"
                            className="absolute top-0 flex h-full w-4 flex-shrink-0 items-center opacity-0 transition group-hover:opacity-100"
                          >
                            <Link className={"h-4 w-4"} />
                          </a>
                          {project.name}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};
