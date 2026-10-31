import Link from "next/link";
import { ImportFlow } from "@/components/import-flow";
import { requireStoreAccess } from "@/src/lib/access";
import { getRepository } from "@/src/lib/repository";
import { formatDate } from "@/src/lib/utils";

export const metadata = { title: "Import products" };
export default async function ImportPage({ params }: { params: { storeId: string } }) {
  const { store } = await requireStoreAccess(params.storeId);
  const imports = await getRepository().listImports(store.id);
  return <div className="max-w-5xl"><p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">{store.name}</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Import a catalogue</h1><p className="mt-3 text-sm text-neutral-600">Validate first. Preview second. Commit only when the product list looks right.</p><div className="mt-7"><ImportFlow store={store} /></div><section className="card mt-10 overflow-hidden"><div className="flex items-center justify-between border-b border-[#dedbd3] px-5 py-4"><div><h2 className="font-black">Past imports</h2><p className="mt-1 text-sm text-neutral-600">Audit reports remain available to store owners and operators.</p></div><span className="font-mono text-xs text-neutral-500">{imports.length}</span></div>{imports.length ? <div>{imports.map((record) => <Link key={record.id} href={`/admin/${store.id}/import/${record.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[#eceae4] px-5 py-4 last:border-0 hover:bg-[#fbfaf8]"><span><strong className="block truncate text-sm">{record.filename}</strong><small className="text-neutral-500">{formatDate(record.created_at)} · {record.imported_count} imported of {record.row_count} rows</small></span><b className={`status ${record.status === "committed" ? "bg-[#ddefe5] text-success" : record.status === "cancelled" ? "bg-[#eeece6] text-neutral-600" : "bg-[#fff0d5] text-warning"}`}>{record.status}</b></Link>)}</div> : <p className="px-5 py-8 text-sm text-neutral-600">No imports yet. Your validation and commit reports will appear here.</p>}</section></div>;
}
