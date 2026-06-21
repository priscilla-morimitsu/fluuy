import { Workflow } from "lucide-react";

import { ModulePlaceholder } from "@/components/tenant/module-placeholder";

export default function Page() {
  return <ModulePlaceholder title="Workflows" description="Automações e fluxos do tenant." icon={Workflow} />;
}
