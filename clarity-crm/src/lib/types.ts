// Domain types for Clarity CRM. Kept hand-written for Phase 1; can be replaced
// by `supabase gen types` output later without changing call sites.

export type Track = "linkedin_led" | "substack_article";

export type PostStatus = "idea" | "drafting" | "ready" | "scheduled" | "posted";

export type InterviewStatus = "in_progress" | "complete";

// Platforms are open-ended by design (new platforms add no schema migration).
export type Platform =
  | "linkedin"
  | "substack_note"
  | "substack_article"
  | "instagram"
  | (string & {});

export interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ContentUnit {
  id: string;
  user_id: string;
  track: Track;
  seed_text: string;
  topic_tags: string[];
  created_at: string;
  archived_at: string | null;
}

export interface Interview {
  id: string;
  content_unit_id: string;
  messages: InterviewMessage[];
  status: InterviewStatus;
  created_at: string;
}

export interface PlatformPost {
  id: string;
  content_unit_id: string;
  platform: Platform;
  body: string | null;
  hook_variants: string[];
  graphic_brief: string | null;
  status: PostStatus;
  scheduled_for: string | null;
  posted_at: string | null;
  posted_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CadenceSlot {
  id: string;
  user_id: string;
  platform: Platform;
  day_of_week: number; // 0 = Sunday
  time_of_day: string; // "HH:MM:SS"
  active: boolean;
}

// Which platforms each track produces.
export const TRACK_PLATFORMS: Record<Track, Platform[]> = {
  linkedin_led: ["linkedin", "substack_note", "instagram"],
  substack_article: ["substack_article"],
};

export const TRACK_LABELS: Record<Track, string> = {
  linkedin_led: "LinkedIn-led (industry / AI commentary)",
  substack_article: "Substack Article (AI how-to)",
};

export const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  substack_note: "Substack Note",
  substack_article: "Substack Article",
  instagram: "Instagram",
};

export const STATUS_LABELS: Record<PostStatus, string> = {
  idea: "Idea",
  drafting: "Drafting",
  ready: "Ready",
  scheduled: "Scheduled",
  posted: "Posted",
};
