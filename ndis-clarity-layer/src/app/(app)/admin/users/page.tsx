import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, ROLE_LABEL } from "@/lib/rbac";
import UsersAdmin from "./UsersAdmin";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = (await readSession())!;
  if (!can.manageUsers(session)) redirect("/dashboard");
  const users = await prisma.user.findMany({
    where: { organisationId: session.organisationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
  });
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team members</h1>
        <p className="text-ink-500 text-sm">
          Invite team leads, support workers, and external viewers.
        </p>
      </div>
      <UsersAdmin
        initial={users.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          roleLabel: ROLE_LABEL[u.role],
        }))}
        currentUserId={session.id}
      />
    </div>
  );
}
