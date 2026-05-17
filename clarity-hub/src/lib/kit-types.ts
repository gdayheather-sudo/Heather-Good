export type DeliveryModel =
  | 'one_to_one'
  | 'group'
  | 'project'
  | 'retainer'
  | 'productized';

export type BrandVoice = 'warm' | 'professional' | 'playful' | 'bold' | 'calm';

export interface KitInputs {
  business_name: string;
  service_description: string;
  delivery_model?: DeliveryModel | '';
  client_profile?: string;
  needs_from_client?: string;
  project_length?: string;
  brand_voice?: BrandVoice | '';
  tools_mentioned?: string;
}

export interface EmailArtifact {
  subject: string;
  body: string;
}

export interface IntakeQuestion {
  question: string;
  purpose: string;
}

export interface IntakeForm {
  intro: string;
  questions: IntakeQuestion[];
}

export interface KickoffChecklist {
  founder_tasks: string[];
  client_tasks: string[];
}

export interface TimelineMilestone {
  milestone: string;
  when: string;
  detail: string;
}

export interface GeneratedKit {
  welcome_email_1: EmailArtifact;
  welcome_email_2: EmailArtifact;
  welcome_email_3: EmailArtifact;
  welcome_email_4: EmailArtifact;
  intake_form: IntakeForm;
  kickoff_checklist: KickoffChecklist;
  onboarding_timeline: TimelineMilestone[];
}
