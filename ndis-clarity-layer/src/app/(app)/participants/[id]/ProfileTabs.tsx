"use client";

import { useState } from "react";
import clsx from "clsx";

interface QuickView {
  dateOfBirth: string | null;
  goals: { id: string; title: string; tags: string[] }[];
  communicationPreferences: string;
  knownRisks: string;
}

interface FullView {
  dateOfBirth: string | null;
  goals: {
    id: string;
    title: string;
    description: string | null;
    tags: string[];
    isActive: boolean;
  }[];
  supportContext: {
    communicationPreferences: string;
    routinesAndPreferences: string;
    keySupportStrategies: string;
  };
  riskSafety: { knownRisks: string; behaviouralSupportNotes: string };
  contacts: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
    isEmergency: boolean;
    isNominee: boolean;
  }[];
  medications: { name: string; notes: string }[];
  shareWithFamily: boolean;
  shareWithCoordinator: boolean;
  consentNotes: string;
}

export default function ProfileTabs({
  quick,
  full,
  fullAvailable,
}: {
  quick: QuickView;
  full: FullView | null;
  fullAvailable: boolean;
}) {
  const [tab, setTab] = useState<"quick" | "full">("quick");
  return (
    <div className="card">
      <div className="border-b border-ink-100 flex">
        <TabBtn active={tab === "quick"} onClick={() => setTab("quick")}>
          Quick view
        </TabBtn>
        {fullAvailable && (
          <TabBtn active={tab === "full"} onClick={() => setTab("full")}>
            Full profile
          </TabBtn>
        )}
      </div>
      <div className="p-5">
        {tab === "quick" && <Quick view={quick} />}
        {tab === "full" && full && <Full view={full} />}
      </div>
    </div>
  );
}

function TabBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-4 py-3 text-sm",
        active
          ? "text-brand-800 border-b-2 border-brand-600 font-medium"
          : "text-ink-600 hover:text-ink-800",
      )}
    >
      {children}
    </button>
  );
}

function Quick({ view }: { view: QuickView }) {
  return (
    <div className="space-y-4">
      <Row label="Date of birth">
        {view.dateOfBirth
          ? new Date(view.dateOfBirth).toLocaleDateString()
          : "—"}
      </Row>
      <Row label="Active goals">
        {view.goals.length === 0 ? (
          <span className="text-ink-500">None</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {view.goals.map((g) => (
              <span key={g.id} className="tag">
                {g.title}
              </span>
            ))}
          </div>
        )}
      </Row>
      <Row label="Communication preferences">
        {view.communicationPreferences || (
          <span className="text-ink-500">Not recorded</span>
        )}
      </Row>
      <Row label="Known risks">
        {view.knownRisks || <span className="text-ink-500">None recorded</span>}
      </Row>
    </div>
  );
}

function Full({ view }: { view: FullView }) {
  return (
    <div className="space-y-6">
      <Row label="Date of birth">
        {view.dateOfBirth
          ? new Date(view.dateOfBirth).toLocaleDateString()
          : "—"}
      </Row>

      <div>
        <SectionHead>Goals</SectionHead>
        {view.goals.length === 0 ? (
          <p className="text-ink-500 text-sm">None</p>
        ) : (
          <ul className="space-y-2">
            {view.goals.map((g) => (
              <li
                key={g.id}
                className="rounded-md border border-ink-100 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{g.title}</div>
                  {!g.isActive && <span className="tag-muted">archived</span>}
                </div>
                {g.description && (
                  <div className="text-sm text-ink-600 mt-1">
                    {g.description}
                  </div>
                )}
                {g.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {g.tags.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <SectionHead>Support context</SectionHead>
        <Row label="Communication preferences">
          {view.supportContext.communicationPreferences || "—"}
        </Row>
        <Row label="Routines and preferences">
          {view.supportContext.routinesAndPreferences || "—"}
        </Row>
        <Row label="Key support strategies">
          {view.supportContext.keySupportStrategies || "—"}
        </Row>
      </div>

      <div>
        <SectionHead>Risk and safety</SectionHead>
        <Row label="Known risks">{view.riskSafety.knownRisks || "—"}</Row>
        <Row label="Behavioural support notes">
          {view.riskSafety.behaviouralSupportNotes || "—"}
        </Row>
      </div>

      <div>
        <SectionHead>Contacts</SectionHead>
        {view.contacts.length === 0 ? (
          <p className="text-ink-500 text-sm">None</p>
        ) : (
          <ul className="space-y-2">
            {view.contacts.map((c, i) => (
              <li
                key={i}
                className="rounded-md border border-ink-100 px-3 py-2"
              >
                <div className="font-medium">
                  {c.name}
                  {c.relationship && (
                    <span className="text-ink-500 text-sm ml-2">
                      ({c.relationship})
                    </span>
                  )}
                </div>
                <div className="text-sm text-ink-600 flex flex-wrap gap-3 mt-1">
                  {c.phone && <span>{c.phone}</span>}
                  {c.email && <span>{c.email}</span>}
                  {c.isEmergency && <span className="tag-warn">Emergency</span>}
                  {c.isNominee && <span className="tag">Nominee</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <SectionHead>Medications (prompting/observing only)</SectionHead>
        {view.medications.length === 0 ? (
          <p className="text-ink-500 text-sm">None</p>
        ) : (
          <ul className="space-y-2">
            {view.medications.map((m, i) => (
              <li
                key={i}
                className="rounded-md border border-ink-100 px-3 py-2"
              >
                <div className="font-medium">{m.name}</div>
                {m.notes && (
                  <div className="text-sm text-ink-600 mt-1">{m.notes}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <SectionHead>Consent and sharing</SectionHead>
        <Row label="Share with family">
          {view.shareWithFamily ? "Yes" : "No"}
        </Row>
        <Row label="Share with coordinator">
          {view.shareWithCoordinator ? "Yes" : "No"}
        </Row>
        <Row label="Consent notes">{view.consentNotes || "—"}</Row>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="sm:col-span-2 text-sm text-ink-800 whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-semibold uppercase tracking-wide text-ink-500 mb-2">
      {children}
    </div>
  );
}
