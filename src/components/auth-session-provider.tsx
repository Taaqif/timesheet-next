"use client";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import React from "react";

type AuthSessionProviderProps = {
  children: React.ReactNode;
  session: Session | null;
};
export const AuthSessionProvider = ({
  children,
  session,
}: AuthSessionProviderProps) => {
  return <SessionProvider session={session}>{children}</SessionProvider>;
};
