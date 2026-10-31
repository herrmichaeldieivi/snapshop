import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/src/lib/supabase";
import { getRepository } from "@/src/lib/repository";
import type { AdminIdentity, Store } from "@/src/lib/types";
import { HttpError } from "@/src/lib/http-error";

export async function requireIdentity(): Promise<AdminIdentity> {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/login");
  return identity;
}

export async function requireStoreAccess(storeId: string): Promise<{ identity: AdminIdentity; store: Store }> {
  const identity = await requireIdentity();
  const store = await getRepository().getStore(storeId);
  if (!store || (!identity.isOperator && store.owner_id !== identity.id)) {
    redirect("/admin");
  }
  return { identity, store };
}

export function isStoreOwnerOrOperator(identity: AdminIdentity, store: Store) {
  return identity.isOperator || store.owner_id === identity.id;
}

export class AccessError extends HttpError {}

/** For route handlers: same rules as requireStoreAccess, but throws a 401/404 instead of redirecting. */
export async function authorizeStore(storeId: string): Promise<{ identity: AdminIdentity; store: Store }> {
  const identity = await getCurrentIdentity();
  if (!identity) throw new AccessError("Sign in to continue.", 401);
  const store = storeId ? await getRepository().getStore(storeId) : null;
  if (!store || (!identity.isOperator && store.owner_id !== identity.id)) throw new AccessError("Store not found.", 404);
  return { identity, store };
}

/** Self-serve signup: an owner may create their own shop, up to this many. Operators are unlimited. */
export const MAX_STORES_PER_OWNER = 1;

export function canCreateStore(identity: AdminIdentity, ownedStoreCount: number) {
  return identity.isOperator || ownedStoreCount < MAX_STORES_PER_OWNER;
}
