import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import BrandingForm from "./BrandingForm";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const session = (await readSession())!;
  if (!can.manageBranding(session)) redirect("/dashboard");
  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
  });
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Branding</h1>
        <p className="text-ink-500 text-sm">
          These details appear on every report header, footer, and shared link.
        </p>
      </div>
      <BrandingForm
        initial={{
          name: org?.name || "",
          legalName: org?.legalName || "",
          abn: org?.abn || "",
          address: org?.address || "",
          contactEmail: org?.contactEmail || "",
          contactPhone: org?.contactPhone || "",
          primaryColor: org?.primaryColor || "#2c8a6f",
          logoUrl: org?.logoUrl || "",
          letterheadHtml: org?.letterheadHtml || "",
        }}
      />
    </div>
  );
}
