import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";

import { authConfig } from "@/lib/auth.config";
import { writeAuditLog } from "@/lib/auth/audit";
import { verifyOtp } from "@/lib/auth/otp";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

const passwordCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const otpCredentialsSchema = z.object({
  identifier: z.string().min(3),
  code: z.string().regex(/^\d{6}$/),
});

function requestMeta(request: Request) {
  return {
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}

// No PrismaAdapter: with the JWT session strategy it isn't needed, and using
// it would require Auth.js's own Account/Session/VerificationToken tables,
// which conflict with this project's own auth_identities/
// auth_verification_codes. OAuth account-linking is therefore handled
// manually in the signIn callback below, against our own tables — this also
// lets us enforce "no automatic user creation" for Google sign-in.
export const { handlers, signIn, signOut, auth, unstable_update: updateSession } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "password",
      credentials: { email: {}, password: {} },
      authorize: async (raw, request) => {
        const parsed = passwordCredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const meta = requestMeta(request);

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { authCredential: true },
        });

        if (!user || user.status !== "active" || !user.authCredential) {
          await writeAuditLog("login_password_failure", { ...meta, metadata: { reason: "no_user_or_credential" } });
          return null;
        }

        const valid = await verifyPassword(parsed.data.password, user.authCredential.passwordHash);
        if (!valid) {
          await writeAuditLog("login_password_failure", { userId: user.id, ...meta });
          return null;
        }

        await writeAuditLog("login_password_success", { userId: user.id, ...meta });
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

        return { id: user.id, name: user.name, email: user.email, isPlatformAdmin: user.isPlatformAdmin };
      },
    }),
    Credentials({
      id: "email-otp",
      credentials: { identifier: {}, code: {} },
      authorize: async (raw, request) => {
        const parsed = otpCredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const meta = requestMeta(request);

        const result = await verifyOtp({ channel: "email", identifier: parsed.data.identifier, code: parsed.data.code });
        if (!result.ok) {
          await writeAuditLog("login_otp_failure", { ...meta, metadata: { channel: "email", reason: result.reason } });
          return null;
        }

        const user = await prisma.user.findUnique({ where: { id: result.userId } });
        if (!user || user.status !== "active") return null;

        await writeAuditLog("login_otp_success", { userId: user.id, ...meta, metadata: { channel: "email" } });
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
        });

        return { id: user.id, name: user.name, email: user.email, isPlatformAdmin: user.isPlatformAdmin };
      },
    }),
    Credentials({
      id: "whatsapp-otp",
      credentials: { identifier: {}, code: {} },
      authorize: async (raw, request) => {
        const parsed = otpCredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const meta = requestMeta(request);

        const result = await verifyOtp({ channel: "whatsapp", identifier: parsed.data.identifier, code: parsed.data.code });
        if (!result.ok) {
          await writeAuditLog("login_otp_failure", { ...meta, metadata: { channel: "whatsapp", reason: result.reason } });
          return null;
        }

        const user = await prisma.user.findUnique({ where: { id: result.userId } });
        if (!user || user.status !== "active") return null;

        await writeAuditLog("login_otp_success", { userId: user.id, ...meta, metadata: { channel: "whatsapp" } });
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), phoneVerifiedAt: user.phoneVerifiedAt ?? new Date() },
        });

        return { id: user.id, name: user.name, email: user.email, isPlatformAdmin: user.isPlatformAdmin };
      },
    }),
    // Reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET by Auth.js convention.
    Google,
  ],
  callbacks: {
    ...authConfig.callbacks,
    signIn: async ({ user, account, profile }) => {
      // Credentials providers already did all validation in `authorize`.
      if (account?.provider !== "google") return true;

      if (!profile?.email || profile.email_verified !== true) {
        await writeAuditLog("login_google_denied", { metadata: { reason: "email_not_verified" } });
        return false;
      }

      const providerUserId = account.providerAccountId;
      const existingIdentity = await prisma.authIdentity.findUnique({
        where: { provider_providerUserId: { provider: "google", providerUserId } },
        include: { user: true },
      });

      let internalUser = existingIdentity?.user ?? null;

      if (!internalUser) {
        // Link-on-first-sign-in only when an active user already owns this
        // email — never create a new User/Tenant from an OAuth sign-in.
        const candidate = await prisma.user.findUnique({ where: { email: profile.email } });
        if (!candidate || candidate.status !== "active") {
          await writeAuditLog("login_google_denied", { metadata: { reason: "no_active_user" } });
          return false;
        }
        await prisma.authIdentity.create({
          data: {
            userId: candidate.id,
            provider: "google",
            providerUserId,
            providerEmail: profile.email,
            providerEmailVerified: true,
          },
        });
        internalUser = candidate;
      }

      if (internalUser.status !== "active") {
        await writeAuditLog("login_google_denied", { userId: internalUser.id, metadata: { reason: "inactive_user" } });
        return false;
      }

      // No adapter is resolving the user for us — mutate the in-flight
      // `user` object so the jwt() callback below picks up OUR id/claims
      // instead of the transient profile NextAuth synthesized from Google.
      user.id = internalUser.id;
      user.email = internalUser.email;
      user.name = internalUser.name;
      (user as { isPlatformAdmin?: boolean }).isPlatformAdmin = internalUser.isPlatformAdmin;

      await writeAuditLog("login_google_success", { userId: internalUser.id });
      await prisma.user.update({ where: { id: internalUser.id }, data: { lastLoginAt: new Date() } });
      return true;
    },
    jwt: ({ token, user, trigger, session }) => {
      if (user) {
        token.isPlatformAdmin = (user as { isPlatformAdmin?: boolean }).isPlatformAdmin ?? false;
      }
      const updatedTenantId = (session as { user?: { selectedTenantId?: string | null } } | undefined)?.user
        ?.selectedTenantId;
      if (trigger === "update" && updatedTenantId !== undefined) {
        token.selectedTenantId = updatedTenantId;
      }
      return token;
    },
  },
});
