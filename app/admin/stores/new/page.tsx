import { redirect } from "next/navigation";
import { createStoreAction } from "@/app/admin/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireIdentity } from "@/src/lib/access";

export const metadata = { title: "Create a store" };

export default async function NewStorePage() {
  const identity = await requireIdentity();
  if (!identity.isOperator) redirect("/admin");
  return <AdminShell identity={identity}><div className="max-w-xl"><p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Operator tool</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Create a store</h1><p className="mt-3 text-sm leading-6 text-neutral-600">The slug becomes the shareable path. It can change one time while this store remains a draft.</p><form action={createStoreAction} className="card mt-7 space-y-5 p-5 sm:p-7"><label><span className="label">Business name</span><input className="input" required maxLength={80} name="name" placeholder="Juniper Studio" /></label><label><span className="label">Store slug</span><div className="flex overflow-hidden rounded-xl border border-[#cfcac0] bg-white"><span className="flex min-h-11 items-center border-r border-[#cfcac0] px-3 text-sm text-neutral-500">/s/</span><input className="min-h-11 min-w-0 flex-1 px-3 text-sm focus:outline-none" required minLength={3} maxLength={40} pattern="[a-z0-9-]+" name="slug" placeholder="juniper-studio" /></div></label><button className="button-primary w-full" type="submit">Create draft store</button></form></div></AdminShell>;
}
