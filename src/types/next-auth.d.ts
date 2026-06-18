import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      isPlatformAdmin: boolean;
      selectedTenantId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isPlatformAdmin?: boolean;
    selectedTenantId?: string | null;
  }
}
