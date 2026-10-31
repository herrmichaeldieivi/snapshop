import Papa from "papaparse";
import type { Availability, CurrencyCode, ImportIssue, ImportProductInput } from "@/src/lib/types";
import { isHttpUrl } from "@/src/lib/utils";

const HEADERS = ["title", "price", "image_url", "description", "category", "currency", "availability", "external_link", "sku"] as const;
const REQUIRED_HEADERS = ["title", "price", "image_url"] as const;
const CURRENCIES: CurrencyCode[] = ["USD", "CAD", "EUR", "GBP"];

export interface CatalogParseResult {
  rowsFound: number;
  rows: ImportProductInput[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
  fatalError?: string;
}

function cell(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
}

function issue(row: number, field: string, message: string, severity: "error" | "warning" = "error"): ImportIssue {
  return { row, field, message, severity };
}

function parseAvailability(value: string): Availability | null {
  if (!value) return "in_stock";
  const normalized = value.toLowerCase();
  if (normalized === "in_stock" || normalized === "yes") return "in_stock";
  if (normalized === "out_of_stock" || normalized === "no") return "out_of_stock";
  return null;
}

export function parseCatalogCsv(text: string, defaultCurrency: CurrencyCode): CatalogParseResult {
  const cleanText = text.replace(/^\uFEFF/, "");
  const parsed = Papa.parse<Record<string, string>>(cleanText, {
    header: true,
    skipEmptyLines: "greedy",
    delimiter: "",
    transformHeader: (header) => header.trim().toLowerCase(),
  });
  const fields = parsed.meta.fields ?? [];
  const errors: ImportIssue[] = parsed.errors.map((error) => issue((error.row ?? 0) + 2, "file", error.message));
  const warnings: ImportIssue[] = fields
    .filter((header) => !HEADERS.includes(header as (typeof HEADERS)[number]))
    .map((header) => issue(1, header, `Unknown column “${header}” will be ignored.`, "warning"));
  const missing = REQUIRED_HEADERS.filter((header) => !fields.includes(header));
  if (missing.length) {
    return { rowsFound: parsed.data.length, rows: [], errors, warnings, fatalError: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.` };
  }
  if (parsed.data.length > 200) {
    return { rowsFound: parsed.data.length, rows: [], errors, warnings, fatalError: "This file has more than 200 data rows." };
  }

  const rows: ImportProductInput[] = [];
  const seenSkus = new Set<string>();
  parsed.data.forEach((source, index) => {
    const row = index + 2;
    const rowErrors: ImportIssue[] = [];
    const rowWarnings: ImportIssue[] = [];
    const title = cell(source, "title");
    const priceText = cell(source, "price");
    const rawImages = cell(source, "image_url");
    const description = cell(source, "description") || null;
    const category = cell(source, "category") || null;
    const currencyText = cell(source, "currency").toUpperCase();
    const availabilityText = cell(source, "availability");
    const externalLink = cell(source, "external_link") || null;
    const sku = cell(source, "sku") || null;

    if (!title || title.length > 120) rowErrors.push(issue(row, "title", title ? "Title must be 120 characters or fewer." : "Title is required."));
    if (!/^\d+(?:\.\d+)?$/.test(priceText)) rowErrors.push(issue(row, "price", "Price must be a non-negative number with no currency symbol."));
    const numericPrice = Number(priceText);
    if (Number.isFinite(numericPrice) && numericPrice < 0) rowErrors.push(issue(row, "price", "Price must be non-negative."));
    if (Number.isFinite(numericPrice) && /\.\d{3,}$/.test(priceText)) rowWarnings.push(issue(row, "price", "Price was rounded to two decimal places.", "warning"));

    const imageUrls = rawImages.split(",").map((item) => item.trim()).filter(Boolean);
    if (!imageUrls.length) rowErrors.push(issue(row, "image_url", "At least one image URL is required."));
    if (imageUrls.length > 5) rowErrors.push(issue(row, "image_url", "Use no more than five image URLs."));
    if (imageUrls.some((url) => !isHttpUrl(url))) rowErrors.push(issue(row, "image_url", "Each image URL must begin with http:// or https://."));
    if (description && description.length > 2000) rowErrors.push(issue(row, "description", "Description must be 2,000 characters or fewer."));
    if (category && category.length > 60) rowErrors.push(issue(row, "category", "Category must be 60 characters or fewer."));
    const currency = (currencyText || defaultCurrency) as CurrencyCode;
    if (!CURRENCIES.includes(currency)) rowErrors.push(issue(row, "currency", "Currency must be USD, CAD, EUR, or GBP."));
    const availability = parseAvailability(availabilityText);
    if (!availability) rowErrors.push(issue(row, "availability", "Availability must be in_stock, out_of_stock, yes, or no."));
    if (externalLink && !isHttpUrl(externalLink)) rowErrors.push(issue(row, "external_link", "External link must begin with http:// or https://."));
    if (sku && sku.length > 64) rowErrors.push(issue(row, "sku", "SKU must be 64 characters or fewer."));
    if (sku) {
      const comparableSku = sku.toLowerCase();
      if (seenSkus.has(comparableSku)) rowErrors.push(issue(row, "sku", "Duplicate SKU in this file; only the first occurrence can be imported."));
      seenSkus.add(comparableSku);
    }

    errors.push(...rowErrors);
    warnings.push(...rowWarnings);
    if (!rowErrors.length && availability) {
      rows.push({ sourceRow: row, title, price: Number(numericPrice.toFixed(2)), image_urls: imageUrls, description, category, currency, availability, external_link: externalLink, sku });
    }
  });
  return { rowsFound: parsed.data.length, rows, errors, warnings };
}

export function makeErrorReportCsv(issues: ImportIssue[]) {
  const rows = [["row", "field", "severity", "message"], ...issues.map((item) => [String(item.row), item.field, item.severity, item.message])];
  return Papa.unparse(rows);
}
