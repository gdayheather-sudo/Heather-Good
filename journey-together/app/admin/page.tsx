"use client";

import { AdminFrame } from "@/components/AppFrame";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { StarRating } from "@/components/StarRating";
import { VerificationBadges } from "@/components/VerificationBadges";
import { useStore } from "@/lib/store";
import { formatWhen } from "@/lib/utils";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertOctagon,
  CheckCheck,
  ClipboardList,
  Flag,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

const TABS = [
  { id: "verifications", label: "Pending verifications", icon: ClipboardList },
  { id: "users", label: "Active users", icon: Users },
  { id: "reports", label: "Reported issues", icon: Flag },
  { id: "trips", label: "Trip activity", icon: Activity },
  { id: "metrics", label: "Metrics", icon: ShieldCheck },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AdminPage() {
  const { users, trips, bookings, resetData, activeUser, approveVerification, pushToast } = useStore();
  const [tab, setTab] = useState<TabId>("verifications");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "companion" | "requester">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "pending">("all");

  const flaggedBookings = bookings.filter((b) => b.flagged);
  const pendingVerifications = users.filter((u) =>
    Object.values(u.verification).some((v) => v === "pending")
  );

  const filteredUsers = useMemo(
    () =>
      users
        .filter((u) => u.role !== "admin")
        .filter((u) => (roleFilter === "all" ? true : u.role === roleFilter))
        .filter((u) => {
          if (statusFilter === "all") return true;
          const anyPending = Object.values(u.verification).some(
            (v) => v === "pending"
          );
          return statusFilter === "pending" ? anyPending : !anyPending;
        })
        .filter((u) =>
          (u.name + " " + u.region).toLowerCase().includes(search.toLowerCase())
        ),
    [users, roleFilter, statusFilter, search]
  );

  const completed = bookings.filter((b) =>
    ["completed", "rated"].includes(b.status)
  );
  const inProgress = bookings.filter((b) => b.status === "in-progress");
  const upcoming = bookings.filter((b) => b.status === "confirmed");

  const avgRating =
    users
      .filter((u) => u.role !== "admin" && u.ratingCount > 0)
      .reduce((acc, u) => acc + u.rating, 0) /
      Math.max(1, users.filter((u) => u.role !== "admin" && u.ratingCount > 0).length);

  if (activeUser.role !== "admin") {
    return (
      <AdminFrame>
        <Card>
          <p className="font-bold">Admin only.</p>
          <p className="text-sm text-ink/70 dark:text-teal-100/70 mt-1">
            Switch to “Toni Alvarez (Admin)” using the picker in the header.
          </p>
        </Card>
      </AdminFrame>
    );
  }

  return (
    <AdminFrame>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Trust & safety</h1>
          <p className="text-ink/70 dark:text-teal-100/70 mt-1">
            Verify documents, keep the community safe, watch the platform breathe.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (confirm("Wipe demo data and reseed?")) resetData();
          }}
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Reset demo data
        </Button>
      </div>

      {/* Metrics tiles always-visible */}
      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-5">
        <MetricTile label="Total users" value={users.filter((u) => u.role !== "admin").length} />
        <MetricTile label="Active this week" value={upcoming.length + inProgress.length} tone="teal" />
        <MetricTile label="Completed trips" value={completed.length} tone="success" />
        <MetricTile
          label="Average rating"
          value={isFinite(avgRating) ? avgRating.toFixed(1) : "—"}
          tone="amber"
        />
        <MetricTile
          label="Flagged trips"
          value={flaggedBookings.length}
          tone={flaggedBookings.length ? "coral" : "neutral"}
        />
      </div>

      <nav className="mt-8 border-b border-ink/10 dark:border-white/10 flex flex-wrap gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 ${
              tab === id
                ? "border-teal-500 text-teal-600 dark:text-amber-300"
                : "border-transparent text-ink/60 dark:text-teal-100/60 hover:text-ink dark:hover:text-teal-50"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
            {id === "verifications" && pendingVerifications.length > 0 && (
              <Badge tone="amber">{pendingVerifications.length}</Badge>
            )}
            {id === "reports" && flaggedBookings.length > 0 && (
              <Badge tone="coral">{flaggedBookings.length}</Badge>
            )}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "verifications" && (
          <div className="grid lg:grid-cols-2 gap-4">
            {pendingVerifications.length === 0 && (
              <Card className="lg:col-span-2">
                <p className="font-semibold">No pending verifications. Nice clear inbox.</p>
              </Card>
            )}
            {pendingVerifications.map((u) => {
              const pendingKeys = Object.entries(u.verification)
                .filter(([, v]) => v === "pending")
                .map(([k]) => k as keyof typeof u.verification);
              return (
                <Card key={u.id}>
                  <div className="flex items-start gap-3">
                    <Avatar seed={u.id} label={u.name} size={48} />
                    <div className="flex-1">
                      <p className="font-bold">{u.name}</p>
                      <p className="text-sm text-ink/60 dark:text-teal-100/60">
                        {u.role} · {u.region} · joined {u.joinedAt}
                      </p>
                      <div className="mt-2"><VerificationBadges user={u} /></div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {pendingKeys.map((key) => (
                      <div key={key} className="rounded-xl bg-ink/5 dark:bg-white/5 p-3 text-center text-xs font-bold uppercase">
                        <div className="h-20 mb-2 rounded-lg bg-gradient-to-br from-teal-100 to-amber-100 dark:from-teal-800/40 dark:to-amber-500/30 flex items-center justify-center text-ink/40">
                          [{key} preview]
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              approveVerification(u.id, key, "verified");
                              pushToast({ tone: "success", text: `${u.name}: ${key} approved.` });
                            }}
                            className="flex-1 rounded-lg bg-emerald-600 text-white py-1.5"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const reason = prompt("Reason for rejection (optional)") ?? "";
                              approveVerification(u.id, key, "rejected");
                              pushToast({
                                tone: "warn",
                                text: `${u.name}: ${key} rejected${reason ? " — " + reason : ""}.`,
                              });
                            }}
                            className="flex-1 rounded-lg bg-coral text-white py-1.5"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {tab === "users" && (
          <Card>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Search name or region…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}>
                <option value="all">All roles</option>
                <option value="companion">Companions</option>
                <option value="requester">Requesters</option>
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="all">All statuses</option>
                <option value="verified">Fully verified</option>
                <option value="pending">Anything pending</option>
              </Select>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-ink/10 dark:border-white/10">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Region</th>
                    <th className="py-2 pr-4">Rating</th>
                    <th className="py-2 pr-4">Verification</th>
                    <th className="py-2 pr-4">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-ink/5 dark:border-white/5">
                      <td className="py-2 pr-4 flex items-center gap-2 font-semibold">
                        <Avatar seed={u.id} label={u.name} size={28} /> {u.name}
                      </td>
                      <td className="py-2 pr-4 capitalize">{u.role}</td>
                      <td className="py-2 pr-4">{u.region}</td>
                      <td className="py-2 pr-4">
                        <StarRating value={u.rating} count={u.ratingCount} />
                      </td>
                      <td className="py-2 pr-4">
                        {Object.values(u.verification).every((v) => v === "verified") ? (
                          <Badge tone="success">
                            <CheckCheck className="h-3 w-3" aria-hidden /> Full
                          </Badge>
                        ) : (
                          <Badge tone="amber">Pending</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-ink/60 dark:text-teal-100/60">{u.joinedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === "reports" && (
          <div className="grid lg:grid-cols-2 gap-4">
            {flaggedBookings.length === 0 && (
              <Card className="lg:col-span-2">
                <p className="font-semibold">No issues reported. Lovely.</p>
              </Card>
            )}
            {flaggedBookings.map((b) => {
              const trip = trips.find((t) => t.id === b.tripId);
              const r = users.find((u) => u.id === b.requesterId);
              const c = users.find((u) => u.id === b.companionId);
              return (
                <Card key={b.id}>
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="h-5 w-5 text-coral" aria-hidden />
                    <p className="font-bold">Flagged by {b.flagged?.by === r?.id ? r?.name : c?.name}</p>
                  </div>
                  <p className="mt-2 text-sm italic">“{b.flagged?.reason}”</p>
                  <p className="mt-2 text-xs text-ink/60 dark:text-teal-100/60">
                    {trip ? `${trip.start.label} → ${trip.end.label}` : "Trip details missing"}
                  </p>
                </Card>
              );
            })}
          </div>
        )}

        {tab === "trips" && (
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-ink/10 dark:border-white/10">
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Companion</th>
                  <th className="py-2 pr-4">Requester</th>
                  <th className="py-2 pr-4">Route</th>
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Match</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const t = trips.find((t) => t.id === b.tripId);
                  const c = users.find((u) => u.id === b.companionId);
                  const r = users.find((u) => u.id === b.requesterId);
                  return (
                    <tr key={b.id} className="border-b border-ink/5 dark:border-white/5">
                      <td className="py-2 pr-4">
                        <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                      </td>
                      <td className="py-2 pr-4">{c?.name}</td>
                      <td className="py-2 pr-4">{r?.name}</td>
                      <td className="py-2 pr-4">
                        {t ? `${t.start.label} → ${t.end.label}` : "—"}
                      </td>
                      <td className="py-2 pr-4">{t ? formatWhen(t.departAt) : "—"}</td>
                      <td className="py-2 pr-4 font-bold">{b.matchScore}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        {tab === "metrics" && (
          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <p className="font-bold">By transport mode</p>
              <ul className="mt-3 space-y-1 text-sm">
                {["train", "tram", "bus", "car", "walking"].map((m) => {
                  const count = trips.filter((t) => t.mode === m).length;
                  return (
                    <li key={m} className="flex justify-between">
                      <span className="capitalize">{m}</span>
                      <span className="font-bold">{count}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card>
              <p className="font-bold">By region</p>
              <ul className="mt-3 space-y-1 text-sm">
                {Array.from(new Set(users.map((u) => u.region)))
                  .filter((r) => r !== "HQ")
                  .map((r) => (
                    <li key={r} className="flex justify-between">
                      <span>{r}</span>
                      <span className="font-bold">
                        {users.filter((u) => u.region === r).length}
                      </span>
                    </li>
                  ))}
              </ul>
            </Card>
            <Card>
              <p className="font-bold">Rating distribution</p>
              <ul className="mt-3 space-y-1 text-sm">
                {[5, 4, 3, 2, 1].map((s) => {
                  const ratings = bookings.flatMap((b) => b.ratings);
                  const count = ratings.filter((r) => Math.round(r.stars) === s).length;
                  return (
                    <li key={s} className="flex items-center gap-2">
                      <span className="w-6 font-bold">{s}★</span>
                      <span className="flex-1 h-2 rounded-full bg-ink/10 dark:bg-white/10 overflow-hidden">
                        <span
                          className="block h-full bg-amber-400"
                          style={{
                            width: `${Math.min(
                              100,
                              (count / Math.max(1, ratings.length)) * 100
                            )}%`,
                          }}
                        />
                      </span>
                      <span className="w-6 text-right text-ink/60 dark:text-teal-100/60">
                        {count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </AdminFrame>
  );
}

function MetricTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "teal" | "amber" | "coral" | "success";
}) {
  const bg: Record<string, string> = {
    neutral: "bg-white dark:bg-ink-soft",
    teal: "bg-teal-500 text-white",
    amber: "bg-amber-400 text-ink",
    coral: "bg-coral text-white",
    success: "bg-emerald-600 text-white",
  };
  return (
    <div className={`rounded-2xl shadow-card p-4 ${bg[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-3xl font-extrabold mt-1">{value}</p>
    </div>
  );
}

function statusTone(s: string): "teal" | "amber" | "success" | "neutral" | "coral" {
  if (s === "confirmed") return "teal";
  if (s === "in-progress") return "amber";
  if (s === "completed" || s === "rated") return "success";
  if (s === "cancelled") return "coral";
  return "neutral";
}
