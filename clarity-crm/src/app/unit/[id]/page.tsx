import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { archiveUnit } from "@/lib/actions";
import { InterviewChat } from "@/components/interview-chat";
import { OutputsPanel } from "@/components/outputs-panel";
import {
  TRACK_LABELS,
  type ContentUnit,
  type Interview,
  type PlatformPost,
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

export default async function UnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: unit } = await supabase
    .from("content_units")
    .select("*")
    .eq("id", id)
    .single<ContentUnit>();
  if (!unit) notFound();

  const { data: interview } = await supabase
    .from("interviews")
    .select("*")
    .eq("content_unit_id", id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single<Interview>();

  const { data: postsData } = await supabase
    .from("platform_posts")
    .select("*")
    .eq("content_unit_id", id)
    .order("created_at", { ascending: true });
  const posts = (postsData as PlatformPost[] | null) ?? [];

  return (
    <>
      <Nav />
      <main className="container max-w-5xl py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Badge variant="sage">{TRACK_LABELS[unit.track]}</Badge>
            <h1 className="mt-2 text-2xl text-navy">{unit.seed_text}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {unit.topic_tags.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <form action={archiveUnit.bind(null, unit.id)}>
            <Button variant="ghost" size="sm" type="submit">
              Archive
            </Button>
          </form>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Interview</CardTitle>
              <CardDescription>
                Answer the questions, then generate the draft.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interview ? (
                <InterviewChat
                  contentUnitId={unit.id}
                  initialMessages={interview.messages}
                  status={interview.status}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No interview found for this unit.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Outputs</CardTitle>
              <CardDescription>
                Drafts, variants, graphic briefs and status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OutputsPanel
                track={unit.track}
                contentUnitId={unit.id}
                posts={posts}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
