import { z } from "zod";
import { Participant, Prisma } from "@prisma/client";
import { decryptJson, encryptJson } from "./crypto";

export const ContactSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  isEmergency: z.boolean().optional().default(false),
  isNominee: z.boolean().optional().default(false),
});

export const MedicationSchema = z.object({
  name: z.string().min(1),
  notes: z.string().optional().default(""),
});

export const SupportContextSchema = z.object({
  communicationPreferences: z.string().optional().default(""),
  routinesAndPreferences: z.string().optional().default(""),
  keySupportStrategies: z.string().optional().default(""),
});

export const RiskSafetySchema = z.object({
  knownRisks: z.string().optional().default(""),
  behaviouralSupportNotes: z.string().optional().default(""),
});

export const ParticipantInputSchema = z.object({
  fullName: z.string().min(1),
  preferredName: z.string().optional().default(""),
  dateOfBirth: z.string().optional().nullable(),
  goals: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1),
        description: z.string().optional().default(""),
        tags: z.array(z.string()).optional().default([]),
        isActive: z.boolean().optional().default(true),
      }),
    )
    .optional()
    .default([]),
  supportContext: SupportContextSchema.optional(),
  riskSafety: RiskSafetySchema.optional(),
  contacts: z.array(ContactSchema).optional().default([]),
  medications: z.array(MedicationSchema).optional().default([]),
  shareWithFamily: z.boolean().optional().default(false),
  shareWithCoordinator: z.boolean().optional().default(false),
  consentNotes: z.string().optional().default(""),
});

export type ParticipantInput = z.infer<typeof ParticipantInputSchema>;

export interface DecryptedParticipant {
  supportContext: z.infer<typeof SupportContextSchema>;
  riskSafety: z.infer<typeof RiskSafetySchema>;
  contacts: z.infer<typeof ContactSchema>[];
  medications: z.infer<typeof MedicationSchema>[];
}

export function decryptParticipant(p: Participant): DecryptedParticipant {
  return {
    supportContext:
      decryptJson<z.infer<typeof SupportContextSchema>>(p.supportContextEnc) ?? {
        communicationPreferences: "",
        routinesAndPreferences: "",
        keySupportStrategies: "",
      },
    riskSafety:
      decryptJson<z.infer<typeof RiskSafetySchema>>(p.riskSafetyEnc) ?? {
        knownRisks: "",
        behaviouralSupportNotes: "",
      },
    contacts: decryptJson<z.infer<typeof ContactSchema>[]>(p.contactsEnc) ?? [],
    medications:
      decryptJson<z.infer<typeof MedicationSchema>[]>(p.medicationsEnc) ?? [],
  };
}

export function buildEncryptedFields(input: ParticipantInput): Prisma.ParticipantUpdateInput {
  return {
    supportContextEnc: input.supportContext
      ? encryptJson(input.supportContext)
      : null,
    riskSafetyEnc: input.riskSafety ? encryptJson(input.riskSafety) : null,
    contactsEnc: input.contacts && input.contacts.length
      ? encryptJson(input.contacts)
      : null,
    medicationsEnc: input.medications && input.medications.length
      ? encryptJson(input.medications)
      : null,
  };
}
