// Shared static data: exam list and language options
export const EXAMS = [
  "JEE",
  "NEET",
  "UPSC",
  "SSC",
  "GATE",
  "CAT",
  "NDA",
  "CDS",
  "Bank PO",
  "IBPS",
  "RRB",
  "CBSE Class 10",
  "CBSE Class 12",
  "ICSE",
  "State Board",
] as const;

export const SUBJECTS = [
  "Maths",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Polity",
  "English",
  "Reasoning",
  "GK",
] as const;

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "hinglish", label: "Hinglish" },
] as const;

export type LangValue = (typeof LANGUAGES)[number]["value"];
