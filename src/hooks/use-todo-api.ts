import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { Overwrite } from "utility-types";
import { api } from "~/trpc/react";
import type { RouterInputs, RouterOutputs } from "~/trpc/shared";
import { v4 as uuidv4 } from "uuid";

const INDEX_STEP = 65536;

export const useGetTodoBoardsQuery = () => {
  return api.todo.getUserBoards.useQuery();
};
type CreateTodoBoardPayload = Overwrite<
  RouterInputs["todo"]["createUserBoard"],
  {
    board: Omit<RouterInputs["todo"]["createUserBoard"]["board"], "id">;
  }
>;
export const useCreateTodoBoardMutation = () => {
  const utils = api.useUtils();
  const { data: session } = useSession();

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.todo.createUserBoard.useMutation({});
  const mutateAsync = async (
    payload: CreateTodoBoardPayload,
  ): Promise<RouterOutputs["todo"]["createUserBoard"]> => {
    await utils.todo.getUserBoards.cancel();

    const id = uuidv4();
    utils.todo.getUserBoards.setData(undefined, (oldQueryData) => [
      ...(oldQueryData ?? []),
      {
        ...payload.board,
        userId: session!.user.id,
        id,
      },
    ]);
    const result = await mutateAsyncOrig({
      board: {
        ...payload.board,
        id,
      },
    });
    toast("Todo board created");
    return result;
  };
  const mutate = (payload: CreateTodoBoardPayload) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};

type UpdateTodoBoardPayload = {
  board: RouterInputs["todo"]["updateUserBoard"]["board"];
};
export const useUpdateTodoBoardMutation = () => {
  const utils = api.useUtils();
  const { data: session } = useSession();

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.todo.updateUserBoard.useMutation({});
  const mutateAsync = async (
    payload: UpdateTodoBoardPayload,
  ): Promise<RouterOutputs["todo"]["updateList"]> => {
    await utils.todo.getUserBoards.cancel();
    await utils.todo.getUserBoard.cancel();

    utils.todo.getUserBoard.setData(
      { boardId: payload.board.id },
      (oldQueryData) => ({
        ...(oldQueryData ?? {}),
        ...payload.board,
        userId: session!.user.id,
      }),
    );
    utils.todo.getUserBoards.setData(undefined, (oldQueryData) =>
      oldQueryData?.map((f) => {
        if (f.id === payload.board.id) {
          return {
            ...f,
            ...payload.board,
            userId: session!.user.id,
          };
        }
        return f;
      }),
    );

    const result = await mutateAsyncOrig({
      board: {
        ...payload.board,
      },
    });
    toast("Todo board updated");
    return result;
  };
  const mutate = (payload: UpdateTodoBoardPayload) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};

type DeleteTodoBoardPayload = {
  boardId: RouterInputs["todo"]["deleteUserBoard"]["boardId"];
};
export const useDeleteTodoBoardMutation = () => {
  const utils = api.useUtils();
  const { data: session } = useSession();

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.todo.deleteUserBoard.useMutation({});
  const mutateAsync = async (
    payload: DeleteTodoBoardPayload,
  ): Promise<RouterOutputs["todo"]["updateList"]> => {
    await utils.todo.getUserBoards.cancel();
    await utils.todo.getUserBoard.cancel();

    utils.todo.getUserBoard.setData(
      { boardId: payload.boardId },
      (oldQueryData) => undefined,
    );
    utils.todo.getUserBoards.setData(undefined, (oldQueryData) =>
      oldQueryData?.filter((f) => f.id !== payload.boardId),
    );

    const result = await mutateAsyncOrig({
      boardId: payload.boardId,
    });
    toast("");
    return result;
  };
  const mutate = (payload: DeleteTodoBoardPayload) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};

export const useGetTodoBoardListsCards = ({ boardId }: { boardId: string }) => {
  return api.todo.getBoardListsCards.useQuery(
    {
      boardId: boardId,
    },
    {
      initialData: { lists: [], cards: [] },
      enabled: !!boardId,
      select: (data) => {
        return data.lists.reduce(
          (acc, curr) => {
            acc[curr.id] = {
              ...curr,
              cards: data.cards.filter((card) => card.listId === curr.id),
            };
            return acc;
          },
          {} as Record<
            string,
            (typeof data.lists)[number] & { cards: typeof data.cards }
          >,
        );
      },
    },
  );
};

type CreateTodoListPayload = Overwrite<
  RouterInputs["todo"]["createList"],
  {
    list: Omit<
      RouterInputs["todo"]["createList"]["list"],
      "userId" | "id" | "position"
    >;
  }
>;
export const useCreateTodoListMutation = () => {
  const utils = api.useUtils();
  const { data: session } = useSession();

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.todo.createList.useMutation({});
  const mutateAsync = async (
    payload: CreateTodoListPayload,
  ): Promise<RouterOutputs["todo"]["createList"]> => {
    await utils.todo.getBoardListsCards.cancel();

    const previous = utils.todo.getBoardListsCards.getData({
      boardId: payload.boardId,
    });
    const lists = previous?.lists;
    const lastList = lists?.[lists.length - 1];
    const position = (lastList?.position ?? 0) + INDEX_STEP;

    utils.todo.getBoardListsCards.setData(
      { boardId: payload.boardId },
      (oldQueryData) => ({
        lists: [
          ...(oldQueryData?.lists ?? []),
          {
            ...payload.list,
            id: uuidv4(),
            userId: session!.user.id,
            boardId: payload.boardId,
            position: position,
          },
        ],
        cards: oldQueryData?.cards ?? [],
      }),
    );

    const result = await mutateAsyncOrig({
      ...payload,
      list: {
        ...payload.list,
        position: position,
      },
    });
    toast("Todo list created");
    return result;
  };
  const mutate = (payload: CreateTodoListPayload) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};
type CreateTodoCardPayload = Overwrite<
  Omit<RouterInputs["todo"]["createCard"], "userId">,
  {
    card: Omit<RouterInputs["todo"]["createCard"]["card"], "position">;
  }
>;
export const useCreateTodoCardMutation = () => {
  const utils = api.useUtils();
  const { data: session } = useSession();

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.todo.createCard.useMutation({});
  const mutateAsync = async (
    payload: CreateTodoCardPayload,
  ): Promise<RouterOutputs["todo"]["createCard"]> => {
    await utils.todo.getBoardListsCards.cancel();

    const previous = utils.todo.getBoardListsCards.getData({
      boardId: payload.boardId,
    });
    const cards = previous?.cards;
    const listCards = cards?.filter((t) => t.listId === payload.listId);
    const lastCard = listCards?.[listCards.length - 1];
    const position = (lastCard?.position ?? 0) + INDEX_STEP;

    utils.todo.getBoardListsCards.setData(
      { boardId: payload.boardId },
      (oldQueryData) => ({
        cards: [
          ...(oldQueryData?.cards ?? []),
          {
            ...payload.card,
            id: uuidv4(),
            userId: session!.user.id,
            boardId: payload.boardId,
            listId: payload.listId,
            position: position,
          },
        ],
        lists: oldQueryData?.lists ?? [],
      }),
    );

    const result = await mutateAsyncOrig({
      ...payload,
      card: {
        ...payload.card,
        position: position,
      },
    });
    toast("Todo card created");
    return result;
  };
  const mutate = (payload: CreateTodoCardPayload) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};
type DeleteTodoListPayload = RouterInputs["todo"]["deleteList"];
export const useDeleteTodoListMutation = () => {
  const utils = api.useUtils();
  const { data: session } = useSession();

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.todo.deleteList.useMutation({});
  const mutateAsync = async (
    payload: DeleteTodoListPayload,
  ): Promise<RouterOutputs["todo"]["deleteList"]> => {
    await utils.todo.getBoardListsCards.cancel();

    utils.todo.getBoardListsCards.setData(
      { boardId: payload.boardId },
      (oldQueryData) => ({
        cards: oldQueryData?.cards ?? [],
        lists: oldQueryData?.lists.filter((f) => f.id !== payload.listId) ?? [],
      }),
    );

    const result = await mutateAsyncOrig({
      ...payload,
    });
    toast("Todo list deleted");
    return result;
  };
  const mutate = (payload: DeleteTodoListPayload) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};

type UpdateTodoListPayload = {
  list: RouterOutputs["todo"]["getBoardListsCards"]["lists"][number];
  listsOptimistic?: RouterOutputs["todo"]["getBoardListsCards"]["lists"][number][];
};
export const useUpdateTodoListMutation = () => {
  const utils = api.useUtils();
  const { data: session } = useSession();

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.todo.updateList.useMutation({});
  const mutateAsync = async (
    payload: UpdateTodoListPayload,
  ): Promise<RouterOutputs["todo"]["updateList"]> => {
    await utils.todo.getBoardListsCards.cancel();

    const previous = utils.todo.getBoardListsCards.getData({
      boardId: payload.list.boardId,
    });

    if (payload.listsOptimistic) {
      utils.todo.getBoardListsCards.setData(
        { boardId: payload.list.boardId },
        (oldQueryData) => ({
          lists: payload.listsOptimistic!,
          cards: oldQueryData?.cards ?? [],
        }),
      );
    }

    const result = await mutateAsyncOrig({
      list: {
        ...payload.list,
      },
    });
    toast("Todo list updated");
    return result;
  };
  const mutate = (payload: UpdateTodoListPayload) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};
type UpdateTodoCardPayload = {
  card: RouterOutputs["todo"]["getBoardListsCards"]["cards"][number];
  cards?: RouterOutputs["todo"]["getBoardListsCards"]["cards"][number][];
};
export const useUpdateTodoCardMutation = () => {
  const utils = api.useUtils();
  const { data: session } = useSession();

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.todo.updateCard.useMutation({});
  const mutateAsync = async (
    payload: UpdateTodoCardPayload,
  ): Promise<RouterOutputs["todo"]["updateList"]> => {
    await utils.todo.getBoardListsCards.cancel();

    const previous = utils.todo.getBoardListsCards.getData({
      boardId: payload.card.boardId,
    });

    if (payload.cards) {
      utils.todo.getBoardListsCards.setData(
        { boardId: payload.card.boardId },
        (oldQueryData) => ({
          cards: payload.cards!,
          lists: oldQueryData?.lists ?? [],
        }),
      );
    }

    const result = await mutateAsyncOrig({
      card: {
        ...payload.card,
      },
    });
    toast("Todo list updated");
    return result;
  };
  const mutate = (payload: UpdateTodoCardPayload) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};
type DeleteTodoCardPayload = RouterInputs["todo"]["deleteCard"];
export const useDeleteTodoCardMutation = () => {
  const utils = api.useUtils();
  const { data: session } = useSession();

  const {
    mutate: mutateOrig,
    mutateAsync: mutateAsyncOrig,
    ...rest
  } = api.todo.deleteCard.useMutation({});
  const mutateAsync = async (
    payload: DeleteTodoCardPayload,
  ): Promise<RouterOutputs["todo"]["deleteCard"]> => {
    await utils.todo.getBoardListsCards.cancel();

    utils.todo.getBoardListsCards.setData(
      { boardId: payload.boardId },
      (oldQueryData) => ({
        cards: oldQueryData?.cards.filter((f) => f.id !== payload.cardId) ?? [],
        lists: oldQueryData?.lists ?? [],
      }),
    );

    const result = await mutateAsyncOrig({
      ...payload,
    });
    toast("Todo card deleted");
    return result;
  };
  const mutate = (payload: DeleteTodoCardPayload) => {
    mutateAsync(payload).catch(() => {
      //noop
    });
  };
  return { mutate, mutateAsync, ...rest };
};
type PositionItem = {
  position: number;
};
export function calculatePosition(
  currentItemPosition: number | undefined,
  nextItemPosition: number | undefined,
  previousItemPosition: number | undefined,
): number {
  const nextPosition = nextItemPosition ?? -1;
  const previousPosition = previousItemPosition ?? -1;
  const currentPosition = currentItemPosition ?? -1;

  if (nextPosition === -1) {
    if (currentPosition > previousPosition) {
      return currentPosition;
    } else {
      return previousPosition + INDEX_STEP;
    }
  } else {
    if (currentPosition > previousPosition && currentPosition < nextPosition) {
      return currentPosition;
    } else if (previousPosition >= 0) {
      return (nextPosition + previousPosition) / 2;
    } else {
      return nextPosition / 2;
    }
  }
}
export function calculateNewPosition1(
  items: PositionItem[],
  currentItem: PositionItem,
  // fromIndex: number,
  toIndex: number,
): number {
  const nextItem = items[toIndex + 1];
  const previousItem = items[toIndex - 1];

  if (!currentItem) {
    throw "Could not find current item";
  }

  const nextPosition = nextItem?.position ?? -1;
  const previousPosition = previousItem?.position ?? -1;
  const currentPosition = currentItem?.position ?? -1;

  // if (fromIndex === toIndex) {
  //   return currentPosition;
  // }

  console.log(nextPosition, previousPosition, currentPosition);
  if (nextPosition === -1) {
    if (currentPosition > previousPosition) {
      return currentPosition;
    } else {
      return previousPosition + INDEX_STEP;
    }
  } else {
    if (currentPosition > previousPosition && currentPosition < nextPosition) {
      return currentPosition;
    } else if (previousPosition >= 0) {
      return (nextPosition + previousPosition) / 2;
    } else {
      return nextPosition / 2;
    }
  }
}
