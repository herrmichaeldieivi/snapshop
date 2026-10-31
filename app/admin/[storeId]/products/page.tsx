import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { ProductsTable } from "@/components/products-table";
import { requireStoreAccess } from "@/src/lib/access";
import { getRepository } from "@/src/lib/repository";
import { deleteProductsAction, reorderProductAction, setAvailabilityAction } from "@/app/admin/actions";

export const metadata = { title: "Products" };

export default async function ProductsPage({ params, searchParams }: { params: { storeId: string }; searchParams: { page?: string } }) {
  const { store } = await requireStoreAccess(params.storeId);
  const products = await getRepository().listProducts(store.id);
  const page = Number(searchParams.page || "1");
  return <><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">{store.name}</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Products</h1><p className="mt-3 text-sm text-neutral-600">Availability, order, details, and images live here.</p></div><div className="flex flex-wrap gap-2"><a className="button-secondary" href={`/api/products/export?store_id=${store.id}`}><Download size={16} />Export CSV</a><Link className="button-primary" href={`/admin/${store.id}/products/new`}><Plus size={17} />Add product</Link></div></div><ProductsTable store={store} products={products} page={Number.isFinite(page) ? page : 1} setAvailability={setAvailabilityAction} reorder={reorderProductAction} remove={deleteProductsAction} /></>;
}
