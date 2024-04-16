"use client";
import React, { useEffect, useState, useRef } from "react";
import { Separator } from "~/components/ui/separator";
import {
  CalendarIcon,
  Check,
  ChevronDown,
  Kanban,
  ListTodo,
  Pencil,
  Plus,
  SquareKanban,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Board, EmptyBoard } from "./board";
import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "~/components/ui/skeleton";
import {
  useCreateTodoBoardMutation,
  useDeleteTodoBoardMutation,
  useGetTodoBoardsQuery,
  useUpdateTodoBoardMutation,
} from "~/hooks/use-todo-api";

export type TodoProps = {
  selectedBoardId?: string;
};
export function Todo({ selectedBoardId }: TodoProps) {
  const { data: userBoards, isLoading } = useGetTodoBoardsQuery();
  const createBoard = useCreateTodoBoardMutation();
  const updateBoard = useUpdateTodoBoardMutation();
  const deleteBoard = useDeleteTodoBoardMutation();
  const [showBoardDialog, setShowBoardDialog] = useState(false);
  const [editBoardId, setEditBoardId] = useState("");
  const [boardName, setBoardName] = useState("");
  const [selectedBoard, setSelectedBoard] =
    useState<NonNullable<typeof userBoards>[number]>();

  const router = useRouter();

  useEffect(() => {
    if (userBoards) {
      if (selectedBoardId) {
        const foundBoard = userBoards.find((f) => f.id === selectedBoardId);
        if (foundBoard) {
          setSelectedBoard(foundBoard);
        } else {
          router.replace("/todo");
        }
      } else if (userBoards[0]) {
        router.replace(`/todo/${userBoards[0].id}`);
      }
    }
  }, [userBoards, selectedBoardId]);

  const deleteExistingBoard = () => {
    if (!!editBoardId) {
      deleteBoard.mutate({
        boardId: editBoardId,
      });
      setShowBoardDialog(false);
    }
  };

  const save = () => {
    if (boardName.trim() === "") {
      return;
    }
    if (!!editBoardId) {
      updateBoard.mutate({
        board: {
          id: editBoardId,
          name: boardName,
        },
      });
    } else {
      createBoard.mutate({
        board: {
          name: boardName,
        },
      });
    }
    setShowBoardDialog(false);
  };

  return (
    <div className="flex h-full flex-col ">
      <div className="flex flex-row items-center gap-2 px-4 py-4 ">
        <SquareKanban className="h-5 w-5" />
        {isLoading ? (
          <div className="flex h-9 items-center justify-center">
            <Skeleton className="h-4 w-[250px]" />
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={"ghost"} className="px-1">
                <h1 className="flex flex-1 items-center gap-2 text-xl ">
                  {selectedBoard?.name}
                  <ChevronDown className="h-5 w-5" />
                </h1>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" side="bottom" align="start">
              <DropdownMenuLabel>Select a board</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userBoards?.map((board) => (
                <DropdownMenuItem key={board.id} asChild>
                  <Link
                    className={cn("group cursor-pointer", {
                      "font-bold": selectedBoard?.id === board.id,
                    })}
                    href={`/todo/${board.id}`}
                  >
                    {board.name}
                    {selectedBoardId === board.id && (
                      <Button
                        variant="link"
                        size="icon"
                        className="absolute right-0 transition group-hover:opacity-0 "
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="link"
                      size="icon"
                      className="absolute right-0 opacity-0 transition group-hover:opacity-100"
                      onClick={(e) => {
                        e.preventDefault();
                        setEditBoardId(board.id);
                        setBoardName(board.name);
                        setShowBoardDialog(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                className="mt-2 cursor-pointer"
                onSelect={() => {
                  setBoardName("");
                  setShowBoardDialog(true);
                }}
              >
                Create board
                <Button
                  variant="link"
                  size="icon"
                  className="absolute right-0 transition"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Dialog open={showBoardDialog} onOpenChange={setShowBoardDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {!!editBoardId ? "Edit board" : "Create a new board"}
              </DialogTitle>
              <DialogDescription>
                Give the board a name. Click save when you&apos;re done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid ">
                <Input
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      save();
                    }
                  }}
                  value={boardName}
                  onChange={(e) => {
                    setBoardName(e.target.value);
                  }}
                  className=""
                />
              </div>
            </div>
            <DialogFooter>
              {!!editBoardId && (
                <Button variant="destructive" onClick={deleteExistingBoard}>
                  Delete
                </Button>
              )}
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Separator />
      {isLoading ? (
        <EmptyBoard />
      ) : (
        <>{!!selectedBoard?.id && <Board boardId={selectedBoard.id} />}</>
      )}
    </div>
  );
}
