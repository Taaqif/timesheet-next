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
import { TeamworkProject } from "~/server/api/routers/teamwork";
const frameworks = [
  {
    value: "next.js",
    label: "Next.js",
  },
  {
    value: "sveltekit",
    label: "SvelteKit",
  },
  {
    value: "nuxt.js",
    label: "Nuxt.js",
  },
  {
    value: "remix",
    label: "Remix",
  },
  {
    value: "astro",
    label: "Astro",
  },
];

type TeamworkProjectGroup = {
  company: string;
  projects: TeamworkProject[];
};
export type TeamworkProjectsSelectProps = {
  projectId?: string | null;
  onChange?: (selectedProjectId: string) => void;
};
export const TeamworkProjectsSelect = ({
  projectId,
  onChange,
}: TeamworkProjectsSelectProps) => {
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? "");
  const [projectGroups, setProjects] = useState<TeamworkProjectGroup[]>([]);
  const { data: teamworkProjects, isLoading: teamworkProjectsLoading } =
    api.teamwork.getAllProjects.useQuery();

  const selectedProject = useMemo(
    () => teamworkProjects?.find((project) => project.id === selectedProjectId),
    [selectedProjectId, teamworkProjects],
  );
  useEffect(() => {
    if (teamworkProjects && teamworkProjects.length > 0) {
      setTeamworkProjectOptions();
    }
  }, [teamworkProjects]);

  useEffect(() => {
    if (projectId && projectId !== selectedProjectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId !== selectedProjectId && onChange) {
      onChange(selectedProjectId);
    }
  }, [selectedProjectId, onChange]);

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
          aria-expanded={open}
          className={cn(
            "h-auto w-full justify-between whitespace-normal bg-transparent text-left font-normal",
            {
              "text-muted-foreground": !selectedProjectId,
            },
          )}
        >
          {teamworkProjectsLoading
            ? "Fetching projects..."
            : selectedProjectId
              ? `${selectedProject?.name} (${selectedProject?.company?.name})`
              : "Select project..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
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
                          setSelectedProjectId(project.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedProjectId === project.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        {project.name}
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
