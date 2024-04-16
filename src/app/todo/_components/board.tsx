"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { BoardContainer, BoardList, EmptyBoardList } from "./board-list";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensors,
  useSensor,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type DragCancelEvent,
  type CollisionDetection,
  pointerWithin,
  closestCenter,
  rectIntersection,
  getFirstCollision,
  type UniqueIdentifier,
  MeasuringStrategy,
  type DropAnimation,
  defaultDropAnimationSideEffects,
  PointerSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TodoCard } from "./todo-card";
import { Plus, X } from "lucide-react";
import { Card, CardHeader } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import {
  calculatePosition,
  useCreateTodoCardMutation,
  useCreateTodoListMutation,
  useGetTodoBoardListsCards,
  useUpdateTodoCardMutation,
  useUpdateTodoListMutation,
} from "~/hooks/use-todo-api";
import { Skeleton } from "@radix-ui/themes";

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};
type BoardProps = {
  boardId: string;
};
export const Board = ({ boardId }: BoardProps) => {
  const [isAddingList, setIsAddingList] = useState(false);
  const [addListName, setAddListName] = useState("");
  const createList = useCreateTodoListMutation();
  const createCard = useCreateTodoCardMutation();
  const updateList = useUpdateTodoListMutation();
  const updateCard = useUpdateTodoCardMutation();
  const addListTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const { data: boardData, isFetched } = useGetTodoBoardListsCards({
    boardId: boardId,
  });

  const [items, setItems] = useState<typeof boardData>(
    JSON.parse(JSON.stringify(boardData)) as typeof boardData,
  );
  const [clonedItems, setClonedItems] = useState<typeof boardData | null>(null);
  const [containers, setContainers] = useState(Object.keys(items));
  const recentlyMovedToNewContainer = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const isSortingContainer = activeId ? containers.includes(activeId) : false;
  const lastOverId = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0.1,
      },
    }),
  );

  useEffect(() => {
    resetBoardData();
  }, [boardData]);

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [items]);

  const resetBoardData = () => {
    setItems(JSON.parse(JSON.stringify(boardData)) as typeof boardData);
    setContainers(Object.keys(boardData));
    setAddListName("");
  };

  const addList = () => {
    if (isAddingList) {
      if (addListName.trim() === "") {
        cancelAdd();
        return;
      }
      createList.mutate({
        boardId: boardId,
        list: {
          name: addListName,
        },
      });
    } else {
      setIsAddingList(true);
      setTimeout(() => {
        if (addListTextAreaRef.current) {
          addListTextAreaRef.current.focus();
        }
      }, 10);
    }
  };
  const cancelAdd = () => {
    setIsAddingList(false);
    setAddListName("");
  };
  const findContainer = (id: UniqueIdentifier) => {
    if (id in items) {
      return id;
    }

    return Object.keys(items).find((key) =>
      items[key]?.cards.some((f) => f.id === id),
    );
  };

  const getCard = (id: UniqueIdentifier, itemsToSearch: typeof items) => {
    const container = findContainer(id);

    if (!container) {
      return null;
    }

    return itemsToSearch[container]?.cards.find((f) => f.id === id);
  };
  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
    setClonedItems(items);
  }
  async function onDragCancel({}: DragCancelEvent) {
    if (clonedItems) {
      // Reset items to their original state
      setItems(clonedItems);
    }

    setActiveId(null);
    setClonedItems(null);
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (active.id in items && over?.id) {
      const activeIndex = containers.indexOf(active.id as string);
      const overIndex = containers.indexOf(over.id as string);
      const movedList = arrayMove(containers, activeIndex, overIndex);
      const currentItemId = movedList[overIndex];
      const previousItemId = movedList[overIndex - 1];
      const nextItemId = movedList[overIndex + 1];
      const currentItem = currentItemId ? items[currentItemId] : undefined;
      const previousItem = previousItemId ? items[previousItemId] : undefined;
      const nextItem = nextItemId ? items[nextItemId] : undefined;
      const newPosition = calculatePosition(
        currentItem?.position,
        nextItem?.position,
        previousItem?.position,
      );
      if (currentItem && newPosition !== currentItem?.position) {
        currentItem.position = newPosition;
        updateList.mutate({
          list: {
            ...currentItem,
          },
        });
      }
      setContainers(movedList);
      return;
    }

    const activeContainer = findContainer(active.id);

    if (!activeContainer) {
      setActiveId(null);
      return;
    }

    const overId = over?.id;

    if (overId == null) {
      setActiveId(null);
      return;
    }

    const overContainer = findContainer(overId);

    if (overContainer) {
      const activeIndex = items[activeContainer]!.cards.findIndex(
        (f) => f.id === active.id,
      );
      const overIndex = items[overContainer]!.cards.findIndex(
        (f) => f.id === overId,
      );

      const movedList = arrayMove(
        items[overContainer]!.cards,
        activeIndex,
        overIndex,
      );
      const currentItem = movedList[overIndex];
      const previousItem = movedList[overIndex - 1];
      const nextItem = movedList[overIndex + 1];
      const newPosition = calculatePosition(
        currentItem?.position,
        nextItem?.position,
        previousItem?.position,
      );
      if (currentItem) {
        const clonedCurrentItem = getCard(currentItem.id, clonedItems!);
        if (
          newPosition !== currentItem?.position ||
          clonedCurrentItem?.listId !== currentItem.listId
        ) {
          currentItem.position = newPosition;
          updateCard.mutate({
            card: {
              ...currentItem,
            },
          });
        }
      }
      if (activeIndex !== overIndex) {
        setItems((items) => ({
          ...items,
          [overContainer]: {
            ...items[overContainer]!,
            cards: movedList,
          },
        }));
      }
    }

    setActiveId(null);
    setClonedItems(null);
  }
  function onDragOver({ active, over }: DragOverEvent) {
    const overId = over?.id;

    if (overId == null || active.id in items) {
      return;
    }

    const overContainer = findContainer(overId);
    const activeContainer = findContainer(active.id);

    if (!overContainer || !activeContainer) {
      return;
    }

    if (activeContainer !== overContainer) {
      setItems((items) => {
        const activeItems = items[activeContainer]!.cards;
        const overItems = items[overContainer]!.cards;
        const overIndex = overItems.findIndex((f) => f.id === overId);
        const activeIndex = activeItems.findIndex((f) => f.id === active.id);

        let newIndex: number;

        if (overId in items) {
          newIndex = overItems.length + 1;
        } else {
          const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top >
              over.rect.top + over.rect.height;

          const modifier = isBelowOverItem ? 1 : 0;

          newIndex =
            overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
        }

        recentlyMovedToNewContainer.current = true;

        return {
          ...items,
          [activeContainer]: {
            ...items[activeContainer]!,
            cards: items[activeContainer]!.cards.filter(
              (item) => item.id !== active.id,
            ),
          },
          [overContainer]: {
            ...items[overContainer]!,
            cards: [
              ...items[overContainer]!.cards.slice(0, newIndex),
              {
                ...items[activeContainer]!.cards[activeIndex]!,
                listId: overContainer as string,
              },
              ...items[overContainer]!.cards.slice(
                newIndex,
                items[overContainer]!.cards.length,
              ),
            ],
          },
        };
      });
    }
  }
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      if (activeId && activeId in items) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id in items,
          ),
        });
      }

      // Start by finding any intersecting droppable
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? // If there are droppables intersecting with the pointer, return those
            pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, "id");

      if (overId != null) {
        if (overId in items) {
          const containerItems = items[overId]!.cards;

          // If a container is matched and it contains items (columns 'A', 'B', 'C')
          if (containerItems.length > 0) {
            // Return the closest droppable within that container
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.some((f) => f.id === container.id),
              ),
            })[0]!.id;
          }
        }

        lastOverId.current = overId as string;

        return [{ id: overId }];
      }

      // When a draggable item moves to a new container, the layout may shift
      // and the `overId` may become `null`. We manually set the cached `lastOverId`
      // to the id of the draggable item that was moved to the new container, otherwise
      // the previous `overId` will be returned which can cause items to incorrectly shift positions
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      // If no droppable is matched, return the last match
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, items],
  );

  if (!isFetched) {
    return <EmptyBoard />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragStart={onDragStart}
      onDragCancel={onDragCancel}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <BoardContainer>
        <SortableContext
          items={containers}
          strategy={horizontalListSortingStrategy}
        >
          {containers.map((containerId) => (
            <BoardList
              key={containerId}
              list={items[containerId]!}
              cards={items[containerId]!.cards}
              onAddCard={(cardName) => {
                createCard.mutate({
                  boardId: boardId,
                  listId: containerId,
                  card: {
                    name: cardName,
                  },
                });
              }}
            />
          ))}
        </SortableContext>
        {isAddingList ? (
          <div>
            <Card className="flex w-[250px] max-w-full flex-shrink-0 snap-center flex-col bg-primary-foreground md:w-[350px]">
              <CardHeader className="space-between flex border-b-2 p-4 font-semibold">
                <Textarea
                  ref={addListTextAreaRef}
                  rows={1}
                  value={addListName}
                  onChange={(e) => {
                    setAddListName(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      cancelAdd();
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addList();
                    }
                  }}
                  className="h-auto min-h-0 resize-none rounded-none border-none bg-transparent p-0 text-base focus-visible:ring-0"
                  placeholder="Enter a title..."
                />
              </CardHeader>
              <div className="flex gap-2 p-2">
                <Button
                  variant="default"
                  className="flex-1"
                  disabled={!addListName?.trim()}
                  onClick={addList}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add list
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className=""
                  onClick={cancelAdd}
                >
                  <X className="mr-1 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-[250px] md:w-[350px]"
            onClick={addList}
          >
            <Plus className="mr-1 h-4 w-4" /> Add a list
          </Button>
        )}
      </BoardContainer>

      {"document" in window &&
        createPortal(
          <DragOverlay dropAnimation={dropAnimation}>
            {activeId ? (
              containers.includes(activeId) ? (
                <BoardList
                  isOverlay
                  list={items[activeId]!}
                  cards={items[activeId]!.cards}
                />
              ) : (
                <TodoCard card={getCard(activeId, items)!} isOverlay />
              )
            ) : null}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
};

export const EmptyBoard = () => {
  return (
    <div className="flex min-h-0 flex-1 p-4">
      <div className="flex flex-row gap-4">
        <div className="opacity-100">
          <EmptyBoardList numberOfCards={6} />
        </div>
        <div className="opacity-50">
          <EmptyBoardList numberOfCards={3} />
        </div>
        <div className="opacity-30">
          <EmptyBoardList numberOfCards={5} />
        </div>
        <div className="opacity-10">
          <Skeleton className="h-9 w-[250px]" />
        </div>
      </div>
    </div>
  );
};
