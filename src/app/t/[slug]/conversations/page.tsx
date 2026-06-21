import { MessageCircle } from "lucide-react";

import { ModulePlaceholder } from "@/components/tenant/module-placeholder";

export default function Page() {
  return <ModulePlaceholder title="Conversas" description="Histórico e atendimento das conversas." icon={MessageCircle} />;
}
