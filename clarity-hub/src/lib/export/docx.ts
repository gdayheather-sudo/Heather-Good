import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from 'docx';
import { BRAND } from '@/lib/brand';
import type { ArtifactType } from '@/lib/prompts';

type ArtifactRow = { artifact_type: ArtifactType; content: Record<string, unknown> };

const LABELS: Record<ArtifactType, string> = {
  welcome_email_1: 'Email 1 — Immediate welcome',
  welcome_email_2: 'Email 2 — Intake prep nudge',
  welcome_email_3: 'Email 3 — Kickoff-ready',
  welcome_email_4: 'Email 4 — Mid-project check-in',
  intake_form: 'Intake form',
  kickoff_checklist: 'Kickoff checklist',
  onboarding_timeline: 'Onboarding timeline',
};

export async function buildKitDocx(kitName: string, artifacts: ArtifactRow[]): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Clarity Hub', color: BRAND.colors.sage.replace('#', ''), bold: true })],
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: kitName, color: BRAND.colors.navy.replace('#', '') })],
    }),
    new Paragraph({ text: '' }),
  );

  for (const a of artifacts) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({ text: LABELS[a.artifact_type], color: BRAND.colors.navy.replace('#', '') }),
        ],
      })
    );
    children.push(...renderArtifact(a));
    children.push(new Paragraph({ text: '' }));
  }

  const doc = new Document({
    creator: 'Clarity Hub',
    title: kitName,
    styles: {
      default: {
        document: { run: { font: BRAND.fonts.sans, size: 22 } },
      },
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

function renderArtifact(a: ArtifactRow): Paragraph[] {
  const out: Paragraph[] = [];
  const c = a.content as any;

  if (a.artifact_type.startsWith('welcome_email_')) {
    out.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Subject: ', bold: true }),
          new TextRun({ text: String(c.subject ?? '') }),
        ],
      })
    );
    for (const line of String(c.body ?? '').split('\n')) {
      out.push(new Paragraph({ text: line }));
    }
    return out;
  }

  if (a.artifact_type === 'intake_form') {
    if (c.intro) out.push(new Paragraph({ text: String(c.intro) }));
    const qs = (c.questions ?? []) as Array<{ question: string; purpose: string }>;
    qs.forEach((q, i) => {
      out.push(
        new Paragraph({
          children: [new TextRun({ text: `${i + 1}. ${q.question}`, bold: true })],
        })
      );
      out.push(
        new Paragraph({
          children: [new TextRun({ text: q.purpose, italics: true, color: '777777' })],
        })
      );
    });
    return out;
  }

  if (a.artifact_type === 'kickoff_checklist') {
    out.push(new Paragraph({ children: [new TextRun({ text: 'Your tasks', bold: true })] }));
    ((c.founder_tasks ?? []) as string[]).forEach((t) =>
      out.push(new Paragraph({ text: `• ${t}` })),
    );
    out.push(new Paragraph({ text: '' }));
    out.push(new Paragraph({ children: [new TextRun({ text: 'Client tasks', bold: true })] }));
    ((c.client_tasks ?? []) as string[]).forEach((t) =>
      out.push(new Paragraph({ text: `• ${t}` })),
    );
    return out;
  }

  if (a.artifact_type === 'onboarding_timeline') {
    const list = (Array.isArray(c) ? c : c.timeline ?? []) as Array<{
      milestone: string; when: string; detail: string;
    }>;
    list.forEach((m) => {
      out.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${m.when} — `, bold: true, color: BRAND.colors.clay.replace('#', '') }),
            new TextRun({ text: m.milestone, bold: true }),
          ],
        })
      );
      out.push(new Paragraph({ text: m.detail }));
    });
    return out;
  }

  return out;
}
