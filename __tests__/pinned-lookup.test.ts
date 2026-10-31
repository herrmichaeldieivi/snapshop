import { describe, expect, it } from "vitest";
import { pinnedLookup } from "@/src/lib/image-security";

describe("pinnedLookup", () => {
  const lookup = pinnedLookup("cdn.example.com", { address: "93.184.216.34", family: 4 });

  it("answers single-address lookups", () => {
    let result: unknown[] = [];
    lookup("cdn.example.com", {}, (...args: unknown[]) => { result = args; });
    expect(result).toEqual([null, "93.184.216.34", 4]);
  });

  it("answers { all: true } lookups with an array, which Node 20+ autoSelectFamily requires", () => {
    let result: unknown[] = [];
    lookup("cdn.example.com", { all: true }, (...args: unknown[]) => { result = args; });
    expect(result).toEqual([null, [{ address: "93.184.216.34", family: 4 }]]);
  });

  it("refuses any other host, including after a redirect or rebinding attempt", () => {
    let error: unknown = null;
    lookup("evil.example.net", { all: true }, (first: unknown) => { error = first; });
    expect(error).toBeInstanceOf(Error);
  });
});
