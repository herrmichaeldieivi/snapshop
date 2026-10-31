import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/product-editor";
import { requireStoreAccess } from "@/src/lib/access";
import { getRepository } from "@/src/lib/repository";
import { saveProductAction } from "@/app/admin/actions";

export const metadata = { title: "Product editor" };

export default async function ProductEditorPage({ params }: { params: { storeId: string; productId: string } }) {
  const { store } = await requireStoreAccess(params.storeId);
  const repository = getRepository();
  const products = await repository.listProducts(store.id);
  const product = params.productId === "new" ? null : await repository.getProduct(store.id, params.productId);
  if (params.productId !== "new" && !product) notFound();
  const categories = Array.from(new Set(products.map((item) => item.category).filter((value): value is string => Boolean(value))));
  return <div className="max-w-4xl"><p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">{store.name}</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">{product ? `Edit ${product.title}` : "Add a product"}</h1><p className="mt-3 text-sm text-neutral-600">Write exactly what customers need to decide, then save when it is ready.</p><div className="mt-7"><ProductEditor store={store} product={product} categories={categories} action={saveProductAction} /></div></div>;
}
