import {
  timestamp,
  text,
  primaryKey,
  integer,
  pgTableCreator,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "@auth/core/adapters";
import { relations } from "drizzle-orm";

export const pgTable = pgTableCreator((name) => `timesheet-next_${name}`);

export const users = pgTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const userProfiles = pgTable("userProfile", {
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull().default("Etc/GMT"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    expires_in: integer("expires_in"),
    ext_expires_in: integer("expires_in"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const tasks = pgTable("task", {
  id: serial("id").primaryKey(),
  start: timestamp("start").notNull(),
  end: timestamp("end"),
  title: text("text"),
  description: text("description"),
  activeTimerRunning: boolean("activeTimerRunning").default(false),
  logTime: boolean("logTime").default(false),
  billable: boolean("billable").default(false),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  teamworkTask: one(teamworkTasks, {
    fields: [tasks.id],
    references: [teamworkTasks.taskId],
  }),
}));

export const teamworkTasks = pgTable("teamworkTask", {
  taskId: integer("taskId")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  teamworkProjectId: text("teamworkProjectId"),
  teamworkTaskId: text("teamworkTaskId"),
  teamworkTimeEntryId: text("teamworkLogTimeId"),
});
