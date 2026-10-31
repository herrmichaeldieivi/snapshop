"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStoreAccess } from "@/src/lib/access";
import { getRepository } from "@/src/lib/repository";
import { assertTrustedServerAction } from "@/src/lib/request-security";
import { selectCandidate } from "@/src/lib/social/connect";

export async function selectAccountAction(formData: FormData) {
  assertTrustedServerAction();
  const { store } = await requireStoreAccess(String(formData.get("store_id") ?? ""));
  let outcome = "connected=1";
  try {
    await selectCandidate(store, String(formData.get("page_id") ?? ""));
  } catch (error) {
    console.error(JSON.stringify({ event: "meta_select_failed", message: error instanceof Error ? error.message : "unknown" }));
    outcome = "error=generic";
  }
  revalidatePath(`/admin/${store.id}/sync`);
  redirect(`/admin/${store.id}/sync?${outcome}`);
}

export async function disconnectAction(formData: FormData) {
  assertTrustedServerAction();
  const { store } = await requireStoreAccess(String(formData.get("store_id") ?? ""));
  await getRepository().deleteSocialConnection(store.id);
  revalidatePath(`/admin/${store.id}/sync`);
  redirect(`/admin/${store.id}/sync?disconnected=1`);
}
