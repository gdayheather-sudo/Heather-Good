import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import ParticipantForm from "../ParticipantForm";

export default async function NewParticipant() {
  const session = (await readSession())!;
  if (!can.editParticipant(session)) redirect("/participants");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New participant</h1>
        <p className="text-ink-500 text-sm">
          The fields below shape every case note and report for this participant.
        </p>
      </div>
      <ParticipantForm mode="create" />
    </div>
  );
}
