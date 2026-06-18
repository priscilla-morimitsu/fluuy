"use client";

import { ErrorState } from "@/components/crud/states";

export default function FeaturesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-2">
      <ErrorState onRetry={reset} />
    </div>
  );
}
