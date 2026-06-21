import { LayoutDashboard } from "lucide-react";

import { ModulePlaceholder } from "@/components/tenant/module-placeholder";

export default function Page() {
  return <ModulePlaceholder title="Dashboard" description="Visão geral do seu negócio." icon={LayoutDashboard} />;
}
