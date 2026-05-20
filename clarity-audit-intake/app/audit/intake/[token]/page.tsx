import { notFound } from "next/navigation";
import { getSessionByToken, getResponses } from "@/lib/sessions";
import { IntakeForm, type InitialAnswer } from "./IntakeForm";
import { WaveDots } from "@/components/WaveDots";

export const dynamic = "force-dynamic";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getSessionByToken(token);

  if (!session) {
    notFound();
  }

  if (session.status === "submitted" || session.status === "processed") {
    return <AlreadySubmitted firstName={session.client_name?.split(" ")[0]} />;
  }

  const responses = await getResponses(session.id);
  const initialAnswers: Record<string, InitialAnswer> = {};
  for (const r of responses) {
    initialAnswers[r.question_id] = {
      input_method: r.input_method,
      transcript: r.transcript ?? "",
      raw_audio_url: r.raw_audio_url,
    };
  }

  return (
    <IntakeForm
      token={token}
      clientName={session.client_name}
      initialAnswers={initialAnswers}
    />
  );
}

function AlreadySubmitted({ firstName }: { firstName?: string }) {
  return (
    <main className="content-z mx-auto flex min-h-screen max-w-prose flex-col items-center justify-center px-6 py-20 text-center">
      <div className="relative w-full max-w-md">
        <WaveDots className="absolute -top-24 left-1/2 w-40 -translate-x-1/2 opacity-60" />
      </div>
      <p className="font-display text-sm uppercase tracking-[0.18em] text-clay">
        The Clarity Hub
      </p>
      <h1 className="font-display mt-4 text-4xl leading-tight text-charcoal sm:text-5xl">
        All done{firstName ? `, ${firstName}` : ""}.
      </h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-charcoal">
        You&rsquo;ve already submitted this intake. Heather will be in touch with
        your pre-audit summary. If you need to change something, just reply to
        her email.
      </p>
    </main>
  );
}
