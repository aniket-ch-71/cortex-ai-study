// Centralized deep-link builders for coaching CTAs.
// Every analytics insight should turn into one of these actions.

export type PracticeMode = "practice" | "revision" | "drill" | "smart";

export function practiceLink(opts: {
  subject?: string;
  topic?: string;
  count?: number;
  mode?: PracticeMode;
  difficulty?: string;
}): { to: "/mock-test"; search: Record<string, string> } {
  const search: Record<string, string> = {};
  if (opts.subject) search.subject = opts.subject;
  if (opts.topic) search.topic = opts.topic;
  if (opts.count) search.count = String(opts.count);
  if (opts.mode) search.mode = opts.mode;
  if (opts.difficulty) search.difficulty = opts.difficulty;
  search.autostart = "1";
  return { to: "/mock-test", search };
}

export function smartPracticeLink() {
  return practiceLink({ mode: "smart", count: 10 });
}

export function revisionDrillLink(subject: string, topic: string) {
  return practiceLink({ subject, topic, count: 5, mode: "revision" });
}

export function weakTopicLink(subject: string, topic: string) {
  return practiceLink({ subject, topic, count: 10, mode: "practice" });
}
