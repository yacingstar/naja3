// Shared result shape for admin Server Actions — returned rather than
// thrown, so failures (e.g. deleting a wilaya an order still references)
// reach the UI as a message instead of an unhandled rejection.
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
