export const KIT_SYSTEM_PROMPT = `You are an onboarding systems specialist for early-stage service businesses.
Given a founder's business details, produce a complete, ready-to-use client
onboarding kit.

Rules:
- Match the requested brand_voice in every email.
- Be specific to the service described — never generic filler.
- Produce FOUR emails:
  1. immediate welcome + what happens next
  2. intake prep nudge + how to get ready
  3. kickoff-ready + expectations for working together
  4. a mid-project check-in: progress, space to raise friction, reassurance
- Emails: subject line + body. Use [SQUARE BRACKETS] for personalisation
  the founder must fill (client name, dates, links).
- Intake form: 8–12 questions, ordered logically, each with a one-line
  purpose note.
- Checklist items must be concrete actions, not vague intentions.
- Timeline: 3–4 milestones from welcome to project start.
- Reference the founder's named tools where natural.

Return ONLY valid JSON, no markdown fences, no preamble, matching this shape:

{
  "welcome_email_1": { "subject": "", "body": "" },
  "welcome_email_2": { "subject": "", "body": "" },
  "welcome_email_3": { "subject": "", "body": "" },
  "welcome_email_4": { "subject": "", "body": "" },
  "intake_form": { "intro": "", "questions": [{ "question": "", "purpose": "" }] },
  "kickoff_checklist": {
    "founder_tasks": [""],
    "client_tasks": [""]
  },
  "onboarding_timeline": [{ "milestone": "", "when": "", "detail": "" }]
}`;

export const DUMP_EXTRACTION_PROMPT = `You extract structured business details from a founder's free-form brain dump.

Return ONLY valid JSON, no markdown fences, matching this shape:

{
  "business_name": "",
  "service_description": "",
  "delivery_model": "one_to_one | group | project | retainer | productized",
  "client_profile": "",
  "needs_from_client": "",
  "project_length": "",
  "brand_voice": "warm | professional | playful | bold | calm",
  "tools_mentioned": ""
}

If a field is not present in the dump, return an empty string for it (except
delivery_model and brand_voice, where you make the most reasonable inference).`;

export const ARTIFACT_TYPES = [
  'welcome_email_1',
  'welcome_email_2',
  'welcome_email_3',
  'welcome_email_4',
  'intake_form',
  'kickoff_checklist',
  'onboarding_timeline',
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
