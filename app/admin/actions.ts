"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getRepository } from "@/src/lib/repository";
import { canCreateStore, requireIdentity, requireStoreAccess } from "@/src/lib/access";
import { validateSlug } from "@/src/lib/slug";
import { formValue, parseProductForm, parseStoreForm } from "@/src/lib/validation";
import { assertTrustedServerAction } from "@/src/lib/request-security";
import type { StoreInput } from "@/src/lib/repository";

export async function createStoreAction(formData: FormData) {
  assertTrustedServerAction();
  const identity = await requireIdentity();
  const repository = getRepository();
  if (!canCreateStore(identity, (await repository.listStores(identity)).length)) throw new Error("You already have a shop. Open it from your dashboard.");
  const name = formValue(formData, "name").trim();
  const slug = formValue(formData, "slug").trim().toLowerCase();
  if (!name || name.length > 80) throw new Error("Store name is required and must be 80 characters or fewer.");
  const slugError = validateSlug(slug);
  if (slugError) throw new Error(slugError);
  if (await repository.getStoreBySlug(slug)) throw new Error("That slug is already in use. Choose another one.");
  const store = await repository.createStore({ name, slug }, identity.id);
  revalidatePath("/admin");
  redirect(`/admin/${store.id}/settings`);
}

export async function saveSettingsAction(formData: FormData) {
  assertTrustedServerAction();
  const storeId = formValue(formData, "store_id");
  const { store } = await requireStoreAccess(storeId);
  const intent = formValue(formData, "intent") || "save";
  const input = parseStoreForm(formData);
  const updates: Partial<StoreInput> & { status?: "draft" | "published" } = { ...input, status: intent === "publish" ? "published" : intent === "unpublish" ? "draft" : store.status };
  const requestedSlug = formValue(formData, "slug").trim().toLowerCase();
  if (requestedSlug && requestedSlug !== store.slug) {
    if (store.status !== "draft") throw new Error("A published store slug cannot be changed.");
    const slugError = validateSlug(requestedSlug);
    if (slugError) throw new Error(slugError);
    const existing = await getRepository().getStoreBySlug(requestedSlug);
    if (existing && existing.id !== store.id) throw new Error("That slug is already in use. Choose another one.");
    updates.slug = requestedSlug;
  }
  const next = await getRepository().saveStore(store.id, updates);
  revalidatePath("/admin");
  revalidatePath(`/admin/${store.id}/settings`);
  revalidatePath(`/s/${store.slug}`);
  revalidatePath(`/s/${next.slug}`);
  redirect(`/admin/${store.id}/settings?saved=1`);
}

export async function saveProductAction(formData: FormData) {
  assertTrustedServerAction();
  const storeId = formValue(formData, "store_id");
  const productId = formValue(formData, "product_id") || null;
  const { store } = await requireStoreAccess(storeId);
  const input = parseProductForm(formData, store.currency);
  const product = await getRepository().saveProduct(store.id, productId, input);
  revalidatePath(`/admin/${store.id}/products`);
  revalidatePath(`/s/${store.slug}`);
  revalidatePath(`/s/${store.slug}/p/${product.id}`);
  redirect(`/admin/${store.id}/products?saved=1`);
}

export async function setAvailabilityAction(formData: FormData) {
  assertTrustedServerAction();
  const storeId = formValue(formData, "store_id");
  const ids = formData.getAll("product_ids").map(String);
  const availability = formValue(formData, "availability");
  const { store } = await requireStoreAccess(storeId);
  if (!ids.length || !["in_stock", "out_of_stock"].includes(availability)) throw new Error("Select products and an availability state.");
  await getRepository().setProductAvailability(store.id, ids, availability as "in_stock" | "out_of_stock");
  revalidatePath(`/admin/${store.id}/products`);
  revalidatePath(`/s/${store.slug}`);
}

export async function reorderProductAction(formData: FormData) {
  assertTrustedServerAction();
  const storeId = formValue(formData, "store_id");
  const productId = formValue(formData, "product_id");
  const direction = formValue(formData, "direction");
  const { store } = await requireStoreAccess(storeId);
  if (direction !== "up" && direction !== "down") throw new Error("Invalid sort direction.");
  await getRepository().reorderProduct(store.id, productId, direction);
  revalidatePath(`/admin/${store.id}/products`);
  revalidatePath(`/s/${store.slug}`);
}

export async function deleteProductsAction(formData: FormData) {
  assertTrustedServerAction();
  const storeId = formValue(formData, "store_id");
  const ids = formData.getAll("product_ids").map(String);
  const { store } = await requireStoreAccess(storeId);
  if (!ids.length) throw new Error("Select at least one product to delete.");
  await getRepository().deleteProducts(store.id, ids);
  revalidatePath(`/admin/${store.id}/products`);
  revalidatePath(`/s/${store.slug}`);
}
