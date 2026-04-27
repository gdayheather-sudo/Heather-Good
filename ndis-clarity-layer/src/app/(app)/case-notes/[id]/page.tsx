import { notFound } from "next/navigation";
import { CaseNoteStatus } from "@prisma/client";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import CaseNoteReview from "./CaseNoteReview";

export const dynamic = "force-dynamic";

export default async function CaseNoteDetail({
  params,
}: {
  params: { id: string };
}) {
  const session = (await readSession())!;
  const note = await prisma.caseNote.findFirst({
    where: { id: params.id, organisationId: session.organisationId },
    include: {
      participant: {
        include: { goals: true },
      },
      author: { select: { fullName: true } },
      approver: { select: { fullName: true } },
      goals: { include: { goal: true } },
      versions: {
        orderBy: { createdAt: "desc" },
        include: { editedBy: { select: { fullName: true } } },
      },
    },
  });
  if (!note) notFound();

  return (
    <CaseNoteReview
      session={{ role: session.role, name: session.fullName }}
      canApprove={can.approveCaseNote(session)}
      canEdit={
        can.createCaseNote(session) && note.status === CaseNoteStatus.DRAFT
      }
      note={{
        id: note.id,
        status: note.status,
        occurredAt: note.occurredAt.toISOString(),
        createdAt: note.createdAt.toISOString(),
        approvedAt: note.approvedAt?.toISOString() ?? null,
        author: note.author.fullName,
        approver: note.approver?.fullName ?? null,
        participant: {
          id: note.participantId,
          name: note.participant.preferredName || note.participant.fullName,
          goals: note.participant.goals.map((g) => ({
            id: g.id,
            title: g.title,
            isActive: g.isActive,
          })),
        },
        goalIds: note.goals.map((g) => g.goalId),
        goalTitles: note.goals.map((g) => g.goal.title),
        supportDelivered: note.supportDelivered,
        participantResponse: note.participantResponse,
        risksIncidents: note.risksIncidents ?? "",
        medicationPrompted: note.medicationPrompted ?? "",
        progressTowardGoals: note.progressTowardGoals ?? "",
        nextSteps: note.nextSteps ?? "",
        structuredOutput: note.structuredOutput ?? "",
        versions: note.versions.map((v) => ({
          id: v.id,
          editedBy: v.editedBy.fullName,
          createdAt: v.createdAt.toISOString(),
        })),
      }}
    />
  );
}
