"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireIdentity } from "@/src/lib/access";
import { assertTrustedServerAction } from "@/src/lib/request-security";
import { getRepository } from "@/src/lib/repository";
import { validateSlug } from "@/src/lib/slug";
import { nameFromHandle, parseHandle, slugFromHandle } from "@/src/lib/social/handle";

const field = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/** Instagram handle in, draft store out. Never auto-appends numbers to a taken slug: the person chooses. */
export async function startFromHandleAction(formData: FormData) {
  assertTrustedServerAction();
  const identity = await requireIdentity();
  if (!identity.isOperator) redirect("/admin");

  const back = (error: string, extra: Record<string, string> = {}): never =>
    redirect(`/admin/start?${new URLSearchParams({ error, handle: field(formData, "handle"), name: field(formData, "name"), ...extra }).toString()}`);

  const handle = parseHandle(field(formData, "handle"));
  if (!handle) return back("handle");
  const name = field(formData, "name") || nameFromHandle(handle);
  if (name.length > 80) return back("name");
  const slug = (field(formData, "slug") || slugFromHandle(handle)).toLowerCase();
  if (validateSlug(slug)) return back("slug", { slug });

  const repository = getRepository();
  if (await repository.getStoreBySlug(slug)) return back("taken", { slug });
  const store = await repository.createStore({ name, slug }, identity.id);
  await repository.saveStore(store.id, { instagram_handle: handle });
  revalidatePath("/admin");
  redirect(`/admin/${store.id}/sync?welcome=1`);
}
