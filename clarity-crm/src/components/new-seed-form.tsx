"use client";

import { useState } from "react";
import { createSeed } from "@/lib/actions";
import { TRACK_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewSeedForm() {
  const [track, setTrack] = useState<"linkedin_led" | "substack_article">(
    "linkedin_led"
  );
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (formData) => {
        setPending(true);
        await createSeed(formData);
      }}
      className="space-y-6"
    >
      <input type="hidden" name="track" value={track} />

      <div className="space-y-2">
        <Label>Track</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["linkedin_led", "substack_article"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTrack(t)}
              className={`rounded-md border p-3 text-left text-sm transition-colors ${
                track === t
                  ? "border-navy bg-accent"
                  : "border-border hover:bg-muted"
              }`}
            >
              {TRACK_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          This decides which interview the seed opens.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="seed_text">Seed idea</Label>
        <Textarea
          id="seed_text"
          name="seed_text"
          required
          rows={5}
          placeholder="One line or a paragraph brain dump…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic_tags">Tags (optional, comma-separated)</Label>
        <Input
          id="topic_tags"
          name="topic_tags"
          placeholder="client question, AI release, product launch"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Start interview"}
      </Button>
    </form>
  );
}
