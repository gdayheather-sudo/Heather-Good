"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateDraft } from "@/lib/actions";
import type { InterviewMessage, InterviewStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function InterviewChat({
  contentUnitId,
  initialMessages,
  status,
}: {
  contentUnitId: string;
  initialMessages: InterviewMessage[];
  status: InterviewStatus;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<InterviewMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [drafting, setDrafting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const kicked = useRef(false);

  // Kick off the opening question if the only turn so far is the seed.
  useEffect(() => {
    if (
      !kicked.current &&
      messages.length === 1 &&
      messages[0].role === "user"
    ) {
      kicked.current = true;
      void send(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, streaming]);

  async function send(text: string | undefined) {
    setBusy(true);
    setStreaming("");
    if (text) {
      setMessages((m) => [
        ...m,
        { role: "user", content: text, timestamp: new Date().toISOString() },
      ]);
    }

    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentUnitId, message: text ?? "" }),
    });

    if (!res.ok || !res.body) {
      setBusy(false);
      setStreaming("");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      setStreaming(acc);
    }

    setMessages((m) => [
      ...m,
      { role: "assistant", content: acc, timestamp: new Date().toISOString() },
    ]);
    setStreaming("");
    setBusy(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void send(text);
  }

  async function onGenerateDraft() {
    setDrafting(true);
    try {
      await generateDraft(contentUnitId);
      router.refresh();
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div
        ref={scrollRef}
        className="max-h-[420px] space-y-3 overflow-y-auto pr-1"
      >
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        {streaming && <Bubble role="assistant" content={streaming} />}
        {busy && !streaming && (
          <p className="text-sm text-muted-foreground">Thinking…</p>
        )}
      </div>

      {status !== "complete" && (
        <form onSubmit={onSubmit} className="mt-4 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer…"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit(e);
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              ⌘/Ctrl + Enter to send
            </span>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" disabled={busy}>
                Send
              </Button>
              <Button
                type="button"
                onClick={onGenerateDraft}
                disabled={busy || drafting || messages.length < 2}
              >
                {drafting ? "Drafting…" : "Generate draft"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {status === "complete" && (
        <Button
          type="button"
          onClick={onGenerateDraft}
          disabled={drafting}
          variant="outline"
          className="mt-4 self-start"
        >
          {drafting ? "Re-drafting…" : "Regenerate draft"}
        </Button>
      )}
    </div>
  );
}

function Bubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
