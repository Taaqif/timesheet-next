import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const teamworkBaseUrl = env.TEAMWORK_BASE_URL;
const teamworkApiKey = env.TEAMWORK_API_KEY;
const teamworkBasicAuth = `Basic ${btoa(`${teamworkApiKey}:X`)}`;

export type TeamworkProject = {
  announcement?: string;
  announcementHTML?: string;
  category?: Category;
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
  tags?: Category[];
  "tasks-start-page"?: string;
};

export type Category = {
  color?: string;
  id?: string;
  name?: string;
  projectId?: string;
};

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
    const params = new URLSearchParams({});
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
});
