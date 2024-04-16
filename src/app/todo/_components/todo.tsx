"use client";
import React, { useEffect, useState, useRef } from "react";
import { Separator } from "~/components/ui/separator";
import { CalendarIcon } from "lucide-react";
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

export type TodoProps = {
  //
};
export function Todo({}: TodoProps) {
  const { data: userBoards } = api.todo.getUserBoards.useQuery();
  const [selectedBoard, setSelectedBoard] =
    useState<NonNullable<typeof userBoards>[number]>();

  useEffect(() => {
    if (userBoards && !selectedBoard) {
      setSelectedBoard(userBoards[0]);
    }
  }, [userBoards]);

  return (
    <div className="h-svh">
      <div className="flex h-full flex-col ">
        <div className="flex flex-row justify-between gap-2 px-4 py-4 ">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={"ghost"} className="px-1">
                <h1 className="flex flex-1 items-center gap-2 text-xl ">
                  <CalendarIcon className="h-5 w-5" />
                  {selectedBoard?.name}
                </h1>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" side="bottom" align="start">
              <DropdownMenuLabel>Select a board</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userBoards?.map((board) => (
                <DropdownMenuItem
                  key={board.id}
                  className={cn({
                    "font-bold": selectedBoard?.id === board.id,
                  })}
                  onSelect={() => {
                    setSelectedBoard(board);
                  }}
                >
                  {board.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Separator />
        <div className="h-full p-4">
          {!!selectedBoard && <Board boardId={selectedBoard.id} />}
        </div>
      </div>
    </div>
  );
}
