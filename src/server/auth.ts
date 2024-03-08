import { DrizzleAdapter } from "@auth/drizzle-adapter";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
  type TokenSet,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
import AzureADProvider from "next-auth/providers/azure-ad";

import { env } from "~/env";
import { db } from "~/server/db";
import { pgTable, userProfiles } from "./db/schema";
import { eq } from "drizzle-orm";

type SessionError = "RefreshAccessTokenError" | "ExpiredToken";
/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    error?: SessionError;
    user: {
      id: string;
      email: string;
      access_token: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  interface Profile {
    oid: string;
  }

  interface Account {
    expires_at: number;
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    expires_at: number;
    access_token: string;
    refresh_token: string;
    id: string;
    error?: SessionError;
  }
}
/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */

export const authOptions: NextAuthOptions = {
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account && profile) {
        return {
          ...token,
          access_token: account.access_token!,
          refresh_token: account.refresh_token!,
          expires_at: account.expires_at,
          id: profile.oid,
        };
      } else if (Date.now() < token.expires_at) {
        return token;
      } else if (token.refresh_token) {
        // If the access token has expired, try to refresh it
        try {
          const url = `https://login.microsoftonline.com/${env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              client_secret: env.AZURE_AD_CLIENT_SECRET,
              refresh_token: token.refresh_token,
              client_id: env.AZURE_AD_CLIENT_ID,
            }),
          });
          const tokens = (await response.json()) as TokenSet;
          if (!response.ok) throw tokens;
          return {
            ...token,
            access_token: tokens.access_token!,
            expires_at: Date.now() + (tokens.expires_in as number),
            refresh_token: tokens.refresh_token! ?? token.refreshToken,
          };
        } catch (error) {
          console.error("Error refreshing access token", error);
          return {
            ...token,
            error: "RefreshAccessTokenError" as const,
          };
        }
      } else {
        return {
          ...token,
          error: "ExpiredToken" as const,
        };
      }
    },
    session: ({ session, token }) => {
      return {
        ...session,
        error: token.error,
        user: {
          ...session.user,
          id: token?.sub,
          access_token: token?.access_token,
        },
      };
    },
  },

  events: {
    signIn: async ({ user }) => {
      //creare a user profile
      const existingProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, user.id),
      });
      if (!existingProfile) {
        await db.insert(userProfiles).values({
          userId: user.id,
        });
      }
    },
  },

  adapter: DrizzleAdapter(db, pgTable) as Adapter,

  session: {
    strategy: "jwt",
  },
  providers: [
    AzureADProvider({
      clientId: env.AZURE_AD_CLIENT_ID,
      clientSecret: env.AZURE_AD_CLIENT_SECRET,
      tenantId: env.AZURE_AD_TENANT_ID,
      httpOptions: {
        timeout: 10000,
      },
      authorization: {
        params: {
          scope: "openid profile email User.Read offline_access",
        },
      },
    }),
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => getServerSession(authOptions);
