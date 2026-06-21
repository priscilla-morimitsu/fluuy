import { Hammer, type LucideIcon } from "lucide-react";

/**
 * Placeholder for tenant modules whose pages aren't built yet — keeps the
 * sidebar links from 404-ing while the MVP modules are implemented.
 */
export function ModulePlaceholder({
  title,
  description,
  icon: Icon = Hammer,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="glass flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-accent/20 text-foreground [&_svg]:size-6">
          <Icon />
        </span>
        <p className="font-medium">Módulo em construção</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta área faz parte do MVP do Fluuy e estará disponível em breve.
        </p>
      </div>
    </div>
  );
}
