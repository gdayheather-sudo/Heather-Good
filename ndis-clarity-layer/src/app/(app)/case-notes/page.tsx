import Link from "next/link";
import { CaseNoteStatus } from "@prisma/client";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function CaseNotesPage({
  searchParams,
}: {
  searchParams: { participantId?: string; status?: string };
}) {
  const session = (await readSession())!;
  const status =
    searchParams.status === "DRAFT"
      ? CaseNoteStatus.DRAFT
      : searchParams.status === "APPROVED"
        ? CaseNoteStatus.APPROVED
        : undefined;

  const notes = await prisma.caseNote.findMany({
    where: {
      organisationId: session.organisationId,
      ...(searchParams.participantId
        ? { participantId: searchParams.participantId }
        : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { occurredAt: "desc" },
    take: 200,
    include: {
      participant: { select: { preferredName: true, fullName: true } },
      author: { select: { fullName: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Case notes</h1>
          <p className="text-ink-500 text-sm">
            Structured shifts. Draft until a team lead approves.
          </p>
        </div>
        {can.createCaseNote(session) && (
          <Link href="/case-notes/new" className="btn-primary">
            New case note
          </Link>
        )}
      </div>

      <div className="flex gap-2 text-sm">
        <FilterLink active={!status} href="/case-notes">
          All
        </FilterLink>
        <FilterLink
          active={status === CaseNoteStatus.DRAFT}
          href="/case-notes?status=DRAFT"
        >
          Drafts
        </FilterLink>
        <FilterLink
          active={status === CaseNoteStatus.APPROVED}
          href="/case-notes?status=APPROVED"
        >
          Approved
        </FilterLink>
      </div>

      <div className="card divide-y divide-ink-100">
        {notes.length === 0 && (
          <div className="p-8 text-center text-ink-500 text-sm">
            No case notes match.
          </div>
        )}
        {notes.map((n) => (
          <Link
            key={n.id}
            href={`/case-notes/${n.id}`}
            className="block p-4 hover:bg-ink-50"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">
                  {n.participant.preferredName || n.participant.fullName}
                </div>
                <div className="text-xs text-ink-500 mt-0.5">
                  {new Date(n.occurredAt).toLocaleString()} ·{" "}
                  {n.author.fullName}
                </div>
              </div>
              <span
                className={n.status === "APPROVED" ? "tag" : "tag-warn"}
              >
                {n.status === "APPROVED" ? "Approved" : "Draft"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function FilterLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "tag"
          : "tag-muted hover:bg-ink-200"
      }
    >
      {children}
    </Link>
  );
}
