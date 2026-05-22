import { createClient } from "@/lib/supabase/server";

const THIRTY_DAYS_MS = 30 * 86400000;

// Auto-archive: a content unit drops out of the active view 30 days after it's
// fully posted (every platform output is `posted` and the last post was >30 days
// ago). Idempotent — safe to call on each dashboard/ideas load. Does not delete.
export async function reconcileArchives(): Promise<void> {
  const supabase = await createClient();
  const cutoff = Date.now() - THIRTY_DAYS_MS;

  const { data } = await supabase
    .from("content_units")
    .select("id, platform_posts(status, posted_at)")
    .is("archived_at", null);

  const stale = ((data as
    | { id: string; platform_posts: { status: string; posted_at: string | null }[] }[]
    | null) ?? [])
    .filter((u) => {
      const posts = u.platform_posts ?? [];
      if (posts.length === 0) return false;
      if (!posts.every((p) => p.status === "posted")) return false;
      const last = Math.max(
        ...posts.map((p) => (p.posted_at ? new Date(p.posted_at).getTime() : 0))
      );
      return last > 0 && last < cutoff;
    })
    .map((u) => u.id);

  if (stale.length) {
    await supabase
      .from("content_units")
      .update({ archived_at: new Date().toISOString() })
      .in("id", stale);
  }
}
