import "server-only";
import { getServiceClient } from "@/lib/supabase/server";
import { getResponses } from "@/lib/sessions";
import { questions } from "@/lib/questions";
import { generateDocument } from "@/lib/anthropic";
import {
  CLIENT_SUMMARY_SYSTEM_PROMPT,
  INTERNAL_PREP_SYSTEM_PROMPT,
} from "@/lib/prompts";
import { sendClientSummary, sendInternalPrep } from "@/lib/email";
import type { IntakeSession } from "@/lib/types";

interface PayloadResponse {
  question_id: string;
  question_label: string;
  answer: string;
  input_method: string;
}

function formatCallDate(auditDate: string | null): string {
  if (!auditDate) return "TBC";
  try {
    return new Intl.DateTimeFormat("en-AU", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Australia/Brisbane",
    }).format(new Date(auditDate));
  } catch {
    return "TBC";
  }
}

// Runs the full post-submission pipeline. Idempotent enough for retries:
// regenerates docs and re-sends email. Throws on failure so the caller can
// mark the session 'failed'.
export async function processSession(session: IntakeSession): Promise<void> {
  const supabase = getServiceClient();

  const responses = await getResponses(session.id);
  const byId = new Map(responses.map((r) => [r.question_id, r]));

  const payloadResponses: PayloadResponse[] = questions.map((q) => {
    const r = byId.get(q.id);
    return {
      question_id: q.id,
      question_label: q.label,
      answer: r?.transcript?.trim() || "(no answer provided)",
      input_method: r?.input_method || "text",
    };
  });

  const payload = JSON.stringify(
    {
      client_name: session.client_name || "there",
      submitted_at: session.submitted_at || new Date().toISOString(),
      responses: payloadResponses,
    },
    null,
    2
  );

  const [clientSummary, internalPrep] = await Promise.all([
    generateDocument({
      systemPrompt: CLIENT_SUMMARY_SYSTEM_PROMPT,
      userPayload: payload,
      maxTokens: 2000,
    }),
    generateDocument({
      systemPrompt: INTERNAL_PREP_SYSTEM_PROMPT,
      userPayload: payload,
      maxTokens: 3000,
    }),
  ]);

  // Persist both documents (upsert-like: clear prior docs for this session).
  await supabase.from("audit_documents").delete().eq("session_id", session.id);
  const { error: docErr } = await supabase.from("audit_documents").insert([
    {
      session_id: session.id,
      doc_type: "client_summary",
      content_markdown: clientSummary,
    },
    {
      session_id: session.id,
      doc_type: "internal_prep",
      content_markdown: internalPrep,
    },
  ]);
  if (docErr) throw new Error(`Failed to save documents: ${docErr.message}`);

  const callDate = formatCallDate(session.audit_date);

  // Send emails. Heather's brief always sends; client only if we have their email.
  const emailJobs: Promise<unknown>[] = [
    sendInternalPrep({
      clientName: session.client_name || "Client",
      callDate,
      prepMarkdown: internalPrep,
      clientSummaryMarkdown: clientSummary,
    }),
  ];

  if (session.client_email) {
    emailJobs.push(
      sendClientSummary({
        to: session.client_email,
        clientName: session.client_name || "there",
        summaryMarkdown: clientSummary,
      })
    );
  }

  await Promise.all(emailJobs);

  await supabase
    .from("intake_sessions")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("id", session.id);
}
