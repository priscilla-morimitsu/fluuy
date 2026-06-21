import { notFound } from "next/navigation";

import {
  getConversationDetail,
  listConversations,
  type ConversationFiltersInput,
} from "@/lib/messaging/conversations";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { resolveTenantContext } from "@/lib/tenant-context";
import { conversationFiltersSchema } from "@/lib/validations/conversation";

import ConversationsClient from "./conversations-client";

const FEATURE = "conversation_history";

export default async function ConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  let ctx;
  try {
    ctx = await resolveTenantContext(slug, { feature: FEATURE });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }
  const { tenant, role } = ctx;
  const canWrite = role === "tenant_owner" || role === "tenant_manager" || role === "tenant_operator";
  const canManageConsent = role === "tenant_owner" || role === "tenant_manager";

  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const selectedId = str(sp.c);

  const parsedFilters = conversationFiltersSchema.safeParse({
    search: str(sp.search) || undefined,
    status: str(sp.status) || undefined,
    assigneeType: str(sp.assignee) || undefined,
    unread: str(sp.unread) === "1" || undefined,
  });
  const filters: ConversationFiltersInput = parsedFilters.success ? parsedFilters.data : {};

  const [conversations, detail] = await Promise.all([
    listConversations(tenant.id, filters),
    selectedId ? getConversationDetail(tenant.id, selectedId) : Promise.resolve(null),
  ]);

  return (
    <ConversationsClient
      slug={slug}
      conversations={conversations}
      detail={detail}
      selectedId={selectedId ?? null}
      canWrite={canWrite}
      canManageConsent={canManageConsent}
      filters={filters}
    />
  );
}
