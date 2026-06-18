/**
 * "23 resultados" / "23 de 124 registros" — `filtered` is the count after
 * filters, `total` the unfiltered total (omit when no filters are active).
 */
export function ResultCount({ filtered, total }: { filtered: number; total?: number }) {
  const text =
    total !== undefined && total !== filtered
      ? `${filtered} de ${total} registros`
      : `${filtered} ${filtered === 1 ? "resultado" : "resultados"}`;
  return <p className="text-sm text-zinc-500">{text}</p>;
}
