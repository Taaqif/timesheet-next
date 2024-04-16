import type { Metadata } from "next";
import page, { type TodoPageProps } from "../page";
import { api } from "~/trpc/server";

export async function generateMetadata({
  params,
}: TodoPageProps): Promise<Metadata> {
  const id = params.board;

  const board = await api.todo.getUserBoard.query({
    boardId: id,
  });

  return {
    title: `Todo - ${board?.name}`,
  };
}

export default page;
