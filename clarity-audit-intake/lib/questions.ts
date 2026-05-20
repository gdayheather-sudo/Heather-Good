import questionsData from "@/data/questions.json";

export interface IntakeQuestion {
  id: string;
  order: number;
  section: string;
  label: string;
  helper: string;
  voice_prompt: string;
  min_words: number;
  input_type: string;
}

export interface IntakeConfig {
  version: string;
  estimated_minutes: number;
  title: string;
  intro: string;
  questions: IntakeQuestion[];
}

export const intake: IntakeConfig = questionsData.intake;

export const questions: IntakeQuestion[] = [...intake.questions].sort(
  (a, b) => a.order - b.order
);

export function getQuestion(id: string): IntakeQuestion | undefined {
  return questions.find((q) => q.id === id);
}
