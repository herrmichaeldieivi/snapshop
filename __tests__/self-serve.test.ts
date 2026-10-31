import { describe, expect, it } from "vitest";
import { canCreateStore, MAX_STORES_PER_OWNER } from "@/src/lib/access";
import type { AdminIdentity } from "@/src/lib/types";

const owner: AdminIdentity = { id: "u1", email: "o@example.com", isOperator: false, isDemo: false };
const operator: AdminIdentity = { ...owner, id: "u2", isOperator: true };

describe("self-serve store creation", () => {
  it("lets a new owner create their first shop", () => expect(canCreateStore(owner, 0)).toBe(true));
  it("stops an owner at the limit", () => expect(canCreateStore(owner, MAX_STORES_PER_OWNER)).toBe(false));
  it("never limits operators", () => expect(canCreateStore(operator, 50)).toBe(true));
});
