import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { uploadDir } from "@/lib/upload";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Serves files written by `saveImage`, constrained to the upload directory. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const base = uploadDir();
  const target = path.resolve(base, ...parts);
  if (target !== base && !target.startsWith(base + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = (parts.at(-1)?.split(".").pop() ?? "").toLowerCase();
  const type = TYPES[ext];
  if (!type) return new NextResponse("Not found", { status: 404 });

  try {
    const data = await readFile(target);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
