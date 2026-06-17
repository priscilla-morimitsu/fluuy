import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      isPlatformAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isPlatformAdmin?: boolean;
  }
}
