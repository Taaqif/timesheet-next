import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { formatRange, type EventInput } from "@fullcalendar/core";
import {
  type TasksWithTeamworkTaskSelectSchema,
  getHoursMinutesTextFromDates,
  CalendarEventType,
  cn,
} from "~/lib/utils";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { TeamworkProjectsSelect } from "./teamwork-projects-select";
import { TeamworkTaskSelect } from "./teamwork-task-select";
import {
  useDeleteTaskMutation,
  useUpdateTaskMutation,
} from "~/hooks/use-task-api";
import dayjs from "dayjs";
import { Clock, History } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { EventTimeSheetProgress } from "./timesheet-progress";
import { useIntersectionObserver } from "usehooks-ts";
import {
  type Period,
  TimePeriodSelect,
  TimePickerInput,
} from "~/components/ui/time-picker-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Skeleton } from "~/components/ui/skeleton";

interface TimePickerPopupProps {
  date: Date | undefined;
  timeText: string;
  disabled?: boolean;
  timeHeading: string;
  error?: string;
  setDate: (date: Date | undefined) => void;
  onApplyDateChange: () => void;
}

export function TimePickerPopup({
  date,
  disabled,
  setDate,
  onApplyDateChange,
  timeText,
  timeHeading,
  error,
}: TimePickerPopupProps) {
  const minuteRef = React.useRef<HTMLInputElement>(null);
  const hourRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [period, setPeriod] = React.useState<Period>("PM");
  const periodRef = React.useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setPeriod(dayjs(date).format("A") as Period);
  }, [date]);
  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          onApplyDateChange();
        }
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <Button variant={"ghost"} className="h-auto px-1 py-1">
          <span className={cn({ "text-red-500": !!error })}>{timeText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">{timeHeading}</h4>
          </div>
          <div className="flex items-end gap-2">
            <div className="grid gap-1 text-center">
              <Label htmlFor="hours" className="text-xs">
                Hours
              </Label>
              <TimePickerInput
                picker="12hours"
                date={date}
                period={period}
                setDate={setDate}
                ref={hourRef}
                onRightFocus={() => minuteRef.current?.focus()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onApplyDateChange();
                    setOpen(false);
                  }
                }}
              />
            </div>
            <div className="grid gap-1 text-center">
              <Label htmlFor="minutes" className="text-xs">
                Minutes
              </Label>
              <TimePickerInput
                picker="minutes"
                date={date}
                period={period}
                setDate={setDate}
                ref={minuteRef}
                onLeftFocus={() => hourRef.current?.focus()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onApplyDateChange();
                    setOpen(false);
                  }
                }}
              />
            </div>
            <div className="grid gap-1 text-center">
              <Label htmlFor="period" className="text-xs">
                Period
              </Label>
              <TimePeriodSelect
                period={period}
                setPeriod={(period) => {
                  const d = dayjs(date);
                  const hour = d.format("h");
                  const hourAdjusted = period === "AM" ? +hour : +hour + 12;
                  const dateToSet = dayjs(date).set("hour", hourAdjusted);
                  setDate(dateToSet.toDate());
                }}
                date={date}
                setDate={setDate}
                ref={periodRef}
                onLeftFocus={() => minuteRef.current?.focus()}
              />
            </div>
          </div>
          <div>
            <Button
              variant={"secondary"}
              size="sm"
              className="w-full py-0.5"
              onClick={() => {
                setOpen(false);
                onApplyDateChange();
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const formSchema = z
  .object({
    start: z.date().optional(),
    end: z.date().optional().nullable(),
    description: z.string().optional(),
    projectId: z.string().optional(),
    projectTitle: z.string().optional(),
    taskId: z.string().optional(),
    taskTitle: z.string().optional(),
    logTime: z.boolean().optional(),
    billable: z.boolean().optional(),
  })
  .refine((data) => (data.end && data.start ? data.end > data.start : true), {
    message: "End date cannot be earlier than start date.",
    path: ["end"],
  });

export type TaskListItemProps = {
  event: EventInput;
  businessHoursStartTime?: string;
  businessHoursEndTime?: string;
  defaultExpanded?: boolean;
};
export const TaskListItem = ({
  event,
  defaultExpanded,
  businessHoursStartTime,
  businessHoursEndTime,
}: TaskListItemProps) => {
  const task = event.extendedProps?.task as
    | TasksWithTeamworkTaskSelectSchema
    | undefined;
  const isActiveTimer = event.extendedProps?.type === CalendarEventType.TIMER;
  const isTaskNotSaved = (task && task.id < 0) ?? false;
  const { isIntersecting, ref: intersectionRef } = useIntersectionObserver({
    threshold: 0.5,
  });
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [startEndDiff, setStartEndDiff] = useState<string>("");
  const [endDate, setEndDate] = useState<Date>(event.end as Date);
  const [startDate, setStartDate] = useState<Date>(event.start as Date);
  const [isOpen, setIsOpen] = useState(
    isActiveTimer ||
      !task?.teamworkTask?.teamworkTaskId ||
      !event.title ||
      defaultExpanded,
  );

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

  const eventRef = useRef<HTMLDivElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",

    defaultValues: {
      start: task?.start,
      end: task?.end as undefined | Date,
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
              start: values.start ?? task.start,
              end: isActiveTimer ? task.end : values.end ?? task.end,
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
      .catch((e) => {
        console.log("error submitting form", e);
      });
  };
  const watchTeamworkTaskId = form.watch("taskId");
  const watchTeamworkProjectId = form.watch("projectId");
  const watchLogTime = form.watch("logTime");

  const updateTask = useUpdateTaskMutation();
  const deleteTask = useDeleteTaskMutation();

  useEffect(() => {
    if (isActiveTimer) {
      const interval = setInterval(() => {
        const plusOneSecond = dayjs().add(1, "second").toDate();
        updateEventTimeDisplay(event.start as Date, plusOneSecond);
      }, 1000);
      updateEventTimeDisplay(event.start as Date, new Date());
      return () => {
        clearInterval(interval);
      };
    } else {
      updateEventTimeDisplay(event.start as Date, event.end as Date);
    }
    setStartDate(event.start as Date);
  }, [event]);

  const updateEventTimeDisplay = (startDate: Date, endDate: Date) => {
    setEndDate(endDate);
    setStartTime(dayjs(startDate).format("hh:mm A"));
    setEndTime(dayjs(endDate).format("hh:mm A"));
    const diff = getHoursMinutesTextFromDates(
      startDate,
      endDate,
      true,
      isActiveTimer,
    );
    setStartEndDiff(diff ?? "-");
  };

  useEffect(() => {
    const formValues = form.getValues();
    form.reset({
      ...formValues,
      projectId: task?.teamworkTask?.teamworkProjectId ?? "",
      taskId: task?.teamworkTask?.teamworkTaskId ?? "",
      logTime: task?.logTime ?? false,
      billable: task?.billable ?? false,
      start: task?.start,
      end: task?.end as undefined | Date,
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
    if (selectedEventId === task?.id && !isIntersecting) {
      eventRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [selectedEventId]);

  return (
    <div
      className="flex scroll-m-5 flex-col gap-2 @container/event"
      ref={(ref) => {
        eventRef.current = ref;
        intersectionRef(ref);
      }}
      onMouseOut={() => {
        // setSelectedEventId(undefined);
      }}
      onMouseOver={() => {
        if (task?.id) {
          setSelectedEventId(+task.id);
        }
      }}
    >
      <div>
        <EventTimeSheetProgress
          event={event}
          businessHoursStartTime={businessHoursStartTime}
          businessHoursEndTime={businessHoursEndTime}
        />
      </div>
      <div className="text-sm text-muted-foreground">
        <span className="mr-1 flex items-center gap-1">
          {isActiveTimer && <History className="w-4" />}
          {+(task?.teamworkTask.teamworkTimeEntryId ?? 0) > 0 && (
            <Clock className="w-4" />
          )}
          {isTaskNotSaved ? (
            <Skeleton className="h-4 w-11 rounded-xl" />
          ) : (
            <FormField
              control={form.control}
              name="start"
              render={({ field }) => (
                <TimePickerPopup
                  date={startDate}
                  timeText={startTime}
                  timeHeading={"Start Time"}
                  onApplyDateChange={() => {
                    field.onChange(startDate);
                    if (startDate !== event.start) {
                      submitForm();
                    }
                  }}
                  setDate={(date) => {
                    if (date) {
                      setStartDate(date);
                    }
                  }}
                />
              )}
            />
          )}
          <span> - </span>
          {isTaskNotSaved ? (
            <Skeleton className="h-4 w-11 rounded-xl" />
          ) : (
            <FormField
              control={form.control}
              name="end"
              render={({ field }) => (
                <TimePickerPopup
                  disabled={isActiveTimer}
                  date={endDate}
                  timeText={endTime}
                  error={form.formState.errors.end?.message}
                  timeHeading={"End Time"}
                  onApplyDateChange={() => {
                    field.onChange(endDate);
                    if (endDate !== event.end) {
                      submitForm();
                    }
                  }}
                  setDate={(date) => {
                    if (date) {
                      setEndDate(date);
                    }
                  }}
                />
              )}
            />
          )}
          {!isTaskNotSaved && (
            <Badge variant="outline" className="text-muted-foreground">
              {startEndDiff}
            </Badge>
          )}
        </span>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="-mx-1 mb-2 flex h-auto w-full items-center justify-between space-x-4 whitespace-normal px-1 text-left"
          >
            {isTaskNotSaved ? (
              <Skeleton className="h-4 w-full rounded-xl" />
            ) : (
              <div className="text-base md:text-lg">{event.title}</div>
            )}
            <div>
              <CaretSortIcon className="h-5 w-5" />
              <span className="sr-only">Toggle</span>
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Form {...form}>
            <div className="grid w-full grid-cols-1 gap-4 @md/event:grid-cols-2">
              {isTaskNotSaved ? (
                <Skeleton className="h-5 rounded-xl" />
              ) : (
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem className=" grid gap-2">
                      <FormLabel className="">Project</FormLabel>
                      <FormControl>
                        <TeamworkProjectsSelect
                          ref={field.ref}
                          tabIndex={0}
                          projectId={field.value}
                          onChange={(selectedProject) => {
                            field.onChange(selectedProject?.id);
                            form.setValue("taskId", "");
                            form.setValue(
                              "projectTitle",
                              `${selectedProject?.company?.name}: ${selectedProject?.name}`,
                            );
                            setTimeout(() => {
                              form.setFocus("taskId");
                            }, 50);
                            submitForm();
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {isTaskNotSaved ? (
                <Skeleton className="h-5 rounded-xl" />
              ) : (
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
                            form.setValue(
                              "taskTitle",
                              `${selectedTeamworkTask?.content} (${selectedTeamworkTask?.["todo-list-name"]})`,
                            );
                            setTimeout(() => {
                              form.setFocus("description");
                            }, 50);
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
              )}

              {isTaskNotSaved ? (
                <Skeleton className="col-span-full h-16 rounded-xl" />
              ) : (
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.ctrlKey) {
                              descriptionRef.current?.blur();
                            }
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
              )}
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
                        <FormLabel className=" cursor-pointer ">
                          Log time
                        </FormLabel>
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
