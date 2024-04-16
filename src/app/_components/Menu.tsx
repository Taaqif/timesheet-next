import { CalendarClock, CalendarRange, SquareKanban } from "lucide-react";
import React from "react";
import { Nav } from "./Nav";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { usePathname } from "next/navigation";

export type MenuProps = {
  isNavCollapsed: boolean;
};
export const Menu = ({ isNavCollapsed }: MenuProps) => {
  const pathname = usePathname();
  return (
    <div className="group flex h-full flex-col" data-collapsed={isNavCollapsed}>
      <div
        className={cn(
          "flex h-[68px] items-center justify-center",
          isNavCollapsed ? "h-[68px]" : "px-2",
        )}
      >
        {/* <AccountSwitcher isCollapsed={isCollapsed} accounts={accounts} /> */}
      </div>
      <Separator />
      <div className="flex-1">
        <Nav
          isCollapsed={isNavCollapsed}
          links={[
            {
              title: "Timesheet",
              href: "/timesheet",
              label: "",
              icon: CalendarClock,
              variant: pathname === "/timesheet" ? "default" : "ghost",
            },
            {
              title: "Todo",
              label: "",
              href: "/todo",
              icon: SquareKanban,
              variant: pathname.startsWith("/todo") ? "default" : "ghost",
            },
            {
              title: "Schedule",
              label: "",
              icon: CalendarRange,
              variant: "ghost",
            },
          ]}
        />
      </div>
      <Separator />
      <div
        data-collapsed={isNavCollapsed}
        className="  flex flex-col items-center gap-4 p-2 group-[[data-collapsed=true]]:justify-center "
      >
        <ThemeToggle isNavCollapsed={isNavCollapsed} />
      </div>
    </div>
  );
};
