import "~/styles/globals.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";

import { Inter } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/theme-provider";
import { getServerAuthSession } from "~/server/auth";
import { AuthSessionProvider } from "~/components/auth-session-provider";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import NavLayout from "./_components/NavLayout";
import { cookies } from "next/headers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Timesheet Next",
  description: "Next generation timesheeting",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();
  const navCollapsed = cookies().get("react-resizable-panels:nav-collapsed");
  const navLayout = cookies().get("react-resizable-panels:nav-layout");
  const defaultLayout = navLayout
    ? (JSON.parse(navLayout.value) as number[])
    : undefined;
  const defaultNavCollapsed = navCollapsed
    ? (JSON.parse(navCollapsed.value) as boolean)
    : undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${inter.variable}`}>
        <AuthSessionProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Theme>
              <TooltipProvider delayDuration={0}>
                <TRPCReactProvider>
                  <NavLayout
                    defaultLayout={defaultLayout}
                    defaultNavCollapsed={defaultNavCollapsed}
                  >
                    {children}
                  </NavLayout>
                </TRPCReactProvider>
              </TooltipProvider>
            </Theme>
            <Toaster />
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
