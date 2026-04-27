import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import NewReport from "./NewReport";

export const dynamic = "force-dynamic";

export default async function NewReportPage() {
  const session = (await readSession())!;
  if (!can.generateReport(session)) redirect("/dashboard");
  const participants = await prisma.participant.findMany({
    where: { organisationId: session.organisationId },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, preferredName: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Generate a report</h1>
        <p className="text-ink-500 text-sm">
          We'll aggregate approved case notes for the period into a structured
          NDIS-ready narrative, then produce PDF and Word outputs.
        </p>
      </div>
      <NewReport participants={participants} />
    </div>
  );
}
