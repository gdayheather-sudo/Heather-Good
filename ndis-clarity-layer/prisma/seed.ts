import { PrismaClient, Role, CaseNoteStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

// Lightweight demo data — run with `npm run db:seed`
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("demo-password-12", 12);

  const org = await prisma.organisation.upsert({
    where: { id: "demo-org" },
    update: {},
    create: {
      id: "demo-org",
      name: "Sunrise Supports",
      legalName: "Sunrise Supports Pty Ltd",
      abn: "12 345 678 901",
      address: "1 Demo Street, Brisbane QLD",
      contactEmail: "hello@sunrise.example",
      contactPhone: "07 0000 0000",
      primaryColor: "#2c8a6f",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      organisationId: org.id,
      email: "admin@example.com",
      fullName: "Alex Admin",
      role: Role.ADMIN,
      passwordHash: password,
    },
  });
  const lead = await prisma.user.upsert({
    where: { email: "lead@example.com" },
    update: {},
    create: {
      organisationId: org.id,
      email: "lead@example.com",
      fullName: "Lee Lead",
      role: Role.TEAM_LEAD,
      passwordHash: password,
    },
  });
  const worker = await prisma.user.upsert({
    where: { email: "worker@example.com" },
    update: {},
    create: {
      organisationId: org.id,
      email: "worker@example.com",
      fullName: "Sam Support",
      role: Role.SUPPORT_WORKER,
      passwordHash: password,
    },
  });

  const participant = await prisma.participant.upsert({
    where: { id: "demo-participant" },
    update: {},
    create: {
      id: "demo-participant",
      organisationId: org.id,
      fullName: "Jordan Taylor",
      preferredName: "Jordan",
      shareWithFamily: true,
      shareWithCoordinator: true,
    },
  });

  await prisma.participantGoal.deleteMany({
    where: { participantId: participant.id },
  });
  const [g1, g2] = await Promise.all([
    prisma.participantGoal.create({
      data: {
        participantId: participant.id,
        title: "Build community participation",
        tags: ["community", "social"],
      },
    }),
    prisma.participantGoal.create({
      data: {
        participantId: participant.id,
        title: "Increase independence in daily living",
        tags: ["independence", "self-care"],
      },
    }),
  ]);

  // A couple of approved notes so reports have content
  await prisma.caseNote.create({
    data: {
      organisationId: org.id,
      participantId: participant.id,
      authorId: worker.id,
      approverId: lead.id,
      status: CaseNoteStatus.APPROVED,
      approvedAt: new Date(),
      occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
      supportDelivered:
        "Met Jordan at home and supported a community access shift to the local library.",
      participantResponse:
        "Jordan greeted library staff, selected two books and used self-checkout independently.",
      progressTowardGoals:
        "Initiated greeting unprompted; managed self-checkout for the first time.",
      nextSteps: "Plan a return visit to attend the weekly book club.",
      structuredOutput:
        "Data: Jordan was supported on a community access shift to the local library. Jordan was observed greeting library staff and using self-checkout to borrow two books.\n\nAssessment: Activity related to building community participation and increasing independence. Jordan initiated a greeting without prompting and managed self-checkout independently for the first time.\n\nPlan: Plan a return visit to attend the weekly book club to extend social engagement.",
      goals: { create: [{ goalId: g1.id }, { goalId: g2.id }] },
    },
  });

  await prisma.caseNote.create({
    data: {
      organisationId: org.id,
      participantId: participant.id,
      authorId: worker.id,
      approverId: lead.id,
      status: CaseNoteStatus.APPROVED,
      approvedAt: new Date(),
      occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      supportDelivered:
        "Supported Jordan with meal preparation: dicing vegetables and using the stovetop with prompts.",
      participantResponse:
        "Jordan completed each step with verbal prompts and rated the meal a 4/5.",
      progressTowardGoals:
        "Reduced prompting required for stovetop safety checks.",
      nextSteps: "Trial preparing a similar meal with reduced prompting next week.",
      structuredOutput:
        "Data: Jordan was supported with a meal preparation activity, including dicing vegetables and using the stovetop. Jordan completed each step with verbal prompts and self-rated the meal 4/5.\n\nAssessment: Activity related to increasing independence in daily living. Reduced verbal prompting was required to maintain stovetop safety checks compared with previous shifts.\n\nPlan: Trial preparing a similar meal next week with further reduced prompting.",
      goals: { create: [{ goalId: g2.id }] },
    },
  });

  console.log("Seeded:");
  console.log("  Admin:   admin@example.com / demo-password-12");
  console.log("  Lead:    lead@example.com / demo-password-12");
  console.log("  Worker:  worker@example.com / demo-password-12");
  console.log(`  Org id:  ${org.id}`);
  console.log(`  Participant: ${participant.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
