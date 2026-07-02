import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

// Any unmatched route lands here (App Router's global 404). Instead of showing
// a 404 page we send the visitor to their initial screen: authenticated users
// go through the /home gateway (which resolves to their dashboard by role),
// everyone else goes to the public landing page.
//
// Note: this can't live in middleware — middleware runs before routing and has
// no way to know a path doesn't resolve to a page. not-found.tsx is the correct
// Next.js hook for "route does not exist".
export default async function NotFound() {
  const session = await auth();
  redirect(session?.user?.id ? "/home" : "/");
}
