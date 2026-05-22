"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  generateVariant,
  generateGraphicBrief,
  updatePostStatus,
  updateSchedule,
  updatePostedUrl,
} from "@/lib/actions";
import {
  PLATFORM_LABELS,
  STATUS_LABELS,
  type PlatformPost,
  type PostStatus,
  type Track,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUSES: PostStatus[] = ["drafting", "ready", "scheduled", "posted"];

export function OutputsPanel({
  track,
  contentUnitId,
  posts,
}: {
  track: Track;
  contentUnitId: string;
  posts: PlatformPost[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const byPlatform = (p: string) => posts.find((x) => x.platform === p);
  const linkedin = byPlatform("linkedin");

  async function makeVariant(target: "substack_note" | "instagram") {
    setPending(target);
    try {
      await generateVariant(contentUnitId, target);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (track === "substack_article") {
    const article = byPlatform("substack_article");
    return (
      <div className="space-y-4">
        {article ? (
          <PostCard post={article} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Complete the interview and generate the draft to produce the article.
          </p>
        )}
      </div>
    );
  }

  // Track A
  return (
    <div className="space-y-4">
      {linkedin ? (
        <PostCard post={linkedin} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Generate the draft from the interview to produce the LinkedIn post.
        </p>
      )}

      {linkedin?.body && (
        <div className="flex flex-wrap gap-2">
          {(["substack_note", "instagram"] as const).map((t) =>
            byPlatform(t) ? null : (
              <Button
                key={t}
                variant="outline"
                size="sm"
                disabled={pending === t}
                onClick={() => makeVariant(t)}
              >
                {pending === t
                  ? "Generating…"
                  : `Generate ${PLATFORM_LABELS[t]}`}
              </Button>
            )
          )}
        </div>
      )}

      {byPlatform("substack_note") && <PostCard post={byPlatform("substack_note")!} />}
      {byPlatform("instagram") && <PostCard post={byPlatform("instagram")!} />}
    </div>
  );
}

function PostCard({ post }: { post: PlatformPost }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState(
    post.scheduled_for ? toLocalInput(post.scheduled_for) : ""
  );
  const [url, setUrl] = useState(post.posted_url ?? "");

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          {PLATFORM_LABELS[post.platform] ?? post.platform}
        </CardTitle>
        <Badge variant="clay">{STATUS_LABELS[post.status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {post.body && (
          <p className="whitespace-pre-wrap text-sm">{post.body}</p>
        )}

        {post.hook_variants.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              Hook variants
            </p>
            <ul className="space-y-1 text-sm">
              {post.hook_variants.map((h, i) => (
                <li key={i} className="rounded bg-muted px-2 py-1">
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          {post.graphic_brief ? (
            <details>
              <summary className="cursor-pointer text-xs font-medium uppercase text-muted-foreground">
                Graphic brief
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-3 text-xs">
                {post.graphic_brief}
              </pre>
            </details>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={!post.body || busy === "brief"}
              onClick={() =>
                run("brief", () => generateGraphicBrief(post.id))
              }
            >
              {busy === "brief" ? "Generating…" : "Generate graphic brief"}
            </Button>
          )}
        </div>

        {/* Status controls */}
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() =>
                run(`status-${s}`, () =>
                  updatePostStatus(post.id, post.content_unit_id, s)
                )
              }
              className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                post.status === s
                  ? "border-navy bg-accent"
                  : "border-border hover:bg-muted"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Scheduled for</label>
            <Input
              type="datetime-local"
              value={scheduled}
              onChange={(e) => setScheduled(e.target.value)}
              onBlur={() =>
                run("schedule", () =>
                  updateSchedule(
                    post.id,
                    post.content_unit_id,
                    scheduled ? new Date(scheduled).toISOString() : null
                  )
                )
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Posted URL</label>
            <Input
              type="url"
              value={url}
              placeholder="https://…"
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() =>
                run("url", () =>
                  updatePostedUrl(post.id, post.content_unit_id, url)
                )
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ISO -> value for <input type="datetime-local"> in local time.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
