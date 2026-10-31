"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input aria-label={label} readOnly value={value} className="input font-mono text-xs" onFocus={(event) => event.currentTarget.select()} />
      <button
        type="button"
        className="button-secondary shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            /* clipboard blocked: the field is selectable */
          }
        }}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
