import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDndContext } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useRef, useState } from "react";
import { type TodoCardType, TodoCard } from "./todo-card";
import { cva } from "class-variance-authority";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Check, GripVertical, Pencil, Plus, X } from "lucide-react";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { type RouterOutputs } from "~/trpc/shared";
import { Input } from "~/components/ui/input";
import {
  useCreateTodoCardMutation,
  useDeleteTodoListMutation,
  useUpdateTodoListMutation,
} from "~/hooks/use-todo-api";
import { cn } from "~/lib/utils";
import { Textarea } from "~/components/ui/textarea";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";

export type BoardListType =
  RouterOutputs["todo"]["getBoardListsCards"]["lists"][number];

interface BoardListProps {
  list: BoardListType;
  cards: TodoCardType[];
  isOverlay?: boolean;
  onAddCard?: (name: string) => void;
}

export function BoardList({
  list,
  cards,
  isOverlay,
  onAddCard,
}: BoardListProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [addCardName, setAddCardName] = useState("");
  const addListTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const cardContentRef = useRef<HTMLDivElement>(null);
  const addCardTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const updateList = useUpdateTodoListMutation();
  const deleteList = useDeleteTodoListMutation();
  const [editContent, setEditContent] = useState(list.name);
  const [isEdit, setIsEdit] = useState(false);
  const tasksIds = useMemo(() => {
    return cards.map((task) => task.id);
  }, [cards]);
  useEffect(() => {
    setAddCardName("");
  }, [cards]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    attributes: {
      roleDescription: `Column: ${list.name}`,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const variants = cva(
    "w-[350px] max-w-full bg-primary-foreground flex flex-col flex-shrink-0 snap-center",
    {
      variants: {
        dragging: {
          default: "border-2 border-transparent",
          over: "opacity-30",
          overlay: "ring-2 ring-primary",
        },
      },
    },
  );
  const addCard = () => {
    if (isAddingCard) {
      if (addCardName.trim() === "") {
        cancelAdd();
        return;
      }
      if (onAddCard) {
        onAddCard(addCardName);
      }
      // setAddCardName("");
    } else {
      setIsAddingCard(true);
      setAddCardName("");
      setTimeout(() => {
        if (addCardTextAreaRef.current) {
          addCardTextAreaRef.current.focus();
        }
      }, 1);
    }
  };
  const cancelAdd = () => {
    setIsAddingCard(false);
    setAddCardName("");
  };
  const edit = () => {
    setIsEdit(true);
    setTimeout(() => {
      if (addListTextAreaRef.current) {
        addListTextAreaRef.current.focus();
        // textAreaRef.current.select();
        addListTextAreaRef.current.selectionStart = 0;
        addListTextAreaRef.current.selectionEnd =
          addListTextAreaRef.current.value.length;
      }
    }, 10);
  };

  const save = () => {
    if (editContent.trim() === "") {
      reset();
      return;
    }
    setIsEdit(false);
    if (editContent !== list.name) {
      list.name = editContent;
      updateList.mutate({
        list: {
          ...list,
        },
      });
    }
  };
  const deleteItem = () => {
    setIsEdit(false);
    deleteList.mutate({
      listId: list.id,
      boardId: list.boardId,
    });
  };
  const reset = () => {
    setEditContent(list.name);
    setIsEdit(false);
  };

  return (
    <div ref={setNodeRef}>
      <Card
        style={style}
        className={variants({
          dragging: isOverlay ? "overlay" : isDragging ? "over" : undefined,
        })}
      >
        <div {...attributes} {...listeners}>
          <ContextMenu>
            <ContextMenuTrigger>
              <CardHeader
                className="space-between group relative flex cursor-grab flex-row items-center space-y-0 border-b-2 p-4 font-semibold "
                ref={cardContentRef}
                onBlur={(e) => {
                  if (
                    !cardContentRef.current?.contains(e.relatedTarget) &&
                    isEdit
                  ) {
                    reset();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    reset();
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                  }
                }}
              >
                {isEdit ? (
                  <>
                    <Textarea
                      ref={addListTextAreaRef}
                      value={editContent}
                      rows={1}
                      onChange={(e) => {
                        setEditContent(e.target.value);
                      }}
                      className="h-auto min-h-0 resize-none rounded-none border-none bg-transparent p-0 text-base focus-visible:ring-0"
                      placeholder="Enter a title..."
                    />
                    <Button
                      size="icon"
                      onClick={save}
                      variant="ghost"
                      className="absolute right-0 top-3 m-2 h-auto w-auto p-2 "
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span>{list.name}</span>
                    <Button
                      size="icon"
                      onClick={edit}
                      variant="ghost"
                      className="absolute right-0 top-3 m-2 h-auto w-auto p-2 opacity-0 transition group-hover:opacity-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </CardHeader>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={deleteItem}>
                Delete list
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
        <ScrollArea>
          <CardContent className="flex flex-grow flex-col gap-2 p-2">
            <SortableContext
              items={tasksIds}
              strategy={verticalListSortingStrategy}
            >
              {cards.map((task) => (
                <TodoCard key={task.id} card={task} />
              ))}
            </SortableContext>
            <div>
              {isAddingCard && (
                <div className="mb-2 overflow-hidden rounded-lg border bg-card text-card-foreground shadow">
                  <div className="group relative whitespace-pre-wrap p-6 px-3 py-2 text-left">
                    <Textarea
                      ref={addCardTextAreaRef}
                      rows={1}
                      value={addCardName}
                      onChange={(e) => {
                        setAddCardName(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          cancelAdd();
                        }
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCard();
                        }
                      }}
                      className="h-auto min-h-0 resize-none rounded-none border-none bg-transparent p-0 text-base focus-visible:ring-0"
                      placeholder="Enter a title..."
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="" onClick={addCard}>
                  <Plus className="mr-1 h-4 w-4" /> Add a card
                </Button>
                {isAddingCard && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className=""
                    onClick={cancelAdd}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}

export function BoardContainer({ children }: { children: React.ReactNode }) {
  const dndContext = useDndContext();

  const variations = cva("px-2 md:px-0 flex pb-4", {
    variants: {
      dragging: {
        default: "snap-x snap-mandatory",
        active: "snap-none",
      },
    },
  });

  return (
    <ScrollArea
      className={cn(
        "h-full",
        variations({
          dragging: dndContext.active ? "active" : "default",
        }),
      )}
    >
      <div className="flex flex-row gap-4">{children}</div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
