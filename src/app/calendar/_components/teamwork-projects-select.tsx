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
import { type TeamworkProject } from "~/server/api/routers/teamwork";
import { TeamworkTags } from "~/components/ui/teamwork-tags";

type TeamworkProjectGroup = {
  company: string;
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
  const [projectGroups, setProjects] = useState<TeamworkProjectGroup[]>([]);
  const { data: teamworkProjects, isLoading: teamworkProjectsLoading } =
    api.teamwork.getAllProjects.useQuery();

  const selectedProject = useMemo(
    () => teamworkProjects?.find((project) => project.id === projectId),
    [projectId, teamworkProjects],
  );

  useEffect(() => {
    if (teamworkProjects && teamworkProjects.length > 0) {
      setTeamworkProjectOptions();
    }
  }, [teamworkProjects]);

  const setTeamworkProjectOptions = () => {
    const userTeamworkProjects =
      teamworkProjects?.filter(
        (t) => true,
        // t.people.some((p) => +p === +teamworkPerson?.id)
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
            "h-auto w-full justify-between whitespace-normal bg-transparent text-left font-normal",
            {
              "text-muted-foreground": !projectId,
            },
          )}
        >
          {teamworkProjectsLoading
            ? "Fetching projects..."
            : projectId
              ? `${selectedProject?.name} (${selectedProject?.company?.name})`
              : "Select a project..."}
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
                    heading={projectGroup.company}
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
                      >
                        <div className="flex">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              projectId === project.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
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
