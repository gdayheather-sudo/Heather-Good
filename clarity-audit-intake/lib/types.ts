export type SessionStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "processed"
  | "failed";

export type InputMethod = "voice" | "text";

export type DocType = "client_summary" | "internal_prep";

export interface IntakeSession {
  id: string;
  token: string;
  client_name: string | null;
  client_email: string | null;
  status: SessionStatus;
  payment_confirmed: boolean;
  audit_date: string | null;
  created_at: string;
  submitted_at: string | null;
  processed_at: string | null;
}

export interface IntakeResponse {
  id: string;
  session_id: string;
  question_id: string;
  input_method: InputMethod;
  raw_audio_url: string | null;
  transcript: string | null;
  word_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuditDocument {
  id: string;
  session_id: string;
  doc_type: DocType;
  content_markdown: string;
  generated_at: string;
}
