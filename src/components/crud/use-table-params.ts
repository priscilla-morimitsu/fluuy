"use client";

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

/**
 * Standard CRUD list params kept in the URL (the source of truth, per the
 * spec's query-param contract). `shallow: false` makes nuqs re-run the Server
 * Component so filtering/sorting/pagination happen server-side.
 */
export function useTableParams() {
  return useQueryStates(
    {
      q: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(10),
      sortBy: parseAsString.withDefault(""),
      sortDir: parseAsString.withDefault(""),
    },
    { history: "push", shallow: false },
  );
}
