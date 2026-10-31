import { AdminShell } from "@/components/admin-shell";
import { requireStoreAccess } from "@/src/lib/access";

export default async function StoreAdminLayout({ children, params }: { children: React.ReactNode; params: { storeId: string } }) {
  const { identity, store } = await requireStoreAccess(params.storeId);
  return <AdminShell identity={identity} store={store}>{children}</AdminShell>;
}
