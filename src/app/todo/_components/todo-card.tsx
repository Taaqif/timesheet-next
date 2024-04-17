import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { cva } from "class-variance-authority";
import { Check, GripVertical, Pencil } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import type { RouterOutputs } from "~/trpc/shared";
import { useRef, useState } from "react";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { textAreaPropDefs } from "@radix-ui/themes";
import {
  useDeleteTodoCardMutation,
  useUpdateTodoCardMutation,
} from "~/hooks/use-todo-api";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { Skeleton } from "~/components/ui/skeleton";

export type TodoCardType =
  RouterOutputs["todo"]["getBoardListsCards"]["cards"][number];

interface TodoCardProps {
  card: TodoCardType;
  isOverlay?: boolean;
}

export function TodoCard({ card, isOverlay }: TodoCardProps) {
  const [isEdit, setIsEdit] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const saveIconRef = useRef<HTMLButtonElement>(null);
  const cardContentRef = useRef<HTMLDivElement>(null);
  const [editContent, setEditContent] = useState(card.name);
  const updateCard = useUpdateTodoCardMutation();
  const deleteCard = useDeleteTodoCardMutation();
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    attributes: {
      roleDescription: "Card",
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const variants = cva("", {
    variants: {
      dragging: {
        over: "opacity-30",
        overlay: "ring-2 ring-primary",
      },
    },
  });

  const edit = () => {
    setIsEdit(true);
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
        // textAreaRef.current.select();
        textAreaRef.current.selectionStart = 0;
        textAreaRef.current.selectionEnd = textAreaRef.current.value.length;
      }
    }, 1);
  };

  const save = () => {
    if (editContent.trim() === "") {
      reset();
      return;
    }
    setIsEdit(false);
    if (editContent !== card.name) {
      card.name = editContent;
      updateCard.mutate({
        card: {
          ...card,
        },
      });
    }
  };
  const deleteItem = () => {
    setIsEdit(false);
    deleteCard.mutate({
      cardId: card.id,
      boardId: card.boardId,
    });
  };
  const reset = () => {
    setEditContent(card.name);
    setIsEdit(false);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        variants({
          dragging: isOverlay ? "overlay" : isDragging ? "over" : undefined,
        }),
        { "ring-2": isEdit },
      )}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <CardContent
            ref={cardContentRef}
            className="group relative whitespace-pre-wrap px-3 py-2 text-left"
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
                  data-no-dnd
                  ref={textAreaRef}
                  rows={1}
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                  }}
                  className="h-auto min-h-0 resize-none rounded-none border-none bg-transparent p-0 text-base focus-visible:ring-0"
                  placeholder="Enter a title..."
                />
                <Button
                  data-no-dnd
                  size="icon"
                  ref={saveIconRef}
                  onClick={save}
                  variant="ghost"
                  className="absolute right-0 top-0 m-1 h-auto w-auto p-2 "
                >
                  <Check className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                {editContent}
                <Button
                  size="icon"
                  onClick={edit}
                  variant="ghost"
                  className="absolute right-0 top-0 m-1 h-auto w-auto p-2 opacity-0 transition group-hover:opacity-100"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </CardContent>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={deleteItem}>Delete card</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </Card>
  );
}

export const EmptyTodoCard = () => {
  return (
    <Card className="">
      <CardContent className="group relative whitespace-pre-wrap px-3 py-2 text-left">
        <Skeleton className="my-1 h-5 w-[100px]" />
      </CardContent>
    </Card>
  );
};
