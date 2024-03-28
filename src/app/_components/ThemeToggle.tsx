"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export type ThemeToggleProps = {
  isNavCollapsed: boolean;
};
export function ThemeToggle({ isNavCollapsed }: ThemeToggleProps) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(" relative w-full justify-start px-3", {
            "h-9 w-9": isNavCollapsed,
          })}
        >
          <SunIcon className="absolute  h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 " />
          <MoonIcon className="absolute  h-4 w-4 rotate-90 scale-0  transition-all dark:rotate-0 dark:scale-100 " />
          {!isNavCollapsed && <span className="ml-6">Toggle theme</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
