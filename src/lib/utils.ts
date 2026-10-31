import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CurrencyCode } from "@/src/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function cleanOptional(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function luminance(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(normalized)) return 0;
  const channels = [0, 2, 4].map((position) => {
    const channel = Number.parseInt(normalized.slice(position, position + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableTextColor(background: string) {
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, "#171717") ? "#ffffff" : "#171717";
}

export function toCsvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
