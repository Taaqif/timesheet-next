import { z } from "zod";
import { env } from "~/env";
import { logger } from "~/logger/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const teamworkBaseUrl = env.TEAMWORK_BASE_URL;
const teamworkApiKey = env.TEAMWORK_API_KEY;
export const teamworkCompanyId = "";
const teamworkBasicAuth = `Basic ${btoa(`${teamworkApiKey}:X`)}`;

export type TeamworkProject = {
  announcement?: string;
  announcementHTML?: string;
  category?: Tag;
  company?: Company;
  completedByUserFirstName?: string;
  completedByUserId?: string;
  completedByUserLastName?: string;
  completedOn?: Date;
  "created-on"?: Date;
  defaultPrivacy?: string;
  defaults?: Defaults;
  description?: string;
  endDate?: string;
  id: string;
  isBillable?: boolean;
  isOnBoardingProject?: boolean;
  isProjectAdmin?: boolean;
  isSampleProject?: boolean;
  "last-changed-on"?: Date;
  logo?: string;
  name?: string;
  notifyeveryone?: boolean;
  "overview-start-page"?: string;
  privacyEnabled?: boolean;
  replyByEmailEnabled?: boolean;
  "show-announcement"?: boolean;
  starred?: boolean;
  startDate?: string;
  "start-page"?: string;
  status?: string;
  subStatus?: string;
  tags?: Tag[];
  "tasks-start-page"?: string;
  people?: string[];
};
export interface TeamworkTask {
  id: string;
  boardColumn?: BoardColumnProperties;
  canComplete?: string;
  "comments-count"?: number;
  description?: string;
  "has-reminders"?: string;
  "has-unread-comments"?: string;
  /**
   * Private will return a 0, 1 or 2. An open task will be ‘0’, A private task will be ‘1’ and a task which is in a private list will be a ‘2’ as it will inherit the privacy from the parent task list (or parent task)
   */
  private?: number;
  content: string;
  order: number;
  "project-id"?: string;
  "project-name"?: string;
  "todo-list-id"?: string;
  "todo-list-name"?: string;
  "tasklist-private"?: string;
  "tasklist-isTemplate"?: string;
  /**
   * Status is the current status of the task and could be one of the following: deleted, completed, reopened, new
   */
  status?: string;
  "company-name"?: string;
  "company-id"?: number;
  "creator-id"?: number;
  "creator-firstname"?: string;
  "creator-lastname"?: string;
  "updater-id"?: number;
  "updater-firstname"?: string;
  "updater-lastname"?: string;
  completed?: boolean;
  completed_on?: string;
  "start-date"?: string;
  /**
   * If the task has a defined due date, this will be set. Otherwise, it will be empty.
   */
  "due-date-base"?: string;
  /**
   * If a task due date is defined, it will be returned in this field matching due date base. If there is no task due date set, but a milestone is assoicated, it will return the milestone due date.
   */
  "due-date"?: string;
  "created-on"?: string;
  "last-changed-on"?: string;
  position?: number;
  "estimated-minutes"?: number;
  priority?: string;
  progress?: number;
  "harvest-enabled"?: boolean;
  parentTaskId?: string;
  lockdownId?: number;
  "tasklist-lockdownId"?: number;
  /**
   * Dependencies on tasks can either be 0 for none, 1 for yes but task can be started, and 2 for task is blocked by a dependency.
   */
  "has-dependencies"?: number;
  "has-predecessors"?: number;
  hasTickets?: boolean;
  timeIsLogged?: boolean;
  "attachments-count"?: number;
  predecessors?: string[];
  canEdit?: string;
  viewEstimatedTime?: boolean;
  "creator-avatar-url"?: string;
  canLogTime?: boolean;
  userFollowingComments?: string;
  userFollowingChanges?: string;
  tags?: Tag[];
  /**
   * DLM is a time stamp and stands for Date Last Modified. We use this internally for our caching system to make sure we can return data to the API calls quickly. Its not guaranteed to be in the response and can be safely ignored if you see it.
   */
  DLM?: string;
}

export interface BoardColumnProperties {
  id?: number;
  name?: string;
  color?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

export type Company = {
  id?: string;
  "is-owner"?: string;
  name?: string;
};

export type Defaults = {
  privacy?: string;
};
export interface TeamworkPerson {
  "avatar-url"?: string;
  "last-changed-on"?: string;
  "email-address"?: string;
  "last-login"?: string;
  "address-country"?: string;
  textFormat?: string;
  "user-name"?: string;
  id?: string;
  "phone-number-fax"?: string;
  "site-owner"?: boolean;
  "address-city"?: string;
  "company-name"?: string;
  "user-invited-date"?: string;
  "user-type"?: string;
  "phone-number-mobile"?: string;
  useShorthandDurations?: boolean;
  "address-zip"?: string;
  openId?: string;
  "phone-number-office"?: string;
  "im-handle"?: string;
  twoFactorAuthEnabled?: boolean;
  tags?: object[];
  "has-access-to-new-projects"?: boolean;
  "last-active"?: string;
  "im-service"?: string;
  deleted?: string;
  notes?: string;
  "in-owner-company"?: boolean;
  "user-invited-status"?: string;
  profile?: string;
  userUUID?: string;
  "user-invited"?: string;
  "created-at"?: string;
  companyId?: string;
  "phone-number-home"?: string;
  "profile-text"?: string;
  "company-id"?: string;
  pid?: string;
  "address-line-2"?: string;
  "address-state"?: string;
  "login-count"?: string;
  "address-line-1"?: string;
  administrator?: string;
  "email-alt-1"?: string;
  "email-alt-2"?: string;
  "email-alt-3"?: string;
  "last-name"?: string;
  title?: string;
  "first-name"?: string;
  "phone-number-office-ext"?: string;
  twitter?: string;
  lengthOfDay?: string;
}
export interface TimeEntry {
  description?: string;
  "person-id"?: string;
  date: string;
  time: string;
  hours: number;
  minutes: number;
  isbillable?: boolean;
  tags?: string;
}

const TimeEntrySchema = z.object({
  description: z.string().optional(),
  "person-id": z.string().optional(),
  date: z.string(),
  time: z.string(),
  hours: z.number(),
  minutes: z.number(),
  isbillable: z.boolean().optional(),
  tags: z.string().optional(),
}) satisfies z.ZodType<TimeEntry>;

export type TeamworkConfig = {
  teamworkBaseUrl: string;
};
export const teamworkRouter = createTRPCRouter({
  getTeamworkConfig: protectedProcedure.query(async ({ ctx, input }) => {
    return {
      teamworkBaseUrl,
    } as TeamworkConfig;
  }),

  getAllProjects: protectedProcedure.query(async ({ ctx, input }) => {
    const params = new URLSearchParams({
      status: "active",
      includeCustomFields: "true",
      includePeople: "true",
    });
    const response = await fetch(
      `${teamworkBaseUrl}/projects.json?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: teamworkBasicAuth,
        },
      },
    );
    const projects = (await response.json()) as {
      status: string;
      projects: TeamworkProject[];
    };
    return projects.projects;
  }),
  getTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const params = new URLSearchParams({});
      const response = await fetch(
        `${teamworkBaseUrl}/tasks/${input.taskId}.json?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: teamworkBasicAuth,
          },
        },
      );
      const task = (await response.json()) as {
        status: string;
        ["todo-item"]: TeamworkTask;
      };
      // the API returns the id as a number
      const taskToReturn: TeamworkTask = {
        ...task["todo-item"],
        id: `${task["todo-item"].id}`,
      };
      return taskToReturn;
    }),
  getAllProjectTasks: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        includeCompleted: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const getTeamworkItemsForProjectPaged = async (
        items?: TeamworkTask[],
        page?: number,
      ): Promise<TeamworkTask[]> => {
        let _items: TeamworkTask[] = items ?? [];
        const _page = page ?? 1;
        const params = new URLSearchParams({
          page: _page.toString(),
          pageSize: "250",
          includeCompletedTasks: input.includeCompleted ? "true" : "false",
        });
        const response = await fetch(
          `${teamworkBaseUrl}/projects/${input.projectId}/tasks.json?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: teamworkBasicAuth,
            },
          },
        );
        const tasks = (await response.json()) as {
          status: string;
          ["todo-items"]: TeamworkTask[];
        };
        const tasksToReturn = tasks["todo-items"].map((task) => ({
          ...task,
          id: `${task.id}`,
        }));
        _items = _items.concat(tasksToReturn);
        if (tasks["todo-items"].length === 250) {
          return getTeamworkItemsForProjectPaged(_items, _page + 1);
        } else {
          return _items;
        }
      };
      const allItems = await getTeamworkItemsForProjectPaged();
      return allItems;
    }),
  getPeopleBySearchTerm: protectedProcedure
    .input(
      z.object({
        searchTerm: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const params = new URLSearchParams({
        searchTerm: input.searchTerm,
      });
      const response = await fetch(
        `${teamworkBaseUrl}/people.json?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: teamworkBasicAuth,
          },
        },
      );
      const { people } = (await response.json()) as {
        status: string;
        people: TeamworkPerson[];
      };
      return people;
    }),
  getPeopleInCompany: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const params = new URLSearchParams({});
      const response = await fetch(
        `${teamworkBaseUrl}/companies/${input.companyId}/people.json?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: teamworkBasicAuth,
          },
        },
      );
      const { people } = (await response.json()) as {
        status: string;
        people: TeamworkPerson[];
      };
      return people;
    }),

  createTimeEntryForTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        timeEntry: TimeEntrySchema,
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("creating time entry", input);
      const response = await fetch(
        `${teamworkBaseUrl}/tasks/${input.taskId}/time_entries.json`,
        {
          method: "POST",
          body: JSON.stringify({
            "time-entry": input.timeEntry,
          }),
          headers: {
            Authorization: teamworkBasicAuth,
            "content-type": "application/json",
          },
        },
      );
      const responseJson = (await response.json()) as {
        timeLogId: string;
        status: string;
      };
      const { timeLogId } = responseJson;
      if (!timeLogId) {
        logger.error("could not create time entry");
        throw "could not create time entry";
      }
      logger.info("created time entry", responseJson);

      return timeLogId;
    }),
  updateTimeEntry: protectedProcedure
    .input(
      z.object({
        timeEntryId: z.string(),
        timeEntry: TimeEntrySchema,
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("updating time entry", input);
      const response = await fetch(
        `${teamworkBaseUrl}/time_entries/${input.timeEntryId}.json`,
        {
          method: "PUT",
          body: JSON.stringify({ "time-entry": input.timeEntry }),
          headers: {
            Authorization: teamworkBasicAuth,
          },
        },
      );
      const responseJson = (await response.json()) as {
        status: string;
      };
      logger.info("updated time entry", responseJson);
    }),
  deleteTimeEntry: protectedProcedure
    .input(
      z.object({
        timeEntryId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      logger.info("deleting time entry", input);
      const response = await fetch(
        `${teamworkBaseUrl}/time_entries/${input.timeEntryId}.json`,
        {
          method: "DELETE",
          headers: {
            Authorization: teamworkBasicAuth,
          },
        },
      );
      const responseJson = (await response.json()) as {
        status: string;
      };
      logger.info("deleted time entry", responseJson);
    }),
  getTimeEntry: protectedProcedure
    .input(
      z.object({
        timeEntryId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const response = await fetch(
        `${teamworkBaseUrl}/time_entries/${input.timeEntryId}.json`,
        {
          method: "GET",
          headers: {
            Authorization: teamworkBasicAuth,
          },
        },
      );
      const { "time-entry": timeEntry } = (await response.json()) as {
        ["time-entry"]: TimeEntry;
        status: string;
      };
      return timeEntry;
    }),
  getAllStaffMemberTimeEntries: protectedProcedure
    .input(
      z.object({
        staffMember: z.string(),
        from: z.string(),
        to: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const params = new URLSearchParams({
        userId: input.staffMember,
        fromdate: input.from,
        todate: input.to,
      });
      const response = await fetch(
        `${teamworkBaseUrl}/time_entries.json?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: teamworkBasicAuth,
          },
        },
      );
      const { "time-entries": timeEntries } = (await response.json()) as {
        ["time-entries"]: TimeEntry[];
        status: string;
      };
      return timeEntries;
    }),
});
