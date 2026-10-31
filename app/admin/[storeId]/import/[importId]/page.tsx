import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileWarning } from "lucide-react";
import { requireStoreAccess } from "@/src/lib/access";
import { getRepository } from "@/src/lib/repository";
import { formatDate } from "@/src/lib/utils";

export const metadata = { title: "Import report" };
export default async function ImportReportPage({ params }: { params: { storeId: string; importId: string } }) {
  const { store } = await requireStoreAccess(params.storeId);
  const record = await getRepository().getImport(store.id, params.importId);
  if (!record) notFound();
  return <div className="max-w-4xl"><Link className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand" href={`/admin/${store.id}/import`}><ArrowLeft size={16} />Back to import</Link><p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Import report</p><h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">{record.filename}</h1><p className="mt-3 text-sm text-neutral-600">{formatDate(record.created_at)} · {record.row_count} rows found · {record.imported_count} products imported</p><div className="mt-6 flex items-center gap-3 rounded-xl bg-[#eeece6] px-4 py-3"><FileWarning size={18} /><span className="text-sm font-bold capitalize">Status: {record.status}</span></div><section className="card mt-6 overflow-hidden"><div className="border-b border-[#dedbd3] px-5 py-4"><h2 className="font-black">Errors and warnings</h2></div>{record.error_report.length ? <div>{record.error_report.map((issue, index) => <div key={`${issue.row}-${issue.field}-${index}`} className="grid grid-cols-[4rem_6rem_1fr] gap-3 border-b border-[#eceae4] px-5 py-4 text-sm last:border-0"><span className="font-mono text-xs">Row {issue.row}</span><span className={`font-mono text-[10px] font-bold uppercase ${issue.severity === "error" ? "text-[#a42929]" : "text-warning"}`}>{issue.field}</span><span>{issue.message}</span></div>)}</div> : <p className="px-5 py-8 text-sm text-neutral-600">No row errors or warnings were recorded.</p>}</section></div>;
}
