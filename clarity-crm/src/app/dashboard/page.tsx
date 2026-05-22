import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { reconcileArchives } from "@/lib/archive";
import {
  brisbaneWeek,
  brisbaneDateKey,
  slotInstant,
  brisbaneTimeLabel,
} from "@/lib/time";
import {
  PLATFORM_LABELS,
  TRACK_LABELS,
  TRACK_PLATFORMS,
  type CadenceSlot,
  type PostStatus,
  type Track,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PostRow = {
  id: string;
  platform: string;
  status: PostStatus;
  scheduled_for: string | null;
  posted_at: string | null;
  content_unit_id: string;
  content_units: { track: Track; seed_text: string };
};

type Coverage = "scheduled" | "ready" | "gap" | "missed";

const TRACKS: Track[] = ["linkedin_led", "substack_article"];

export default async function DashboardPage() {
  await reconcileArchives();

  const supabase = await createClient();
  const now = new Date();
  const week = brisbaneWeek(now);

  const [{ data: slotsData }, { data: postsData }] = await Promise.all([
    supabase.from("cadence_slots").select("*").eq("active", true),
    supabase
      .from("platform_posts")
      .select(
        "id, platform, status, scheduled_for, posted_at, content_unit_id, content_units!inner(track, seed_text, archived_at)"
      )
      .is("content_units.archived_at", null),
  ]);

  const slots = (slotsData as CadenceSlot[] | null) ?? [];
  const posts = (postsData as PostRow[] | null) ?? [];

  // Index scheduled posts by platform + Brisbane day; pool ready posts by platform.
  const scheduledByKey = new Map<string, PostRow>();
  const postedByKey = new Map<string, PostRow[]>();
  const readyPool = new Map<string, number>();
  for (const p of posts) {
    if (p.status === "scheduled" && p.scheduled_for) {
      scheduledByKey.set(
        `${p.platform}|${brisbaneDateKey(new Date(p.scheduled_for))}`,
        p
      );
    }
    if (p.status === "posted" && p.posted_at) {
      const k = brisbaneDateKey(new Date(p.posted_at));
      postedByKey.set(k, [...(postedByKey.get(k) ?? []), p]);
    }
    if (p.status === "ready") {
      readyPool.set(p.platform, (readyPool.get(p.platform) ?? 0) + 1);
    }
  }

  // Coverage for each cadence anchor this week, consuming the ready pool in
  // chronological order so the earliest upcoming slots get filled first.
  const pool = new Map(readyPool);
  type Anchor = {
    slot: CadenceSlot;
    day: (typeof week)[number];
    coverage: Coverage;
    instant: Date;
    covering?: PostRow;
  };
  const anchors: Anchor[] = [];
  for (const day of week) {
    for (const slot of slots.filter((s) => s.day_of_week === day.dow)) {
      const instant = slotInstant(day.key, slot.time_of_day);
      const covering = scheduledByKey.get(`${slot.platform}|${day.key}`);
      let coverage: Coverage;
      if (covering) {
        coverage = "scheduled";
      } else if ((pool.get(slot.platform) ?? 0) > 0) {
        pool.set(slot.platform, pool.get(slot.platform)! - 1);
        coverage = "ready";
      } else {
        coverage = instant.getTime() >= now.getTime() ? "gap" : "missed";
      }
      anchors.push({ slot, day, coverage, instant, covering });
    }
  }

  const gaps = anchors
    .filter((a) => a.coverage === "gap")
    .sort((a, b) => a.instant.getTime() - b.instant.getTime());

  // Pipeline counts per track.
  const pipeline = TRACKS.map((t) => {
    const trackPosts = posts.filter((p) => p.content_units.track === t);
    const units = new Set(trackPosts.map((p) => p.content_unit_id)).size;
    const count = (s: PostStatus) => trackPosts.filter((p) => p.status === s).length;
    return {
      track: t,
      units,
      drafting: count("drafting"),
      ready: count("ready"),
      scheduled: count("scheduled"),
      posted: count("posted"),
    };
  });

  return (
    <>
      <Nav />
      <main className="container max-w-5xl py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-navy">This week</h1>
            <p className="text-sm text-muted-foreground">
              {week[0].short} {week[0].key.slice(5)} – {week[6].short}{" "}
              {week[6].key.slice(5)} · Brisbane time
            </p>
          </div>
          <Button asChild>
            <Link href="/new">New seed</Link>
          </Button>
        </div>

        {/* Needs attention */}
        {gaps.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
              Needs attention
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gaps.map((g) => (
                <Card key={g.slot.id} className="border-clay/60 bg-clay/5">
                  <CardContent className="p-4">
                    <p className="font-medium">
                      {PLATFORM_LABELS[g.slot.platform] ?? g.slot.platform}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {g.day.full} {brisbaneTimeLabel(g.slot.time_of_day)} — nothing
                      ready or scheduled
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link href="/new">Fill this slot</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* This week split by track */}
        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          {TRACKS.map((track) => {
            const platforms = TRACK_PLATFORMS[track];
            const rows = week
              .map((day) => {
                const dayAnchors = anchors.filter(
                  (a) => a.day.key === day.key && platforms.includes(a.slot.platform)
                );
                const posted = (postedByKey.get(day.key) ?? []).filter((p) =>
                  platforms.includes(p.platform)
                );
                return { day, dayAnchors, posted };
              })
              .filter((r) => r.dayAnchors.length > 0 || r.posted.length > 0);

            return (
              <Card key={track}>
                <CardHeader>
                  <CardTitle className="text-base">{TRACK_LABELS[track]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rows.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nothing scheduled this week.
                    </p>
                  )}
                  {rows.map(({ day, dayAnchors, posted }) => (
                    <div key={day.key} className="text-sm">
                      <p
                        className={`mb-1 font-medium ${
                          day.isToday ? "text-clay" : ""
                        }`}
                      >
                        {day.full}
                        {day.isToday && " · today"}
                      </p>
                      <div className="space-y-1">
                        {dayAnchors.map((a) => {
                          const label = (
                            <>
                              <span>
                                {PLATFORM_LABELS[a.slot.platform] ?? a.slot.platform}{" "}
                                <span className="text-muted-foreground">
                                  {brisbaneTimeLabel(a.slot.time_of_day)}
                                </span>
                              </span>
                              <CoverageBadge coverage={a.coverage} />
                            </>
                          );
                          return a.covering ? (
                            <Link
                              key={a.slot.id}
                              href={`/unit/${a.covering.content_unit_id}`}
                              className="flex items-center justify-between rounded border border-border px-2 py-1 hover:bg-muted"
                            >
                              {label}
                            </Link>
                          ) : (
                            <div
                              key={a.slot.id}
                              className="flex items-center justify-between rounded border border-border px-2 py-1"
                            >
                              {label}
                            </div>
                          );
                        })}
                        {posted.map((p) => (
                          <Link
                            key={p.id}
                            href={`/unit/${p.content_unit_id}`}
                            className="flex items-center justify-between rounded border border-border px-2 py-1 hover:bg-muted"
                          >
                            <span className="truncate">
                              {PLATFORM_LABELS[p.platform] ?? p.platform}:{" "}
                              <span className="text-muted-foreground">
                                {p.content_units.seed_text}
                              </span>
                            </span>
                            <Badge variant="sage">Posted</Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Pipeline counts */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
            Pipeline
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {pipeline.map((p) => (
              <Card key={p.track}>
                <CardHeader>
                  <CardTitle className="text-base">{TRACK_LABELS[p.track]}</CardTitle>
                  <CardDescription>{p.units} active units</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 text-sm">
                  <Stat label="Drafting" value={p.drafting} />
                  <Stat label="Ready" value={p.ready} />
                  <Stat label="Scheduled" value={p.scheduled} />
                  <Stat label="Posted" value={p.posted} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function CoverageBadge({ coverage }: { coverage: Coverage }) {
  switch (coverage) {
    case "scheduled":
      return <Badge variant="sage">Scheduled</Badge>;
    case "ready":
      return <Badge variant="sage">Ready</Badge>;
    case "gap":
      return <Badge variant="clay">Needs attention</Badge>;
    default:
      return <Badge variant="outline">Missed</Badge>;
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <span className="font-serif text-lg text-navy">{value}</span>{" "}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
