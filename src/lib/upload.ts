import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/** Filesystem storage for tenant uploads (mounted Docker volume in prod). */
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"));
const URL_PREFIX = "/api/uploads/";
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024;

export class UploadError extends Error {}

export function uploadDir(): string {
  return UPLOAD_DIR;
}

/** Validates type/size, writes under `subdir`, returns the served URL. */
export async function saveImage(file: File, subdir: string): Promise<string> {
  if (!(file instanceof File) || file.size === 0) throw new UploadError("Imagem inválida.");
  if (file.size > MAX_BYTES) throw new UploadError("Imagem muito grande (máx. 5 MB).");
  const ext = ALLOWED[file.type];
  if (!ext) throw new UploadError("Imagem inválida. Use JPG, PNG ou WebP.");

  const safeSub = subdir.replace(/[^a-z0-9/_-]/gi, "");
  const dir = path.join(UPLOAD_DIR, safeSub);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return `${URL_PREFIX}${safeSub}/${filename}`;
}

/** Best-effort removal of a previously saved image (ignores already-gone). */
export async function deleteImage(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith(URL_PREFIX)) return;
  const target = path.resolve(UPLOAD_DIR, url.slice(URL_PREFIX.length));
  if (target !== UPLOAD_DIR && !target.startsWith(UPLOAD_DIR + path.sep)) return; // traversal guard
  try {
    await unlink(target);
  } catch {
    // File already removed or never existed — nothing to clean up.
  }
}
