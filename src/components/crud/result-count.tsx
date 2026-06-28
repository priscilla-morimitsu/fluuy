/**
 * "23 resultados" / "23 de 124 registros" — `filtered` is the count after
 * filters, `total` the unfiltered total (omit when no filters are active).
 *
 * Pass `noun`/`nounPlural` to count with an entity word instead of the generic
 * "resultado(s)"/"registros" — e.g. `noun="cliente"` → "12 clientes".
 */
export function ResultCount({
  filtered,
  total,
  noun,
  nounPlural,
}: {
  filtered: number;
  total?: number;
  noun?: string;
  nounPlural?: string;
}) {
  const plural = nounPlural ?? (noun ? `${noun}s` : "resultados");
  const single = noun ?? "resultado";
  const word = filtered === 1 ? single : plural;
  const text =
    total !== undefined && total !== filtered
      ? `${filtered} de ${total} ${noun ? plural : "registros"}`
      : `${filtered} ${word}`;
  return <p className="text-sm text-zinc-500">{text}</p>;
}
