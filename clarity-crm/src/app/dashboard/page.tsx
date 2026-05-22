import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import {
  PLATFORM_LABELS,
  TRACK_LABELS,
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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Row = {
  track: Track;
  platform_posts: { platform: string; status: PostStatus }[];
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: unitsData }, { data: slotsData }] = await Promise.all([
    supabase
      .from("content_units")
      .select("track, platform_posts(platform, status)")
      .is("archived_at", null),
    supabase
      .from("cadence_slots")
      .select("*")
      .eq("active", true)
      .order("day_of_week", { ascending: true }),
  ]);

  const units = (unitsData as Row[] | null) ?? [];
  const slots = (slotsData as CadenceSlot[] | null) ?? [];
  const allPosts = units.flatMap((u) => u.platform_posts);

  // Pipeline counts per track.
  const tracks: Track[] = ["linkedin_led", "substack_article"];
  const pipeline = tracks.map((t) => {
    const trackUnits = units.filter((u) => u.track === t);
    const posts = trackUnits.flatMap((u) => u.platform_posts);
    const count = (s: PostStatus) => posts.filter((p) => p.status === s).length;
    return {
      track: t,
      ideas: trackUnits.length,
      drafting: count("drafting"),
      ready: count("ready"),
      scheduled: count("scheduled"),
      posted: count("posted"),
    };
  });

  // Cadence gaps: a slot needs attention if no post for that platform is
  // ready or scheduled. (Brisbane-local timing refinement is Phase 3.)
  const readyOrScheduledByPlatform = new Map<string, number>();
  for (const p of allPosts) {
    if (p.status === "ready" || p.status === "scheduled") {
      readyOrScheduledByPlatform.set(
        p.platform,
        (readyOrScheduledByPlatform.get(p.platform) ?? 0) + 1
      );
    }
  }
  const slotStatus = slots.map((s) => ({
    slot: s,
    covered: (readyOrScheduledByPlatform.get(s.platform) ?? 0) > 0,
  }));

  return (
    <>
      <Nav />
      <main className="container max-w-5xl py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl text-navy">This week</h1>
          <Button asChild>
            <Link href="/new">New seed</Link>
          </Button>
        </div>

        {/* Cadence slots + gaps */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground">
            Cadence
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slotStatus.map(({ slot, covered }) => (
              <Card
                key={slot.id}
                className={covered ? "" : "border-clay/60 bg-clay/5"}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">
                      {PLATFORM_LABELS[slot.platform] ?? slot.platform}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {DAYS[slot.day_of_week]} {slot.time_of_day.slice(0, 5)}
                    </p>
                  </div>
                  {covered ? (
                    <Badge variant="sage">Covered</Badge>
                  ) : (
                    <Badge variant="clay">Needs attention</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
            {slots.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No cadence slots yet — they seed automatically on first sign-in.
              </p>
            )}
          </div>
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
                  <CardTitle className="text-base">
                    {TRACK_LABELS[p.track]}
                  </CardTitle>
                  <CardDescription>{p.ideas} ideas</CardDescription>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <span className="font-serif text-lg text-navy">{value}</span>{" "}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
