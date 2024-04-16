import { cookies } from "next/headers";
import React from "react";
import { Todo } from "./_components/todo";

export const metadata = {
  title: "Todo",
};

export default async function page() {
  return (
    <div className="h-svh">
      <Todo />
    </div>
  );
}
