import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { name: true },
  });
  return (
    <div className="min-h-screen flex">
      <Sidebar role={session.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          fullName={session.fullName}
          role={session.role}
          organisationName={org?.name ?? ""}
        />
        <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
