import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { reconcileArchives } from "@/lib/archive";
import {
  TRACK_LABELS,
  STATUS_LABELS,
  type PostStatus,
  type Track,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_ORDER: PostStatus[] = [
  "idea",
  "drafting",
  "ready",
  "scheduled",
  "posted",
];

type UnitRow = {
  id: string;
  track: Track;
  seed_text: string;
  topic_tags: string[];
  created_at: string;
  platform_posts: { status: PostStatus }[];
};

// The unit's headline stage = the least-advanced status among its posts
// (so anything still drafting keeps the whole unit "in progress").
function unitStage(posts: { status: PostStatus }[]): PostStatus {
  if (!posts.length) return "idea";
  return posts.reduce<PostStatus>((lowest, p) => {
    return STATUS_ORDER.indexOf(p.status) < STATUS_ORDER.indexOf(lowest)
      ? p.status
      : lowest;
  }, "posted");
}

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track } = await searchParams;
  await reconcileArchives();
  const supabase = await createClient();

  let query = supabase
    .from("content_units")
    .select("id, track, seed_text, topic_tags, created_at, platform_posts(status)")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (track === "linkedin_led" || track === "substack_article") {
    query = query.eq("track", track);
  }

  const { data } = await query;
  const units = (data as UnitRow[] | null) ?? [];

  return (
    <>
      <Nav />
      <main className="container max-w-4xl py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl text-navy">Ideas</h1>
          <Button asChild>
            <Link href="/new">New seed</Link>
          </Button>
        </div>

        <div className="mb-6 flex gap-2 text-sm">
          {[
            { label: "All", value: undefined },
            { label: "LinkedIn-led", value: "linkedin_led" },
            { label: "Substack article", value: "substack_article" },
          ].map((f) => (
            <Link
              key={f.label}
              href={f.value ? `/ideas?track=${f.value}` : "/ideas"}
              className={`rounded-full border px-3 py-1 transition-colors ${
                (track ?? undefined) === f.value
                  ? "border-navy bg-accent"
                  : "border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {units.length === 0 ? (
          <p className="text-muted-foreground">
            No ideas yet.{" "}
            <Link href="/new" className="underline">
              Capture your first seed.
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {units.map((u) => {
              const stage = unitStage(u.platform_posts);
              return (
                <Link key={u.id} href={`/unit/${u.id}`}>
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.seed_text}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="sage">{TRACK_LABELS[u.track]}</Badge>
                          {u.topic_tags.map((t) => (
                            <Badge key={t} variant="outline">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge variant="clay">{STATUS_LABELS[stage]}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
