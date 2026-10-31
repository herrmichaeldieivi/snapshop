import { notFound } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";
import { requireStoreAccess } from "@/src/lib/access";
import { getRepository } from "@/src/lib/repository";
import { saveSettingsAction } from "@/app/admin/actions";

export const metadata = { title: "Store settings" };

export default async function SettingsPage({ params, searchParams }: { params: { storeId: string }; searchParams: { saved?: string } }) {
  const { store } = await requireStoreAccess(params.storeId);
  if (!store) notFound();
  const productCount = (await getRepository().listProducts(store.id)).length;
  return <div className="max-w-3xl"><p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">{store.slug}</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Store settings</h1><p className="mt-3 text-sm text-neutral-600">Make the contact path and the public face of {store.name} feel intentional.</p><div className="mt-7"><SettingsForm store={store} productCount={productCount} action={saveSettingsAction} saved={searchParams.saved === "1"} /></div></div>;
}
