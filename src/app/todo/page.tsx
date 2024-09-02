import { cookies } from "next/headers";
import React from "react";
import { Todo } from "./_components/todo";

export const metadata = {
  title: "Todo",
};
export type TodoPageProps = { params: { board: string } };

export default async function page({ params }: TodoPageProps) {
  const board = cookies().get("selected-board");

  const defaultBoard = board?.value;
  return (
    <div className="h-svh">
      <Todo selectedBoardId={params.board ?? defaultBoard} />
    </div>
  );
}
