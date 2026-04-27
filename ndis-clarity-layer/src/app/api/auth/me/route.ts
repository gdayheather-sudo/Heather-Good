import { readSession } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function GET() {
  const s = await readSession();
  return ok({ user: s });
}
