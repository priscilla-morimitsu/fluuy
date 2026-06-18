import type { NextAuthConfig } from "next-auth";

// Edge-safe subset of the Auth.js config: no Prisma, no provider `authorize`
// logic. Used by middleware.ts, which runs on the Edge runtime and can't
// load Node-only modules like the Prisma client.
// src/lib/auth.ts extends this with the actual providers for everywhere else.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.isPlatformAdmin = Boolean(token.isPlatformAdmin);
        session.user.selectedTenantId = (token.selectedTenantId as string | undefined) ?? null;
      }
      return session;
    },
  },
};
