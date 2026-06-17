import type { NextAuthConfig } from "next-auth";

// Edge-safe subset of the Auth.js config: no Prisma adapter, no Credentials
// `authorize` (which touches the DB). Used by middleware.ts, which runs on
// the Edge runtime and can't load Node-only modules like the Prisma client.
// src/lib/auth.ts extends this with the adapter/provider for everywhere else.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.isPlatformAdmin = Boolean(token.isPlatformAdmin);
      }
      return session;
    },
  },
};
