import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_LABELS, type CadenceSlot } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cadence_slots")
    .select("*")
    .order("day_of_week", { ascending: true });
  const slots = (data as CadenceSlot[] | null) ?? [];

  return (
    <>
      <Nav />
      <main className="container max-w-2xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>Cadence</CardTitle>
            <CardDescription>
              Posting anchors (Brisbane time). Editing is coming in a later phase
              — these seed automatically for each account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {slots.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">
                  {PLATFORM_LABELS[s.platform] ?? s.platform}
                </span>
                <span className="text-muted-foreground">
                  {DAYS[s.day_of_week]} · {s.time_of_day.slice(0, 5)}
                </span>
                {s.active ? (
                  <Badge variant="sage">Active</Badge>
                ) : (
                  <Badge variant="outline">Off</Badge>
                )}
              </div>
            ))}
            {slots.length === 0 && (
              <p className="text-muted-foreground">No cadence slots found.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
