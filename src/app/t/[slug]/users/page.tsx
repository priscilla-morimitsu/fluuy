import { ShieldCheck } from "lucide-react";

import { ModulePlaceholder } from "@/components/tenant/module-placeholder";

export default function Page() {
  return <ModulePlaceholder title="Usuários" description="Usuários e papéis de acesso." icon={ShieldCheck} />;
}
