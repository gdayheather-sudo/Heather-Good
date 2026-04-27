import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import NewCaseNote from "./NewCaseNote";

export const dynamic = "force-dynamic";

export default async function NewCaseNotePage({
  searchParams,
}: {
  searchParams: { participantId?: string };
}) {
  const session = (await readSession())!;
  if (!can.createCaseNote(session)) redirect("/case-notes");

  const participants = await prisma.participant.findMany({
    where: { organisationId: session.organisationId },
    orderBy: { fullName: "asc" },
    include: { goals: { where: { isActive: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New case note</h1>
        <p className="text-ink-500 text-sm">
          Capture what happened in plain words. Use Structure note to convert
          it to professional, observable language. Nothing is saved until you
          approve and save.
        </p>
      </div>
      <NewCaseNote
        participants={participants.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          preferredName: p.preferredName,
          goals: p.goals.map((g) => ({
            id: g.id,
            title: g.title,
            tags: g.tags,
          })),
        }))}
        defaultParticipantId={searchParams.participantId}
      />
    </div>
  );
}
