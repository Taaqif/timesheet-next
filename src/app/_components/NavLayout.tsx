"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { Menu } from "./Menu";
import { type ImperativePanelHandle } from "react-resizable-panels";
import { useBreakpoint } from "~/hooks/use-breakpoint";
import { cn } from "~/lib/utils";

export type NavLayoutProps = {
  defaultNavCollapsed?: boolean;
  children: React.ReactNode;
  defaultLayout?: number[];
};
export default function NavLayout({
  children,
  defaultNavCollapsed = false,
  defaultLayout = [10, 90],
}: NavLayoutProps) {
  const navCollapsedSize = 4;

  const navPanelRef = useRef<ImperativePanelHandle>(null);

  const [isNavCollapsed, setIsNavCollapsed] = useState(defaultNavCollapsed);
  const { breakpoint } = useBreakpoint();

  useEffect(() => {
    if (breakpoint === "mobile") {
      if (!isNavCollapsed) {
        setIsNavCollapsed(true);
        navPanelRef.current?.collapse();
      }
    }
  }, [breakpoint]);
  return (
    <div className="h-svh">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:nav-layout=${JSON.stringify(
            sizes,
          )}`;
          window.dispatchEvent(new Event("resize"));
        }}
        className="h-full items-stretch"
      >
        <ResizablePanel
          ref={navPanelRef}
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={10}
          maxSize={10}
          onExpand={() => {
            setIsNavCollapsed(false);
            document.cookie = `react-resizable-panels:nav-collapsed=${JSON.stringify(
              false,
            )}`;
          }}
          onCollapse={() => {
            setIsNavCollapsed(true);
            document.cookie = `react-resizable-panels:nav-collapsed=${JSON.stringify(
              true,
            )}`;
          }}
          className={cn(
            isNavCollapsed &&
              "min-w-[50px] transition-all duration-300 ease-in-out",
          )}
        >
          <Menu isNavCollapsed={isNavCollapsed} />
        </ResizablePanel>
        <ResizableHandle
          withHandle={breakpoint !== "mobile"}
          disabled={breakpoint === "mobile"}
        />
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          {children}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
