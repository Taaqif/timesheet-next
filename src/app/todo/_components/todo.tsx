"use client";
import React, { useEffect, useState, useRef } from "react";
import { Separator } from "~/components/ui/separator";
import {
  CalendarIcon,
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
import { Board } from "./board";
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

export type TodoProps = {
  //
};
export function Todo({}: TodoProps) {
  const { data: userBoards } = api.todo.getUserBoards.useQuery();
  const createBoard = api.todo.createUserBoard.useMutation();
  const updateBoard = api.todo.updateUserBoard.useMutation();
  const deleteBoard = api.todo.deleteUserBoard.useMutation();
  const [showBoardDialog, setShowBoardDialog] = useState(false);
  const [editBoardId, setEditBoardId] = useState("");
  const [boardName, setBoardName] = useState("");
  const [selectedBoard, setSelectedBoard] =
    useState<NonNullable<typeof userBoards>[number]>();

  useEffect(() => {
    if (userBoards && !selectedBoard) {
      setSelectedBoard(userBoards[0]);
    }
  }, [userBoards]);

  const deleteExistingBoard = () => {
    if (!!editBoardId) {
      deleteBoard.mutate({
        boardId: editBoardId,
      });
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
              <DropdownMenuItem
                key={board.id}
                className={cn("group", {
                  "font-bold": selectedBoard?.id === board.id,
                })}
                onSelect={() => {
                  setSelectedBoard(board);
                }}
              >
                {board.name}
                <Button
                  variant="link"
                  size="icon"
                  className="absolute right-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditBoardId(board.id);
                    setBoardName(board.name);
                    setShowBoardDialog(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              className="mt-2"
              onSelect={() => {
                setShowBoardDialog(true);
              }}
            >
              Create board
              <Plus className="ml-2 h-4 w-4" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
      {!!selectedBoard && <Board boardId={selectedBoard.id} />}
    </div>
  );
}
