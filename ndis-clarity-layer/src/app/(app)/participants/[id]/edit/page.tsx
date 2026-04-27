import { notFound, redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { decryptParticipant } from "@/lib/participants";
import ParticipantForm from "../../ParticipantForm";

export const dynamic = "force-dynamic";

export default async function EditParticipant({
  params,
}: {
  params: { id: string };
}) {
  const session = (await readSession())!;
  if (!can.editParticipant(session)) redirect(`/participants/${params.id}`);

  const p = await prisma.participant.findFirst({
    where: { id: params.id, organisationId: session.organisationId },
    include: { goals: true },
  });
  if (!p) notFound();

  const dec = decryptParticipant(p);
  const initial = {
    fullName: p.fullName,
    preferredName: p.preferredName ?? "",
    dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString().slice(0, 10) : "",
    goals: p.goals.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description ?? "",
      tags: g.tags,
      isActive: g.isActive,
    })),
    supportContext: dec.supportContext,
    riskSafety: dec.riskSafety,
    contacts: dec.contacts,
    medications: dec.medications,
    shareWithFamily: p.shareWithFamily,
    shareWithCoordinator: p.shareWithCoordinator,
    consentNotes: p.consentNotes ?? "",
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit participant</h1>
      </div>
      <ParticipantForm
        mode="edit"
        participantId={p.id}
        initial={initial}
      />
    </div>
  );
}
