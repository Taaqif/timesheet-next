import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { formatRange, type EventInput } from "@fullcalendar/core";
import {
  type TasksWithTeamworkTaskSelectSchema,
  getHoursMinutesTextFromDates,
} from "~/lib/utils";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { TeamworkProjectsSelect } from "./teamwork-projects-select";
import { TeamworkTaskSelect } from "./teamwork-task-select";
import { useDeleteTask, useUpdateTask } from "~/lib/hooks/use-task-api";
import dayjs from "dayjs";
import { History } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { useCalendarStore } from "~/app/_store";
import { Checkbox } from "~/components/ui/checkbox";
import { Switch } from "~/components/ui/switch";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

const formSchema = z.object({
  description: z.string().optional(),
  projectId: z.string().optional(),
  projectTitle: z.string().optional(),
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
  logTime: z.boolean().optional(),
  billable: z.boolean().optional(),
});

export type TaskListItemProps = { event: EventInput };
export const TaskListItem = ({ event }: TaskListItemProps) => {
  const task = event.extendedProps?.task as
    | TasksWithTeamworkTaskSelectSchema
    | undefined;
  const isActiveTimer = event.extendedProps?.type === "TIMER";
  const [time, setTime] = useState<string>("");
  const [endDate, setEndDate] = useState<Date>(event.end as Date);

  const selectedEventId = useCalendarStore((s) => s.selectedEventId);
  const setSelectedEventId = useCalendarStore((s) => s.setSelectedEventId);
  const { data: teamworkProjects } = api.teamwork.getAllProjects.useQuery();
  const { data: selectedTeamworkTask } = api.teamwork.getTask.useQuery(
    {
      taskId: task?.teamworkTask?.teamworkTaskId ?? "",
    },
    {
      enabled: !!task?.teamworkTask?.teamworkTaskId,
    },
  );
  const selectedProject = useMemo(
    () =>
      teamworkProjects?.find(
        (project) => project.id === task?.teamworkTask?.teamworkProjectId,
      ),
    [task?.teamworkTask?.teamworkProjectId, teamworkProjects],
  );

  const eventRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",

    defaultValues: {
      description: task?.description ?? "",
      projectId: task?.teamworkTask?.teamworkProjectId ?? "",
      taskId: task?.teamworkTask?.teamworkTaskId ?? "",
      logTime: task?.logTime ?? false,
      billable: task?.billable ?? false,
    },
  });

  const submitForm = () => {
    form
      .handleSubmit(async (values: z.infer<typeof formSchema>) => {
        if (task) {
          let title = task.title;
          if (values.projectId && !values.taskId) {
            title = `${values.projectTitle}`;
          } else if (values.taskId) {
            title = `${values.projectTitle} - ${values.taskTitle}`;
          }
          updateTask.mutate({
            id: task.id,
            task: {
              ...task,
              title: title,
              description: values.description,
              logTime: values.logTime,
              billable: values.billable,
            },
            teamworkTask: {
              ...task.teamworkTask,
              teamworkTaskId: values.taskId ?? task.teamworkTask.teamworkTaskId,
              teamworkProjectId:
                values.projectId ?? task.teamworkTask.teamworkProjectId,
            },
          });
        }
      })()
      .catch(() => {
        console.log("error");
      });
  };
  const watchTeamworkTaskId = form.watch("taskId");
  const watchTeamworkProjectId = form.watch("projectId");
  const watchLogTime = form.watch("logTime");

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    if (isActiveTimer) {
      const interval = setInterval(() => {
        const plusOneSecond = dayjs().add(1, "second").toDate();
        updateEventTimeDisplay(plusOneSecond);
      }, 1000);
      updateEventTimeDisplay(new Date());
      return () => {
        clearInterval(interval);
      };
    } else {
      updateEventTimeDisplay(event.end as Date);
    }
  }, [event]);

  const updateEventTimeDisplay = (endDate: Date) => {
    setEndDate(endDate);
    setTime(
      formatRange(event.start!, endDate, {
        hour: "numeric",
        minute: "numeric",
      }),
    );
  };

  useEffect(() => {
    const formValues = form.getValues();
    form.reset({
      ...formValues,
      projectId: task?.teamworkTask?.teamworkProjectId ?? "",
      taskId: task?.teamworkTask?.teamworkTaskId ?? "",
      logTime: task?.logTime ?? false,
      billable: task?.billable ?? false,
      description:
        document.activeElement !== descriptionRef.current
          ? task?.description ?? ""
          : formValues.description,
    });
  }, [event]);

  useEffect(() => {
    if (selectedTeamworkTask) {
      form.setValue(
        "taskTitle",
        `${selectedTeamworkTask?.content} (${selectedTeamworkTask?.["todo-list-name"]})`,
      );
    }
  }, [selectedTeamworkTask]);

  useEffect(() => {
    if (selectedProject) {
      form.setValue(
        "projectTitle",
        `${selectedProject?.company?.name}: ${selectedProject?.name}`,
      );
    }
  }, [selectedProject]);

  useEffect(() => {
    const activeElement = document.activeElement;
    const tag = activeElement?.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") {
      return;
    }
    if (selectedEventId === event.id) {
      eventRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [selectedEventId]);

  return (
    <div
      className="flex scroll-m-5 flex-col gap-2 @container/event"
      ref={eventRef}
      onMouseEnter={() => {
        // setSelectedEventId(event.id);
      }}
    >
      <div className="text-sm text-muted-foreground">
        <span className="mr-1 flex items-center gap-1">
          {isActiveTimer && <History className="w-4" />}
          <span>{time}</span>
          <Badge variant="outline" className="text-muted-foreground">
            {getHoursMinutesTextFromDates(
              event.start!,
              endDate,
              true,
              isActiveTimer,
            )}
          </Badge>
        </span>
      </div>
      <div className="mb-2 text-lg">{event.title}</div>
      <Form {...form}>
        <div className="grid w-full grid-cols-1 gap-4 @md/event:grid-cols-2">
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem className=" grid gap-2">
                <FormLabel className="">Project</FormLabel>
                <FormControl>
                  <TeamworkProjectsSelect
                    ref={field.ref}
                    projectId={field.value}
                    onChange={(selectedProject) => {
                      field.onChange(selectedProject?.id);
                      form.setValue("taskId", "");
                      form.setFocus("taskId");
                      form.setValue(
                        "projectTitle",
                        `${selectedProject?.company?.name}: ${selectedProject?.name}`,
                      );
                      submitForm();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="taskId"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel className="">Task</FormLabel>
                <FormControl>
                  <TeamworkTaskSelect
                    ref={field.ref}
                    projectId={watchTeamworkProjectId}
                    teamworkTaskId={field.value}
                    onChange={(selectedTeamworkTask) => {
                      field.onChange(selectedTeamworkTask?.id);
                      form.setFocus("description");
                      form.setValue(
                        "taskTitle",
                        `${selectedTeamworkTask?.content} (${selectedTeamworkTask?.["todo-list-name"]})`,
                      );
                      if (!task?.teamworkTask?.teamworkTimeEntryId) {
                        form.setValue("billable", true);
                        form.setValue("logTime", true);
                      }
                      submitForm();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="col-span-full grid gap-2">
                <FormLabel className="">Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add some notes..."
                    {...field}
                    ref={(e) => {
                      field.ref(e);
                      descriptionRef.current = e;
                    }}
                    onBlur={() => {
                      field.onBlur();
                      if (form.formState.dirtyFields.description) {
                        submitForm();
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {watchTeamworkTaskId && (
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="logTime"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        {...field}
                        value=""
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (
                            !task?.teamworkTask?.teamworkTimeEntryId &&
                            checked
                          ) {
                            form.setValue("billable", true);
                          }
                          submitForm();
                        }}
                      />
                    </FormControl>
                    <FormLabel className=" cursor-pointer ">Log time</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchLogTime && (
                <FormField
                  control={form.control}
                  name="billable"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <Switch
                        {...field}
                        value=""
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          submitForm();
                        }}
                      />
                      <FormLabel className="">Billable</FormLabel>
                      <FormControl></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}
          <div className="col-span-full flex justify-end gap-4">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (task) {
                  deleteTask.mutate({
                    id: task.id,
                  });
                }
              }}
            >
              Delete
            </Button>
            {/* <Button */}
            {/*   size="sm" */}
            {/*   variant="outline" */}
            {/*   onClick={() => { */}
            {/*     submitForm(); */}
            {/*   }} */}
            {/* > */}
            {/*   Save */}
            {/* </Button> */}
          </div>
        </div>
      </Form>
    </div>
  );
};
