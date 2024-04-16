import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { todoBoard, todoCard, todoList, users } from "~/server/db/schema";
import { logger } from "~/logger/server";
import { and, asc, eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { v4 as uuidv4 } from "uuid";
import { api } from "~/trpc/server";

export const todoRouter = createTRPCRouter({
  getUserBoard: protectedProcedure
    .input(z.object({ userId: z.string().optional(), boardId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not find user";
      }
      const board = await ctx.db.query.todoBoard.findFirst({
        where: and(
          eq(todoBoard.userId, user.id),
          eq(todoBoard.id, input.boardId),
        ),
      });
      return board;
    }),
  getUserBoards: protectedProcedure
    .input(z.object({ userId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not find user";
      }
      let boards = await ctx.db.query.todoBoard.findMany({
        where: eq(todoBoard.userId, user.id),
      });
      if (boards.length === 0) {
        // Create a default board
        await api.todo.createUserBoard.mutate({
          board: {
            name: "My Board",
          },
          userId: user.id,
        });
        boards = await ctx.db.query.todoBoard.findMany({
          where: eq(todoBoard.userId, user.id),
        });
      }
      return boards;
    }),
  createUserBoard: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        board: createInsertSchema(todoBoard).omit({
          userId: true,
          id: true,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not find user";
      }
      const id = uuidv4();
      await ctx.db
        .insert(todoBoard)
        .values({ ...input.board, userId: user.id, id });
    }),
  updateUserBoard: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        board: createInsertSchema(todoBoard).omit({
          userId: true,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not find user";
      }
      const board = await ctx.db.query.todoBoard.findFirst({
        where: eq(todoBoard.id, input?.board.id),
      });
      if (!board) {
        logger.error(`Could not find board`);
        throw "could not find board";
      }
      await ctx.db
        .update(todoBoard)
        .set({ ...input.board })
        .where(eq(todoBoard.id, input?.board.id));
    }),
  deleteUserBoard: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        boardId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not find user";
      }
      const board = await ctx.db.query.todoBoard.findFirst({
        where: eq(todoBoard.id, input?.boardId),
      });
      if (!board) {
        logger.error(`Could not find board`);
        throw "could not find board";
      }
      await ctx.db.delete(todoBoard).where(eq(todoBoard.id, input?.boardId));
    }),
  createList: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        boardId: z.string(),
        list: createInsertSchema(todoList).omit({
          boardId: true,
          userId: true,
          id: true,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not find user";
      }
      const board = await ctx.db.query.todoBoard.findFirst({
        where: eq(todoBoard.id, input?.boardId),
      });
      if (!board) {
        logger.error(`Could not find board`);
        throw "could not find board";
      }
      const id = uuidv4();
      await ctx.db
        .insert(todoList)
        .values({ ...input.list, userId: user.id, id, boardId: board.id });
    }),
  updateList: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        list: createInsertSchema(todoList).omit({
          userId: true,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not find user";
      }
      const board = await ctx.db.query.todoBoard.findFirst({
        where: eq(todoBoard.id, input?.list.boardId),
      });
      if (!board) {
        logger.error(`Could not find board`);
        throw "could not find board";
      }
      const list = await ctx.db.query.todoList.findFirst({
        where: eq(todoList.id, input?.list.id),
      });
      if (!list) {
        logger.error(`Could not find list`);
        throw "could not find list";
      }
      await ctx.db
        .update(todoList)
        .set({ ...input.list })
        .where(eq(todoList.id, input?.list.id));
    }),
  deleteList: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        boardId: z.string(),
        listId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not find user";
      }
      const board = await ctx.db.query.todoBoard.findFirst({
        where: eq(todoBoard.id, input?.boardId),
      });
      if (!board) {
        logger.error(`Could not find board`);
        throw "could not find board";
      }
      const list = await ctx.db.query.todoList.findFirst({
        where: eq(todoList.id, input?.listId),
      });
      if (!list) {
        logger.error(`Could not find list`);
        throw "could not find list";
      }
      await ctx.db
        .delete(todoList)
        .where(
          and(
            eq(todoList.id, input?.listId),
            eq(todoList.boardId, input.boardId),
          ),
        );
    }),
  updateCard: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        card: createInsertSchema(todoCard).omit({
          userId: true,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not find user";
      }
      const board = await ctx.db.query.todoBoard.findFirst({
        where: eq(todoBoard.id, input?.card.boardId),
      });
      if (!board) {
        logger.error(`Could not find board`);
        throw "could not find board";
      }
      const list = await ctx.db.query.todoList.findFirst({
        where: eq(todoList.id, input?.card.listId),
      });
      if (!list) {
        logger.error(`Could not find list`);
        throw "could not find list";
      }
      const card = await ctx.db.query.todoCard.findFirst({
        where: eq(todoCard.id, input?.card.id),
      });
      if (!card) {
        logger.error(`Could not find card`);
        throw "could not find card";
      }
      await ctx.db
        .update(todoCard)
        .set({ ...input.card })
        .where(eq(todoCard.id, input?.card.id));
    }),
  deleteCard: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        boardId: z.string(),
        cardId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not find user";
      }
      const board = await ctx.db.query.todoBoard.findFirst({
        where: eq(todoBoard.id, input?.boardId),
      });
      if (!board) {
        logger.error(`Could not find board`);
        throw "could not find board";
      }
      const card = await ctx.db.query.todoCard.findFirst({
        where: eq(todoCard.id, input?.cardId),
      });
      if (!card) {
        logger.error(`Could not find card`);
        throw "could not find card";
      }
      await ctx.db
        .delete(todoCard)
        .where(
          and(
            eq(todoCard.id, input?.cardId),
            eq(todoCard.boardId, input.boardId),
          ),
        );
    }),
  createCard: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        boardId: z.string(),
        listId: z.string(),
        card: createInsertSchema(todoCard).omit({
          boardId: true,
          listId: true,
          userId: true,
          id: true,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not find user";
      }
      const board = await ctx.db.query.todoBoard.findFirst({
        where: eq(todoBoard.id, input.boardId),
      });
      if (!board) {
        logger.error(`Could not find board`);
        throw "could not find board";
      }
      const list = await ctx.db.query.todoList.findFirst({
        where: and(
          eq(todoList.boardId, input.boardId),
          eq(todoList.id, input.listId),
        ),
      });
      if (!list) {
        logger.error(`Could not find list`);
        throw "could not find list";
      }
      const id = uuidv4();
      await ctx.db.insert(todoCard).values({
        ...input.card,
        userId: user.id,
        id,
        boardId: board.id,
        listId: list.id,
      });
    }),
  getBoardListsCards: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        boardId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input?.userId ?? ctx.session.user.id),
      });
      if (!user) {
        logger.error(`Could not find user`);
        throw "could not create user";
      }
      const board = await ctx.db.query.todoBoard.findFirst({
        where: eq(todoBoard.id, input.boardId),
      });
      if (!board) {
        logger.error(`Could not find board`);
        throw "could not create board";
      }
      const lists = await ctx.db.query.todoList.findMany({
        where: and(eq(todoList.boardId, input.boardId)),
        orderBy: [asc(todoList.position)],
      });
      const cards = await ctx.db.query.todoCard.findMany({
        where: and(eq(todoCard.boardId, input.boardId)),
        orderBy: [asc(todoCard.position)],
      });
      // return lists?.reduce(
      //   (acc, curr) => {
      //     acc.push({
      //       ...curr,
      //       cards: cards.filter((card) => card.listId === curr.id),
      //     });
      //     return acc;
      //   },
      //   [] as ((typeof lists)[number] & { cards: typeof cards })[],
      // );
      return { lists, cards };
    }),
});
