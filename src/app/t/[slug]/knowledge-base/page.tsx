import { BookOpenText } from "lucide-react";

import { ModulePlaceholder } from "@/components/tenant/module-placeholder";

export default function Page() {
  return <ModulePlaceholder title="Base de conhecimento" description="Conteúdos que alimentam o agente." icon={BookOpenText} />;
}
