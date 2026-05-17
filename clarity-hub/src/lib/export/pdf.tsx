import * as React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
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

const styles = StyleSheet.create({
  page: {
    padding: 48,
    backgroundColor: BRAND.colors.warm,
    color: BRAND.colors.charcoal,
    fontSize: 11,
    lineHeight: 1.5,
  },
  brand: { fontSize: 9, color: BRAND.colors.sage, letterSpacing: 2, marginBottom: 6 },
  title: { fontSize: 24, color: BRAND.colors.navy, marginBottom: 24 },
  section: { marginBottom: 18 },
  h1: { fontSize: 16, color: BRAND.colors.navy, marginBottom: 8 },
  label: { fontSize: 9, color: BRAND.colors.sage, letterSpacing: 1, marginTop: 4 },
  bold: { fontWeight: 700 },
  clay: { color: BRAND.colors.clay },
  bullet: { marginLeft: 8, marginBottom: 2 },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BRAND.colors.navy + '22',
    marginVertical: 12,
  },
});

export async function buildKitPdf(kitName: string, artifacts: ArtifactRow[]): Promise<Buffer> {
  return await renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>CLARITY HUB</Text>
        <Text style={styles.title}>{kitName}</Text>
        {artifacts.map((a, i) => (
          <View key={i} style={styles.section} wrap={false}>
            <Text style={styles.h1}>{LABELS[a.artifact_type]}</Text>
            {renderArtifact(a)}
            <View style={styles.divider} />
          </View>
        ))}
      </Page>
    </Document>
  );
}

function renderArtifact(a: ArtifactRow): React.ReactNode {
  const c = a.content as any;
  if (a.artifact_type.startsWith('welcome_email_')) {
    return (
      <View>
        <Text style={styles.label}>SUBJECT</Text>
        <Text style={styles.bold}>{String(c.subject ?? '')}</Text>
        <Text style={styles.label}>BODY</Text>
        <Text>{String(c.body ?? '')}</Text>
      </View>
    );
  }
  if (a.artifact_type === 'intake_form') {
    const qs = (c.questions ?? []) as Array<{ question: string; purpose: string }>;
    return (
      <View>
        {c.intro && <Text style={{ marginBottom: 6 }}>{String(c.intro)}</Text>}
        {qs.map((q, i) => (
          <View key={i} style={{ marginBottom: 6 }}>
            <Text style={styles.bold}>{i + 1}. {q.question}</Text>
            <Text style={{ color: '#777' }}>{q.purpose}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (a.artifact_type === 'kickoff_checklist') {
    return (
      <View>
        <Text style={[styles.label, { marginTop: 0 }]}>YOUR TASKS</Text>
        {((c.founder_tasks ?? []) as string[]).map((t, i) => (
          <Text key={i} style={styles.bullet}>• {t}</Text>
        ))}
        <Text style={styles.label}>CLIENT TASKS</Text>
        {((c.client_tasks ?? []) as string[]).map((t, i) => (
          <Text key={i} style={styles.bullet}>• {t}</Text>
        ))}
      </View>
    );
  }
  if (a.artifact_type === 'onboarding_timeline') {
    const list = (Array.isArray(c) ? c : c.timeline ?? []) as Array<{
      milestone: string; when: string; detail: string;
    }>;
    return (
      <View>
        {list.map((m, i) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <Text>
              <Text style={[styles.bold, styles.clay]}>{m.when} — </Text>
              <Text style={styles.bold}>{m.milestone}</Text>
            </Text>
            <Text style={{ color: '#555' }}>{m.detail}</Text>
          </View>
        ))}
      </View>
    );
  }
  return <Text>{JSON.stringify(c)}</Text>;
}
