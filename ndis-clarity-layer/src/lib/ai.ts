import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface CaseNoteRawInput {
  participantPreferredName: string;
  occurredAt: Date;
  supportDelivered: string;
  participantResponse: string;
  risksIncidents?: string | null;
  medicationPrompted?: string | null;
  progressTowardGoals?: string | null;
  nextSteps?: string | null;
  goals: string[];
}

const STRUCTURE_SYSTEM = `You are an NDIS documentation assistant. You rewrite raw support-worker notes into a structured, professional, observable case note in the DAP format (Data, Assessment, Plan).
Rules:
- Use objective, observable language. No diagnosis, no speculation about feelings.
- Refer to the participant by their preferred name.
- Keep it concise: 120-220 words total.
- If a section has no input, write "Not reported" rather than inventing content.
- Output plain text with the headings: Data, Assessment, Plan. No markdown.`;

const REPORT_SYSTEM = `You are an NDIS report-writing assistant. You synthesise multiple approved case notes into a professional NDIS-aligned narrative for the chosen report type. Use observable, goal-aligned language. Structure with clear headings for each goal area, plus an overall summary, participation patterns, and barriers/risks. Do not invent facts. Refer only to what is supported by the notes provided.`;

/** Structures a raw case note. Returns DAP-style text. */
export async function structureCaseNote(input: CaseNoteRawInput): Promise<string> {
  const c = getClient();
  if (!c) return localStructure(input);

  const goalsLine = input.goals.length ? input.goals.join(", ") : "None linked";
  const userPrompt = `Participant preferred name: ${input.participantPreferredName}
Date/time: ${input.occurredAt.toISOString()}
Goals addressed: ${goalsLine}

Support delivered:
${input.supportDelivered}

Participant response (observable):
${input.participantResponse}

Risks / incidents:
${input.risksIncidents || "None reported"}

Medications (prompted/observed only):
${input.medicationPrompted || "None reported"}

Progress toward goals:
${input.progressTowardGoals || "Not reported"}

Next steps:
${input.nextSteps || "Not reported"}`;

  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: STRUCTURE_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return text || localStructure(input);
  } catch (err) {
    console.error("[ai] structureCaseNote failed, falling back", err);
    return localStructure(input);
  }
}

function localStructure(i: CaseNoteRawInput): string {
  const name = i.participantPreferredName;
  const goals = i.goals.length ? i.goals.join(", ") : "no specific goals linked for this shift";
  const data = `Data: Support was delivered to ${name} on ${i.occurredAt.toLocaleDateString()}. ${i.supportDelivered.trim()} ${name} was observed to ${i.participantResponse.trim()}`;
  const risks = i.risksIncidents?.trim()
    ? `Risk/incident note: ${i.risksIncidents.trim()}`
    : "No risks or incidents reported.";
  const meds = i.medicationPrompted?.trim()
    ? `Medication: ${i.medicationPrompted.trim()} (prompted/observed only).`
    : "No medication prompting reported.";
  const assessment = `Assessment: Activity related to ${goals}. ${i.progressTowardGoals?.trim() || "Progress toward goals not specifically reported this shift."} ${risks} ${meds}`;
  const plan = `Plan: ${i.nextSteps?.trim() || "Continue current support plan and monitor progress."}`;
  return [data, assessment, plan].join("\n\n");
}

export interface ReportNarrativeInput {
  participantName: string;
  preferredName: string;
  reportType: string;
  rangeStart: Date;
  rangeEnd: Date;
  goals: { title: string; tags: string[] }[];
  notes: {
    occurredAt: Date;
    structured: string;
    goalTitles: string[];
    risks?: string | null;
  }[];
  metrics: {
    totalNotes: number;
    notesPerGoal: Record<string, number>;
    incidents: number;
  };
}

export async function generateReportNarrative(
  input: ReportNarrativeInput,
): Promise<string> {
  const c = getClient();
  if (!c) return localNarrative(input);

  const userPrompt = buildReportPrompt(input);
  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: REPORT_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return text || localNarrative(input);
  } catch (err) {
    console.error("[ai] report narrative failed, falling back", err);
    return localNarrative(input);
  }
}

function buildReportPrompt(i: ReportNarrativeInput): string {
  const noteBlocks = i.notes
    .map(
      (n, idx) =>
        `--- Note ${idx + 1} (${n.occurredAt.toLocaleDateString()}, goals: ${
          n.goalTitles.join(", ") || "none"
        }) ---\n${n.structured}`,
    )
    .join("\n\n");
  return `Report type: ${i.reportType}
Participant: ${i.participantName} (preferred: ${i.preferredName})
Period: ${i.rangeStart.toDateString()} to ${i.rangeEnd.toDateString()}
Active goals:
${i.goals.map((g) => `- ${g.title}${g.tags.length ? ` [${g.tags.join(", ")}]` : ""}`).join("\n") || "(none documented)"}

Metrics:
- Approved notes in range: ${i.metrics.totalNotes}
- Incidents/risk events: ${i.metrics.incidents}
- Notes per goal: ${Object.entries(i.metrics.notesPerGoal)
    .map(([g, n]) => `${g}: ${n}`)
    .join("; ") || "n/a"}

Approved case notes (already structured):
${noteBlocks || "(no notes in this range)"}

Write a report-ready narrative for this period.`;
}

function localNarrative(i: ReportNarrativeInput): string {
  if (!i.notes.length) {
    return `Summary\nNo approved case notes are available for ${i.preferredName} between ${i.rangeStart.toDateString()} and ${i.rangeEnd.toDateString()}.`;
  }
  const lines: string[] = [];
  lines.push(`Summary`);
  lines.push(
    `This ${i.reportType.toLowerCase().replace(/_/g, " ")} covers ${i.preferredName} for the period ${i.rangeStart.toDateString()} to ${i.rangeEnd.toDateString()}. ${i.metrics.totalNotes} approved support shifts were recorded, with ${i.metrics.incidents} risk/incident note(s) logged.`,
  );
  lines.push("");
  lines.push(`Goal-aligned progress`);
  for (const g of i.goals) {
    const count = i.metrics.notesPerGoal[g.title] || 0;
    lines.push(`- ${g.title}: documented in ${count} shift(s).`);
  }
  lines.push("");
  lines.push(`Participation patterns`);
  lines.push(
    `${i.preferredName} engaged across ${i.metrics.totalNotes} sessions during this period. Detailed observations are available in the underlying approved case notes.`,
  );
  lines.push("");
  lines.push(`Barriers and risks`);
  lines.push(
    i.metrics.incidents
      ? `${i.metrics.incidents} incident/risk event(s) were documented and should be reviewed by the team lead.`
      : `No incidents or significant risk events were documented in this period.`,
  );
  return lines.join("\n");
}
