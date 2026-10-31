import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeStore } from "@/src/lib/access";
import { processImportedImage } from "@/src/lib/image-pipeline";
import { getRepository } from "@/src/lib/repository";
import type { ImportIssue } from "@/src/lib/types";
import { assertTrustedRouteRequest, requestErrorStatus } from "@/src/lib/request-security";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertTrustedRouteRequest(request);
    const { store_id, import_id } = await request.json() as { store_id?: string; import_id?: string };
    if (!store_id || !import_id) return NextResponse.json({ error: "Store and import are required." }, { status: 400 });
    const { store } = await authorizeStore(store_id);
    const repository = getRepository();
    const record = await repository.getImport(store.id, import_id);
    if (!record) return NextResponse.json({ error: "Import not found." }, { status: 404 });
    if (record.status === "committed") return NextResponse.json({ imported: record.imported_count, errors: record.error_report.filter((issue) => issue.severity === "error").length, alreadyCommitted: true, reportUrl: `/admin/${store.id}/import/${record.id}` });
    let fetched = 0;
    const warnings: ImportIssue[] = [...record.error_report];
    const prepared = await Promise.all((record.payload ?? []).map(async (row) => {
      const image_urls: string[] = [];
      for (const source of row.image_urls) {
        if (fetched >= 200) { warnings.push({ row: row.sourceRow, field: "image_url", message: "Image fetch cap reached; this image was skipped.", severity: "warning" }); continue; }
        fetched += 1;
        try { image_urls.push(await processImportedImage(store.id, source)); } catch (error) { warnings.push({ row: row.sourceRow, field: "image_url", message: error instanceof Error ? `Image skipped: ${error.message}` : "Image could not be fetched and was skipped.", severity: "warning" }); }
      }
      return { ...row, image_urls };
    }));
    await repository.replaceImportPayload(store.id, record.id, prepared, warnings);
    const result = await repository.commitImport(store.id, record.id);
    revalidatePath(`/admin/${store.id}/products`);
    revalidatePath(`/admin/${store.id}/import`);
    revalidatePath(`/s/${store.slug}`);
    revalidatePath("/s/[slug]/p/[productId]", "page");
    console.info(JSON.stringify({ event: "import_committed", store_slug: store.slug, imported_count: result.imported, error_count: warnings.filter((issue) => issue.severity === "error").length }));
    return NextResponse.json({ imported: result.imported, errors: warnings.filter((issue) => issue.severity === "error").length, warnings: warnings.filter((issue) => issue.severity === "warning").length, alreadyCommitted: result.alreadyCommitted, reportUrl: `/admin/${store.id}/import/${record.id}` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import could not be committed. No products were changed." }, { status: requestErrorStatus(error) });
  }
}
