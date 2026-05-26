"use client";

import { AppFrame } from "@/components/AppFrame";
import { Button } from "@/components/ui/Button";
import { Checkbox, FieldGroup, Input, Label, Radio, Select, Textarea } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { useStore } from "@/lib/store";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Upload } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SupportArea, User } from "@/lib/types";

const STEP_TITLES_COMPANION = [
  "Your details",
  "Verification uploads",
  "Comfort areas",
  "Review",
];
const STEP_TITLES_REQUESTER = [
  "Your details",
  "Accessibility profile",
  "Trusted contact",
  "Review",
];

const SUPPORT_AREAS: { value: SupportArea; label: string; hint: string }[] = [
  { value: "wheelchair-assist", label: "Wheelchair / mobility assist", hint: "I'm confident pushing a chair, finding ramps, navigating gaps." },
  { value: "vision-guide", label: "Vision guide", hint: "I can describe surroundings and walk sighted-guide style." },
  { value: "hearing-support", label: "Hearing support", hint: "I face people when I speak, write things down, or sign." },
  { value: "anxiety-aware", label: "Anxiety-aware", hint: "I'm calm in crowds and can ask for what's needed." },
  { value: "cognitive-support", label: "Cognitive / communication support", hint: "I'll explain things plainly and check in often." },
  { value: "aac-comfortable", label: "Comfortable with AAC users", hint: "I'll wait while someone types and not finish their sentences." },
  { value: "first-aid", label: "First aid trained", hint: "Current CPR / first aid certificate." },
];

export default function OnboardingPage() {
  const params = useParams<{ role: string }>();
  const role = params.role === "companion" ? "companion" : "requester";
  const router = useRouter();
  const { upsertUser, setActiveUserId, pushToast } = useStore();
  const [step, setStep] = useState(0);

  // shared
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [bio, setBio] = useState("");

  // companion
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [comfort, setComfort] = useState<SupportArea[]>([]);

  // requester
  const [ndis, setNdis] = useState("");
  const [mobility, setMobility] = useState<"wheelchair" | "walking-aid" | "ambulant" | "none">("ambulant");
  const [sensory, setSensory] = useState<Set<"vision" | "hearing">>(new Set());
  const [cognitive, setCognitive] = useState("");
  const [anxiety, setAnxiety] = useState("");
  const [comms, setComms] = useState<"verbal" | "written" | "aac">("verbal");
  const [trustedName, setTrustedName] = useState("");
  const [trustedPhone, setTrustedPhone] = useState("");
  const [trustedRel, setTrustedRel] = useState("");

  const titles = role === "companion" ? STEP_TITLES_COMPANION : STEP_TITLES_REQUESTER;

  const canAdvance = useMemo(() => {
    if (step === 0) return name.trim().length > 1 && region.trim().length > 1;
    if (step === 1)
      return role === "companion" ? verified : true;
    if (step === 2) return role === "requester" ? trustedName.trim() && trustedPhone.trim() : true;
    return true;
  }, [step, name, region, verified, role, trustedName, trustedPhone]);

  function startVerification() {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);
      pushToast({ tone: "success", text: "Documents verified ✓ (demo)" });
    }, 2000);
  }

  function toggleArea(a: SupportArea) {
    setComfort((c) => (c.includes(a) ? c.filter((x) => x !== a) : [...c, a]));
  }

  function toggleSensory(s: "vision" | "hearing") {
    setSensory((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function finish() {
    const id = `${role[0]}_${Date.now()}`;
    const user: User = {
      id,
      role,
      name,
      photo: name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "U",
      bio: bio || (role === "companion" ? "Happy to share my journey." : "Looking for a friendly companion."),
      rating: 5,
      ratingCount: 0,
      region,
      verification: {
        wwcc: role === "companion" ? "verified" : "verified",
        wwdc: role === "companion" ? "verified" : "verified",
        photoId: "verified",
        drivers: role === "companion" ? "verified" : "verified",
      },
      comfortAreas: role === "companion" ? comfort : undefined,
      ndisNumber: role === "requester" ? ndis : undefined,
      accessibility:
        role === "requester"
          ? {
              mobility,
              sensory: Array.from(sensory).length ? (Array.from(sensory) as any) : ["none"],
              cognitiveSupport: cognitive,
              anxietyTriggers: anxiety,
              communicationStyle: comms,
            }
          : undefined,
      trustedContact:
        role === "requester"
          ? { name: trustedName, phone: trustedPhone, relationship: trustedRel }
          : undefined,
      joinedAt: new Date().toISOString().slice(0, 10),
    };
    upsertUser(user);
    setActiveUserId(id);
    pushToast({ tone: "success", text: `Welcome aboard, ${name.split(" ")[0]}!` });
    router.push("/home");
  }

  return (
    <AppFrame>
      <div className="flex items-center justify-between mb-4">
        <Badge tone="teal">
          Step {step + 1} of {titles.length}
        </Badge>
        <span className="text-xs text-ink/60 dark:text-teal-100/60">
          {role === "companion" ? "Companion sign-up" : "Requester sign-up"}
        </span>
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight">{titles[step]}</h1>

      <div className="mt-5">
        {step === 0 && (
          <>
            <FieldGroup>
              <Label htmlFor="name" required>
                Full name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Tran"
                autoComplete="name"
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="region" required hint="Helps us pre-fill route suggestions">
                Your suburb / region
              </Label>
              <Input
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Footscray"
                autoComplete="address-level2"
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="bio" hint="A friendly one-liner others will see">
                Short bio
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Nurse, dog person, quiet train type."
              />
            </FieldGroup>
          </>
        )}

        {step === 1 && role === "companion" && (
          <>
            <p className="text-ink/80 dark:text-teal-100/80">
              We need to verify your{" "}
              <Tooltip label="WWCC" text="Working With Children Check.">
                <span className="underline decoration-dotted">WWCC</span>
              </Tooltip>{" "}
              and{" "}
              <Tooltip label="WWDC" text="Working With Disability Check / NDIS Worker Screening.">
                <span className="underline decoration-dotted">WWDC</span>
              </Tooltip>
              , a photo ID, and (if you'll drive) your licence.
            </p>
            <Card className="mt-5">
              <div className="space-y-3">
                {["WWCC", "WWDC", "Photo ID", "Driver's licence"].map((doc) => (
                  <div
                    key={doc}
                    className="flex items-center gap-3 rounded-xl border-2 border-dashed border-ink/15 dark:border-white/15 p-3"
                  >
                    <Upload className="h-5 w-5 text-ink/60 dark:text-teal-100/60" aria-hidden />
                    <span className="flex-1 font-semibold">{doc}</span>
                    {verified ? (
                      <Badge tone="success">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Verified
                      </Badge>
                    ) : (
                      <Badge tone="amber">pending</Badge>
                    )}
                  </div>
                ))}
              </div>
              <Button
                onClick={startVerification}
                disabled={verifying || verified}
                block
                className="mt-4"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Verifying…
                  </>
                ) : verified ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> All verified
                  </>
                ) : (
                  "Upload & verify (demo)"
                )}
              </Button>
            </Card>
            <p className="mt-3 text-xs text-ink/60 dark:text-teal-100/60">
              In production we'd integrate with a real check provider — for this
              prototype we fake a 2-second check.
            </p>
          </>
        )}

        {step === 1 && role === "requester" && (
          <>
            <FieldGroup>
              <Label htmlFor="ndis" hint="Optional — we never share this with companions">
                <Tooltip
                  label="NDIS number"
                  text="National Disability Insurance Scheme participant number."
                >
                  <span className="underline decoration-dotted">NDIS number</span>
                </Tooltip>
              </Label>
              <Input
                id="ndis"
                value={ndis}
                onChange={(e) => setNdis(e.target.value)}
                placeholder="430 000 000"
                inputMode="numeric"
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="mobility">Mobility</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { v: "wheelchair", label: "Wheelchair user" },
                  { v: "walking-aid", label: "Use a walking aid" },
                  { v: "ambulant", label: "Ambulant" },
                  { v: "none", label: "Not relevant" },
                ].map((o) => (
                  <Radio
                    key={o.v}
                    name="mobility"
                    label={o.label}
                    checked={mobility === o.v}
                    onChange={() => setMobility(o.v as any)}
                  />
                ))}
              </div>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="sensory" hint="Tick any that apply">
                Sensory
              </Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Checkbox
                  id="sensory-vision"
                  label="Vision impairment"
                  checked={sensory.has("vision")}
                  onChange={() => toggleSensory("vision")}
                />
                <Checkbox
                  id="sensory-hearing"
                  label="Hearing impairment"
                  checked={sensory.has("hearing")}
                  onChange={() => toggleSensory("hearing")}
                />
              </div>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="comms">Communication preference</Label>
              <Select
                id="comms"
                value={comms}
                onChange={(e) => setComms(e.target.value as any)}
              >
                <option value="verbal">Verbal</option>
                <option value="written">Written / typed</option>
                <option value="aac">AAC device</option>
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="cognitive" hint="Anything that helps a companion support you well">
                Communication & cognitive support
              </Label>
              <Textarea
                id="cognitive"
                value={cognitive}
                onChange={(e) => setCognitive(e.target.value)}
                placeholder="e.g. I lipread — face me when you speak."
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="anxiety" hint="Things to avoid or be mindful of">
                Anxiety triggers
              </Label>
              <Textarea
                id="anxiety"
                value={anxiety}
                onChange={(e) => setAnxiety(e.target.value)}
                placeholder="e.g. Crowded escalators; sudden plan changes."
              />
            </FieldGroup>
          </>
        )}

        {step === 2 && role === "companion" && (
          <>
            <p className="text-ink/80 dark:text-teal-100/80">
              Pick the support areas you're confident assisting with. Match
              quality goes up when companions are honest about their comfort
              zone — there's no pressure to tick everything.
            </p>
            <div className="mt-4 grid gap-2">
              {SUPPORT_AREAS.map((a) => (
                <Checkbox
                  key={a.value}
                  id={`area-${a.value}`}
                  label={a.label}
                  hint={a.hint}
                  checked={comfort.includes(a.value)}
                  onChange={() => toggleArea(a.value)}
                />
              ))}
            </div>
          </>
        )}

        {step === 2 && role === "requester" && (
          <>
            <p className="text-ink/80 dark:text-teal-100/80">
              Pick one trusted contact who'll be notified by SMS when a trip starts.
              You can change this later.
            </p>
            <FieldGroup className="mt-4">
              <Label htmlFor="tc-name" required>Name</Label>
              <Input id="tc-name" value={trustedName} onChange={(e) => setTrustedName(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="tc-phone" required>Mobile</Label>
              <Input id="tc-phone" value={trustedPhone} onChange={(e) => setTrustedPhone(e.target.value)} placeholder="04XX XXX XXX" inputMode="tel" />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="tc-rel">Relationship</Label>
              <Input id="tc-rel" value={trustedRel} onChange={(e) => setTrustedRel(e.target.value)} placeholder="e.g. Sister" />
            </FieldGroup>
          </>
        )}

        {step === 3 && (
          <Card>
            <p className="font-bold text-lg">Ready to roll, {name.split(" ")[0] || "friend"}.</p>
            <p className="mt-2 text-ink/80 dark:text-teal-100/80">
              We'll save this profile locally for the demo. You can edit anything
              from your Profile page later.
            </p>
            {role === "requester" && (
              <p className="mt-3 text-sm text-ink/70 dark:text-teal-100/70 italic">
                Reminder: your accessibility profile drives matching. The
                better it reflects you, the better the matches.
              </p>
            )}
          </Card>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Button>
        )}
        {step < titles.length - 1 ? (
          <Button block onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}>
            Continue <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button block onClick={finish}>
            Open my home
          </Button>
        )}
      </div>
    </AppFrame>
  );
}
