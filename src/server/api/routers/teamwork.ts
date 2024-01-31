import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const teamworkBaseUrl = env.TEAMWORK_BASE_URL;
const teamworkApiKey = env.TEAMWORK_API_KEY;
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
  "todo-list-id"?: number;
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

export const teamworkRouter = createTRPCRouter({
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
        `${teamworkBaseUrl}/tasks/${input.taskId}.json${params.toString()}`,
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
});
