// Shared result shape for admin server actions used with useActionState.
// `undefined` = not submitted yet, `{ ok: true }` = success (lets edit
// dialogs know to close), `{ error }` = a pt-BR user-facing message.
export type AdminActionResult = { error: string } | { ok: true } | undefined;

export function actionError(state: AdminActionResult): string | undefined {
  return state && "error" in state ? state.error : undefined;
}

export function actionOk(state: AdminActionResult): boolean {
  return Boolean(state && "ok" in state && state.ok);
}
