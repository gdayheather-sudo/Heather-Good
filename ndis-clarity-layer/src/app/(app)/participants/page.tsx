import Link from "next/link";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ParticipantsList() {
  const session = (await readSession())!;
  const participants = await prisma.participant.findMany({
    where: { organisationId: session.organisationId },
    orderBy: { fullName: "asc" },
    include: { goals: { where: { isActive: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Participants</h1>
          <p className="text-ink-500 text-sm">
            Profiles provide the context that shapes case notes and reports.
          </p>
        </div>
        {can.editParticipant(session) && (
          <Link href="/participants/new" className="btn-primary">
            New participant
          </Link>
        )}
      </div>

      <div className="card divide-y divide-ink-100">
        {participants.length === 0 && (
          <div className="p-8 text-center text-ink-500 text-sm">
            No participants yet.
          </div>
        )}
        {participants.map((p) => (
          <Link
            key={p.id}
            href={`/participants/${p.id}`}
            className="block p-4 hover:bg-ink-50"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">
                  {p.preferredName || p.fullName}
                  {p.preferredName && (
                    <span className="text-ink-400 text-sm ml-2">
                      ({p.fullName})
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">
                  {p.goals.length} active goal{p.goals.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 max-w-md justify-end">
                {p.goals.slice(0, 3).map((g) => (
                  <span key={g.id} className="tag">
                    {g.title}
                  </span>
                ))}
                {p.goals.length > 3 && (
                  <span className="tag-muted">+{p.goals.length - 3}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
