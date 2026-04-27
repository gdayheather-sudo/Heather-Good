import Link from "next/link";
import { notFound } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { decryptParticipant } from "@/lib/participants";
import ProfileTabs from "./ProfileTabs";

export const dynamic = "force-dynamic";

export default async function ParticipantDetail({
  params,
}: {
  params: { id: string };
}) {
  const session = (await readSession())!;
  const p = await prisma.participant.findFirst({
    where: { id: params.id, organisationId: session.organisationId },
    include: {
      goals: { orderBy: { createdAt: "asc" } },
      caseNotes: {
        orderBy: { occurredAt: "desc" },
        take: 5,
        include: { author: { select: { fullName: true } } },
      },
    },
  });
  if (!p) notFound();

  const fullVisible = can.viewParticipantFull(session);
  const decrypted = fullVisible ? decryptParticipant(p) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {p.preferredName || p.fullName}
          </h1>
          {p.preferredName && (
            <div className="text-sm text-ink-500">{p.fullName}</div>
          )}
        </div>
        <div className="flex gap-2">
          {can.createCaseNote(session) && (
            <Link
              href={`/case-notes/new?participantId=${p.id}`}
              className="btn-primary"
            >
              New case note
            </Link>
          )}
          {can.editParticipant(session) && (
            <Link href={`/participants/${p.id}/edit`} className="btn-outline">
              Edit profile
            </Link>
          )}
        </div>
      </div>

      <ProfileTabs
        fullAvailable={fullVisible}
        quick={{
          dateOfBirth: p.dateOfBirth?.toISOString() ?? null,
          goals: p.goals
            .filter((g) => g.isActive)
            .map((g) => ({ id: g.id, title: g.title, tags: g.tags })),
          communicationPreferences:
            decrypted?.supportContext.communicationPreferences || "",
          knownRisks: decrypted?.riskSafety.knownRisks || "",
        }}
        full={
          decrypted
            ? {
                dateOfBirth: p.dateOfBirth?.toISOString() ?? null,
                goals: p.goals.map((g) => ({
                  id: g.id,
                  title: g.title,
                  description: g.description,
                  tags: g.tags,
                  isActive: g.isActive,
                })),
                supportContext: decrypted.supportContext,
                riskSafety: decrypted.riskSafety,
                contacts: decrypted.contacts,
                medications: decrypted.medications,
                shareWithFamily: p.shareWithFamily,
                shareWithCoordinator: p.shareWithCoordinator,
                consentNotes: p.consentNotes || "",
              }
            : null
        }
      />

      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent case notes</h2>
          <Link
            href={`/case-notes?participantId=${p.id}`}
            className="text-sm text-brand-700 hover:underline"
          >
            View all
          </Link>
        </div>
        {p.caseNotes.length === 0 ? (
          <p className="text-sm text-ink-500">No case notes yet.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {p.caseNotes.map((n) => (
              <li
                key={n.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <Link href={`/case-notes/${n.id}`} className="hover:text-brand-700">
                  <div className="font-medium text-sm">
                    {new Date(n.occurredAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-ink-500">
                    {n.author.fullName}
                  </div>
                </Link>
                <span
                  className={n.status === "APPROVED" ? "tag" : "tag-warn"}
                >
                  {n.status === "APPROVED" ? "Approved" : "Draft"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
