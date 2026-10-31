import { NextResponse } from "next/server";
import { authorizeStore } from "@/src/lib/access";
import { parseCatalogCsv } from "@/src/lib/csv";
import { takeRateLimit } from "@/src/lib/rate-limit";
import { getRepository } from "@/src/lib/repository";
import { assertTrustedRouteRequest, requestErrorStatus } from "@/src/lib/request-security";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertTrustedRouteRequest(request);
    const formData = await request.formData();
    const storeId = String(formData.get("store_id") ?? "");
    const file = formData.get("file");
    const { identity, store } = await authorizeStore(storeId);
    if (!takeRateLimit(`csv:${store.id}`, 10, 60 * 60 * 1000)) return NextResponse.json({ error: "CSV upload limit reached. Try again in an hour." }, { status: 429 });
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) return NextResponse.json({ error: "Upload a .csv file." }, { status: 400 });
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "CSV files must be 2 MB or smaller." }, { status: 400 });
    const result = parseCatalogCsv(await file.text(), store.currency);
    if (result.fatalError) return NextResponse.json({ error: result.fatalError, result }, { status: 400 });
    const products = await getRepository().listProducts(store.id);
    let creates = 0; let updates = 0;
    for (const row of result.rows) {
      const match = row.sku ? products.some((product) => product.sku?.toLowerCase() === row.sku?.toLowerCase()) : products.some((product) => product.title.trim().toLowerCase() === row.title.trim().toLowerCase());
      if (match) updates += 1; else creates += 1;
    }
    const issues = [...result.errors, ...result.warnings];
    const record = await getRepository().createImport(store.id, identity, file.name, result.rowsFound, result.rows, issues);
    const invalidCount = new Set(result.errors.map((issue) => issue.row)).size;
    return NextResponse.json({ importId: record.id, rowsFound: result.rowsFound, validCount: result.rows.length, invalidCount, errors: result.errors, warnings: result.warnings, preview: result.rows.slice(0, 20), creates, updates });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not validate this CSV." }, { status: requestErrorStatus(error) });
  }
}
