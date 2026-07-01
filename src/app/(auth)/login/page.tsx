import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  // Already authenticated users hitting /login go to the app gateway, which
  // routes them on to their tenant dashboard (or admin).
  const session = await auth();
  if (session?.user?.id) redirect(callbackUrl || "/home");

  return (
    <div className="flex min-h-screen items-center justify-center gradient-bg px-4">
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
