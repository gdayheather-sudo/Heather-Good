import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError, ok } from "@/lib/api";
import { structureCaseNote } from "@/lib/ai";

const Body = z.object({
  participantId: z.string().min(1),
  occurredAt: z.string().optional(),
  goalIds: z.array(z.string()).optional().default([]),
  supportDelivered: z.string().min(1),
  participantResponse: z.string().min(1),
  risksIncidents: z.string().optional(),
  medicationPrompted: z.string().optional(),
  progressTowardGoals: z.string().optional(),
  nextSteps: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!can.createCaseNote(user)) return fail(403, "Forbidden");
    const data = Body.parse(await req.json());

    const participant = await prisma.participant.findFirst({
      where: { id: data.participantId, organisationId: user.organisationId },
      include: { goals: true },
    });
    if (!participant) return fail(404, "Participant not found");

    const goalTitles = participant.goals
      .filter((g) => data.goalIds.includes(g.id))
      .map((g) => g.title);

    const structured = await structureCaseNote({
      participantPreferredName: participant.preferredName || participant.fullName,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
      supportDelivered: data.supportDelivered,
      participantResponse: data.participantResponse,
      risksIncidents: data.risksIncidents,
      medicationPrompted: data.medicationPrompted,
      progressTowardGoals: data.progressTowardGoals,
      nextSteps: data.nextSteps,
      goals: goalTitles,
    });

    return ok({ structured });
  } catch (e) {
    return handleError(e);
  }
}
