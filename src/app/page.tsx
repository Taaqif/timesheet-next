import { Calendar, LogIn, LogOut } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { Button } from "~/components/ui/button";

import { getServerAuthSession } from "~/server/auth";

export default async function Home() {
  noStore();
  const session = await getServerAuthSession();

  return (
    <main className="h-svh">
      <div className="container flex h-full flex-col items-center justify-center gap-12 px-4 py-16 ">
        {session && (
          <>
            <p className="text-center text-2xl text-white">
              <span>Logged in as {session.user?.name}</span>
            </p>
            <Button asChild>
              <Link href="/timesheet">
                <Calendar className="mr-2 h-4 w-4" />
                Timesheet
              </Link>
            </Button>
          </>
        )}
        <Button asChild variant="ghost">
          <Link href={session ? "/api/auth/signout" : "/api/auth/signin"}>
            {session ? (
              <LogOut className="mr-2 h-4 w-4" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            {session ? "Sign out" : "Sign in"}
          </Link>
        </Button>
      </div>
    </main>
  );
}
