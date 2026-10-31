import { requireIdentity } from "@/src/lib/access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireIdentity();
  return children;
}
