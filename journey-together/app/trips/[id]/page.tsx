"use client";

import { AppFrame } from "@/components/AppFrame";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { RouteDiagram } from "@/components/RouteDiagram";
import { StarPicker, StarRating } from "@/components/StarRating";
import { VerificationBadges } from "@/components/VerificationBadges";
import { QUICK_REPLIES, REVIEW_TAGS } from "@/lib/mockData";
import { routeKm } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { Booking } from "@/lib/types";
import { formatWhen, relativeTime } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Flag,
  Lock,
  Phone,
  Play,
  Send,
  Square,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const bookingId = sp.get("booking") ?? undefined;
  const router = useRouter();
  const {
    trips,
    users,
    bookings,
    messages,
    activeUser,
    addMessage,
    setBookingStatus,
    addRating,
    flagBooking,
    pushToast,
  } = useStore();

  const trip = trips.find((t) => t.id === id);
  const booking = useMemo<Booking | undefined>(
    () =>
      bookingId
        ? bookings.find((b) => b.id === bookingId)
        : bookings.find(
            (b) =>
              b.tripId === id &&
              (b.requesterId === activeUser.id || b.companionId === activeUser.id)
          ),
    [bookingId, bookings, id, activeUser.id]
  );

  const companion = trip ? users.find((u) => u.id === trip.companionId) : undefined;
  const requester = booking ? users.find((u) => u.id === booking.requesterId) : undefined;
  const other =
    activeUser.role === "companion" ? requester : companion;

  // Chat state
  const [draft, setDraft] = useState("");
  const chatRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Payment + SOS modals
  const [payOpen, setPayOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [paid, setPaid] = useState(booking?.paidHeldInEscrow ?? false);

  // Rating
  const [stars, setStars] = useState(5);
  const [tagSel, setTagSel] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  if (!trip) {
    return (
      <AppFrame>
        <Card>
          <p>That trip isn't in the system.</p>
          <Link href="/home"><Button block className="mt-3">Back home</Button></Link>
        </Card>
      </AppFrame>
    );
  }

  const km = routeKm(trip);
  const tripMessages = booking
    ? messages.filter((m) => m.bookingId === booking.id).sort((a, b) => a.at.localeCompare(b.at))
    : [];

  function send(body: string) {
    if (!booking || !body.trim()) return;
    addMessage({ bookingId: booking.id, fromId: activeUser.id, body });
    setDraft("");
    // Simulated reply for demo when both sides aren't actively typing.
    if (other) {
      setTimeout(() => {
        addMessage({
          bookingId: booking.id,
          fromId: other.id,
          body: pickReply(body),
        });
      }, 1400);
    }
  }

  function pickReply(input: string): string {
    if (/late/i.test(input)) return "All good — no rush.";
    if (/cancel/i.test(input)) return "That's okay. Hope to see you another time.";
    if (/here|arrived/i.test(input)) return "On my way, two minutes!";
    return "Sounds good 👍";
  }

  function approve() {
    if (!booking) return;
    setBookingStatus(booking.id, "confirmed");
    pushToast({ tone: "success", text: "Booking confirmed." });
  }
  function decline() {
    if (!booking) return;
    setBookingStatus(booking.id, "cancelled");
    pushToast({ tone: "info", text: "Booking declined." });
  }
  function start() {
    if (!booking || !requester) return;
    setBookingStatus(booking.id, "in-progress");
    const tc = requester.trustedContact;
    pushToast({
      tone: "info",
      text: tc
        ? `Demo: SMS sent to ${tc.name} (${tc.relationship}) — ${requester.name.split(" ")[0]}'s trip has started.`
        : `Demo: trusted contact would be SMSed now.`,
    });
  }
  function end() {
    if (!booking) return;
    setBookingStatus(booking.id, "completed");
    pushToast({ tone: "success", text: "Trip completed. Funds released from escrow." });
  }

  function submitRating() {
    if (!booking) return;
    addRating(booking.id, {
      by: activeUser.id,
      stars,
      comment: comment.trim() || undefined,
      tags: tagSel,
      at: new Date().toISOString(),
    });
    setComment("");
    setStars(5);
    setTagSel([]);
    pushToast({ tone: "success", text: "Thanks for the feedback." });
  }

  function flag() {
    if (!booking) return;
    const reason = prompt("What concerned you? (visible to admin only)");
    if (!reason) return;
    flagBooking(booking.id, reason);
    pushToast({ tone: "warn", text: "Reported. Admin will review." });
  }

  const isCompanion = activeUser.role === "companion" && companion?.id === activeUser.id;
  const isRequester = activeUser.role === "requester" && booking && booking.requesterId === activeUser.id;
  const alreadyRated = booking?.ratings.some((r) => r.by === activeUser.id);

  return (
    <AppFrame>
      <Link href="/home" className="text-sm font-semibold text-teal-600 dark:text-amber-300">
        ← Back
      </Link>

      <Card className="mt-3">
        <div className="flex items-start gap-3">
          {companion && <Avatar seed={companion.id} label={companion.name} size={56} />}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-lg">{companion?.name}</span>
              {companion && <StarRating value={companion.rating} count={companion.ratingCount} />}
            </div>
            <p className="text-sm text-ink/70 dark:text-teal-100/70 mt-0.5">
              {companion?.bio}
            </p>
          </div>
          {booking && <Badge tone="teal">{booking.status}</Badge>}
        </div>

        <div className="mt-3">{companion && <VerificationBadges user={companion} />}</div>

        <div className="mt-4">
          <RouteDiagram start={trip.start} end={trip.end} mode={trip.mode} km={km} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-ink/50 dark:text-teal-100/50 font-bold">
              Departs
            </div>
            <div className="font-bold mt-0.5">{formatWhen(trip.departAt)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-ink/50 dark:text-teal-100/50 font-bold">
              Thank-you fee
            </div>
            <div className="font-bold mt-0.5">${trip.fee}</div>
          </div>
        </div>

        {trip.notes && (
          <p className="mt-3 text-sm italic text-ink/80 dark:text-teal-100/80">
            “{trip.notes}”
          </p>
        )}
      </Card>

      {/* Booking lifecycle controls */}
      {booking && (
        <section className="mt-4 space-y-3">
          {isCompanion && booking.status === "pending" && (
            <Card>
              <p className="font-bold">A request is waiting on you.</p>
              <p className="text-sm text-ink/70 dark:text-teal-100/70 mt-1">
                {requester?.name} would like to join this trip.
              </p>
              <div className="mt-3 flex gap-2">
                <Button onClick={approve} block>Approve</Button>
                <Button variant="outline" onClick={decline}>Decline</Button>
              </div>
            </Card>
          )}

          {booking.status === "confirmed" && !paid && isRequester && (
            <Card className="border-amber-300/50">
              <div className="flex items-start gap-3">
                <CreditCard className="h-6 w-6 text-amber-500" aria-hidden />
                <div className="flex-1">
                  <p className="font-bold">Confirm payment to lock in</p>
                  <p className="text-sm text-ink/70 dark:text-teal-100/70 mt-1">
                    Held in escrow. Released when the trip is completed.
                  </p>
                </div>
              </div>
              <Button block className="mt-3" onClick={() => setPayOpen(true)}>
                Pay ${trip.fee}
              </Button>
            </Card>
          )}

          {booking.status === "confirmed" && paid && (
            <Card className="bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300/40">
              <div className="flex items-center gap-2 font-semibold">
                <Lock className="h-4 w-4" aria-hidden /> ${trip.fee} held in escrow
              </div>
              <p className="text-sm mt-1 text-ink/70 dark:text-teal-100/70">
                Funds release when {isCompanion ? "the requester confirms completion" : "you complete the trip"}.
              </p>
            </Card>
          )}

          {isCompanion && booking.status === "confirmed" && paid && (
            <Button block size="lg" onClick={start}>
              <Play className="h-5 w-5" aria-hidden /> Start trip
            </Button>
          )}

          {booking.status === "in-progress" && (
            <>
              <Card className="bg-amber-50 dark:bg-amber-500/10 border-amber-300/50">
                <p className="font-bold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-coral animate-pulse" aria-hidden /> Trip in progress
                </p>
                <p className="text-sm text-ink/70 dark:text-teal-100/70 mt-1">
                  {isRequester
                    ? "Your trusted contact has been notified."
                    : "Trusted contact notified by SMS."}
                </p>
              </Card>
              <Button variant="danger" block onClick={() => setSosOpen(true)}>
                <AlertTriangle className="h-5 w-5" aria-hidden /> SOS — get help now
              </Button>
              {isCompanion && (
                <Button variant="outline" block onClick={end}>
                  <Square className="h-5 w-5" aria-hidden /> End trip
                </Button>
              )}
            </>
          )}

          {booking.status === "completed" && !alreadyRated && (
            <Card>
              <p className="font-bold">How was your journey?</p>
              <p className="text-sm text-ink/70 dark:text-teal-100/70 mt-1">
                Both parties rate each other. Reviews are public on profiles.
              </p>
              <div className="mt-3">
                <StarPicker value={stars} onChange={setStars} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {REVIEW_TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setTagSel((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
                    }
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 ${
                      tagSel.includes(t)
                        ? "bg-teal-500 text-white border-teal-500"
                        : "bg-white dark:bg-ink-soft border-ink/10 dark:border-white/10"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Input
                className="mt-3"
                placeholder="Optional comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button block onClick={submitRating} className="mt-3">
                Submit rating
              </Button>
            </Card>
          )}

          {alreadyRated && (
            <Card className="bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300/40">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" aria-hidden /> Thanks for rating
              </p>
            </Card>
          )}

          {booking.ratings.length > 0 && (
            <Card>
              <p className="font-bold mb-2">Ratings</p>
              <ul className="space-y-2">
                {booking.ratings.map((r, i) => {
                  const rater = users.find((u) => u.id === r.by);
                  return (
                    <li key={i} className="border-l-4 border-teal-500 pl-3">
                      <div className="flex items-center gap-2 text-sm">
                        <strong>{rater?.name.split(" ")[0]}</strong>
                        <StarRating value={r.stars} />
                      </div>
                      {r.comment && <p className="text-sm italic mt-1">“{r.comment}”</p>}
                      {r.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.tags.map((t) => (
                            <Badge key={t} tone="neutral">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {booking.status !== "completed" &&
            booking.status !== "rated" &&
            booking.status !== "cancelled" && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm("Cancel this booking? The other person was counting on it.")) {
                    setBookingStatus(booking.id, "cancelled");
                    pushToast({ tone: "info", text: "Booking cancelled. We've let them know." });
                  }
                }}
              >
                <XCircle className="h-4 w-4" aria-hidden /> Cancel booking
              </Button>
            )}

          {/* Flag concern */}
          {(booking.status === "in-progress" ||
            booking.status === "completed" ||
            booking.status === "rated") && (
            <button
              type="button"
              className="text-xs text-coral underline inline-flex items-center gap-1"
              onClick={flag}
            >
              <Flag className="h-3 w-3" aria-hidden /> Report a concern
            </button>
          )}
        </section>
      )}

      {!booking && activeUser.role === "requester" && (
        <Card className="mt-4">
          <p>Want to join this trip?</p>
          <Link href="/trips/request">
            <Button block className="mt-3">Search for matches</Button>
          </Link>
        </Card>
      )}

      {/* Messaging — only for the two parties */}
      {booking && other && (
        <section className="mt-5">
          <h2 className="font-bold text-lg mb-2">Messages</h2>
          <Card className="p-0 overflow-hidden">
            <div
              ref={chatRef}
              className="max-h-72 overflow-y-auto px-4 py-3 bg-[#FAFBFC] dark:bg-ink space-y-2"
            >
              {tripMessages.length === 0 && (
                <p className="text-sm text-ink/60 dark:text-teal-100/60">
                  No messages yet. Say hello — even a quick “see you there”.
                </p>
              )}
              {tripMessages.map((m) => {
                const mine = m.fromId === activeUser.id;
                return (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "ml-auto bg-teal-500 text-white"
                        : "bg-white dark:bg-ink-soft border border-ink/10 dark:border-white/10"
                    }`}
                  >
                    {m.body}
                    <div className={`text-[10px] mt-0.5 ${mine ? "text-teal-50/80" : "text-ink/50 dark:text-teal-100/50"}`}>
                      {relativeTime(m.at)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-3 py-2 border-t border-ink/10 dark:border-white/10 flex flex-wrap gap-2 bg-white dark:bg-ink-soft">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="text-xs font-semibold rounded-full bg-teal-50 dark:bg-teal-800/40 text-teal-700 dark:text-teal-100 px-3 py-1.5"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="flex gap-2 p-3 border-t border-ink/10 dark:border-white/10 bg-white dark:bg-ink-soft"
            >
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message…"
                aria-label="Message"
              />
              <Button type="submit" aria-label="Send message">
                <Send className="h-4 w-4" aria-hidden />
              </Button>
            </form>
          </Card>
        </section>
      )}

      {/* Pay modal */}
      {payOpen && (
        <Modal onClose={() => setPayOpen(false)} title="Confirm payment">
          <p className="text-sm text-ink/80 dark:text-teal-100/80">
            ${trip.fee} will be held in escrow and released when the trip completes.
          </p>
          <Card className="mt-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink/50 dark:text-teal-100/50">
              Card on file (demo)
            </p>
            <p className="mt-1 font-mono">•••• •••• •••• 4242</p>
          </Card>
          <Button
            block
            className="mt-4"
            onClick={() => {
              setPayOpen(false);
              setPaid(true);
              pushToast({ tone: "success", text: "Payment held in escrow ✓" });
            }}
          >
            Pay ${trip.fee}
          </Button>
        </Modal>
      )}

      {/* SOS modal */}
      {sosOpen && (
        <Modal onClose={() => setSosOpen(false)} title="Need help right now?">
          <p className="text-sm text-ink/80 dark:text-teal-100/80">
            Stay with people. We've notified your trusted contact again.
          </p>
          <a
            href="tel:000"
            className="mt-4 inline-flex items-center justify-center w-full h-14 rounded-xl bg-coral text-white font-extrabold text-lg gap-2"
          >
            <Phone className="h-5 w-5" aria-hidden /> Call 000
          </a>
          {requester?.trustedContact && (
            <Card className="mt-3">
              <p className="font-bold">Trusted contact</p>
              <p>{requester.trustedContact.name} ({requester.trustedContact.relationship})</p>
              <a
                href={`tel:${requester.trustedContact.phone.replace(/\s/g, "")}`}
                className="mt-2 inline-flex items-center gap-1 text-teal-600 font-semibold"
              >
                <Phone className="h-4 w-4" aria-hidden /> {requester.trustedContact.phone}
              </a>
            </Card>
          )}
        </Modal>
      )}
    </AppFrame>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-ink-soft rounded-3xl p-5 w-full max-w-md shadow-card"
      >
        <h3 id="modal-title" className="text-xl font-extrabold">{title}</h3>
        <div className="mt-3">{children}</div>
        <Button variant="ghost" onClick={onClose} block className="mt-3">
          Close
        </Button>
      </div>
    </div>
  );
}
